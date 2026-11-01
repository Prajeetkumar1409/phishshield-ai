import config from '../config/index.js';
import { analyzeAttachment } from '../engines/malware/staticAnalyzer.js';
import { virusTotal } from '../services/virustotal.service.js';
import { domainInfo, ipInfo } from '../services/intel.service.js';
import { assistant } from '../services/assistant.service.js';

/** Fold VirusTotal's multi-engine verdict into the static result: known malware outranks heuristics. */
function withReputation(result, vt) {
  const out = { ...result, virustotal: vt };
  if (vt.status !== 'ok') return out;
  if (vt.malicious >= 3) {
    out.findings = [{ severity: 'critical', title: `Known malware: ${vt.malicious}/${vt.total} antivirus engines`, detail: vt.label ? `Detected as ${vt.label}.` : 'Flagged by VirusTotal engines.' }, ...out.findings];
    out.score = Math.max(out.score ?? 0, 95);
    out.verdict = 'malicious';
  } else if (vt.malicious + vt.suspicious >= 1) {
    out.findings = [{ severity: 'high', title: `Flagged by ${vt.malicious + vt.suspicious} antivirus engine(s)`, detail: 'A minority of VirusTotal engines flag this file.' }, ...out.findings];
    out.score = Math.max(out.score ?? 0, 60);
    if (out.verdict !== 'malicious') out.verdict = 'suspicious';
  }
  return out;
}

export async function scanAttachment(req, res) {
  const { name, data, sha256 } = req.validated;
  if (!data) {
    // Too large to upload: reputation by hash only
    const vt = await virusTotal.file(sha256.toLowerCase());
    return res.json(withReputation({ name, sha256: sha256.toLowerCase(), size: null, analysed: false, findings: [], urls: [], innerFiles: [], score: null, verdict: 'unknown' }, vt));
  }
  const buf = Buffer.from(data, 'base64');
  if (buf.length > config.maxAttachmentBytes) return res.status(413).json({ error: 'PayloadTooLarge', message: 'Attachment too large; send its sha256 instead' });
  const result = analyzeAttachment({ name, data: buf });
  res.json(withReputation({ ...result, analysed: true }, await virusTotal.file(result.sha256)));
}

export async function lookupIntel(req, res) {
  const { ip, domains, urls } = req.validated;
  const uniq = [...new Set(domains.map((d) => d.toLowerCase()))];
  const [ipRes, domRes, ipRep, urlRep] = await Promise.all([
    ip ? ipInfo(ip) : null,
    Promise.all(uniq.map(domainInfo)),
    ip ? virusTotal.ip(ip) : null,
    Promise.all(urls.slice(0, 2).map(async (u) => [u, await virusTotal.url(u)])),
  ]);
  res.json({
    ip: ipRes ? { ...ipRes, reputation: ipRep } : null,
    domains: Object.fromEntries(uniq.map((d, i) => [d, domRes[i]])),
    urls: Object.fromEntries(urlRep),
  });
}

export async function askAssistant(req, res) {
  const { text, model } = await assistant.ask(req.validated);
  res.json({ answer: text, model });
}

export function capabilities(req, res) {
  res.json({ assistant: assistant.configured, virustotal: virusTotal.configured, maxAttachmentBytes: config.maxAttachmentBytes });
}
