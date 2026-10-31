import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

process.env.NODE_ENV = 'test';
process.env.STORAGE_FILE = path.join(os.tmpdir(), `phishshield-test-${process.pid}.json`);
process.env.CLIENT_DIST = path.join(os.tmpdir(), 'phishshield-no-client');

const { createApp } = await import('../src/app.js');
let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => server.close());

const post = (body) => fetch(`${base}/analyze`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('GET /health', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('POST /analyze validates input', async () => {
  const res = await post({ type: 'fax', content: 'x' });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'ValidationError');
});

test('POST /analyze -> history -> stats round trip', async () => {
  const res = await post({ type: 'sms', content: 'URGENT: your account is blocked. Verify at http://sbi-kyc-update.online/kyc' });
  assert.equal(res.status, 201);
  const scan = await res.json();
  assert.equal(scan.verdict, 'phishing');

  const detail = await fetch(`${base}/history/${scan.id}`);
  assert.equal(detail.status, 200);

  const list = await (await fetch(`${base}/history?limit=5`)).json();
  assert.ok(list.items.some((s) => s.id === scan.id));

  const stats = await (await fetch(`${base}/stats`)).json();
  assert.ok(stats.total >= 1);
  assert.equal(stats.timeline.length, 14);
});

test('POST /analyze returns 422 for url scan without a URL', async () => {
  const res = await post({ type: 'url', content: 'not a link' });
  assert.equal(res.status, 422);
});

test('unknown API route returns JSON 404', async () => {
  const res = await fetch(`${base}/nope`);
  assert.equal(res.status, 404);
});
