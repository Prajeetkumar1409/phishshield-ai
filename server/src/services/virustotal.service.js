import config from '../config/index.js';

/**
 * VirusTotal v3 reputation lookups (files by hash, URLs, IPs, domains).
 * Only hashes/URLs/IPs leave the server, never file contents.
 * The free API allows 4 requests/minute, so calls are budgeted and cached;
 * when the budget is spent the caller gets status "rate_limited" instead of an error.
 */

const API = 'https://www.virustotal.com/api/v3';
const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map();
const recent = [];

function underBudget() {
  const now = Date.now();
  while (recent.length && now - recent[0] > 60_000) recent.shift();
  if (recent.length >= config.virustotal.perMinute) return false;
  recent.push(now);
  return true;
}

async function vtGet(path) {
  if (!config.virustotal.apiKey) return { status: 'not_configured' };
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value;
  if (!underBudget()) return { status: 'rate_limited' };

  let value;
  try {
    const res = await fetch(API + path, { headers: { 'x-apikey': config.virustotal.apiKey }, signal: AbortSignal.timeout(10_000) });
    if (res.status === 404) value = { status: 'not_found' };
    else if (res.status === 429) value = { status: 'rate_limited' };
    else if (res.status === 401 || res.status === 403) value = { status: 'error', message: 'VirusTotal rejected the API key' };
    else if (!res.ok) value = { status: 'error', message: `VirusTotal HTTP ${res.status}` };
    else value = { status: 'ok', data: (await res.json()).data };
  } catch (e) {
    return { status: 'error', message: e.name === 'TimeoutError' ? 'VirusTotal timed out' : e.message };
  }
  if (value.status === 'ok' || value.status === 'not_found') cache.set(path, { at: Date.now(), value });
  return value;
}

function stats(attr = {}) {
  const s = attr.last_analysis_stats || {};
  const total = Object.values(s).reduce((a, n) => a + (Number(n) || 0), 0);
  return { malicious: s.malicious || 0, suspicious: s.suspicious || 0, harmless: s.harmless || 0, undetected: s.undetected || 0, total };
}

const shape = (r, extra) => (r.status === 'ok' ? { status: 'ok', ...stats(r.data.attributes), ...extra(r.data.attributes || {}) } : r);

export const virusTotal = {
  get configured() {
    return Boolean(config.virustotal.apiKey);
  },

  async file(sha256) {
    const r = await vtGet(`/files/${sha256}`);
    return shape(r, (a) => ({
      label: a.popular_threat_classification?.suggested_threat_label || null,
      name: a.meaningful_name || null,
      firstSeen: a.first_submission_date ? new Date(a.first_submission_date * 1000).toISOString() : null,
      link: `https://www.virustotal.com/gui/file/${sha256}`,
    }));
  },

  async url(url) {
    const id = Buffer.from(url).toString('base64url');
    const r = await vtGet(`/urls/${id}`);
    return shape(r, (a) => ({
      categories: [...new Set(Object.values(a.categories || {}))].slice(0, 4),
      finalUrl: a.last_final_url || null,
      link: `https://www.virustotal.com/gui/url/${id}`,
    }));
  },

  async ip(ip) {
    const r = await vtGet(`/ip_addresses/${ip}`);
    return shape(r, (a) => ({ owner: a.as_owner || null, country: a.country || null, link: `https://www.virustotal.com/gui/ip-address/${ip}` }));
  },

  async domain(domain) {
    const r = await vtGet(`/domains/${domain}`);
    return shape(r, (a) => ({ categories: [...new Set(Object.values(a.categories || {}))].slice(0, 4), link: `https://www.virustotal.com/gui/domain/${domain}` }));
  },
};
