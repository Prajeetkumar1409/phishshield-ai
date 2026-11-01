import dns from 'node:dns/promises';
import net from 'node:net';

/**
 * Real infrastructure intelligence from public registries, no API keys:
 *  - domains: RDAP (registration date -> age, registrar)        via rdap.org bootstrap
 *  - IPs:     Team Cymru IP-to-ASN DNS service (ASN, country, AS name) + RDAP (network owner)
 * Anything that cannot be looked up comes back as null with a reason, never a guess.
 */

const TIMEOUT = 8000;
const CACHE_TTL = 6 * 60 * 60 * 1000;
const cache = new Map();

async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function rdap(path) {
  const res = await fetch(`https://rdap.org/${path}`, { headers: { accept: 'application/rdap+json', 'user-agent': 'PhishShield-TRACE-X/1.0 (+https://github.com/Prajeetkumar1409/phishshield-ai)' }, signal: AbortSignal.timeout(TIMEOUT) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`RDAP HTTP ${res.status}`);
  return res.json();
}

const vcardName = (entity) => (entity?.vcardArray?.[1] || []).find((f) => f[0] === 'fn')?.[3] || null;
const entityWithRole = (obj, role) => (obj?.entities || []).find((e) => (e.roles || []).includes(role));

// Second-level suffixes where the registrable domain has three labels (co.uk, com.au, ...)
const SLD = new Set(['co', 'com', 'net', 'org', 'gov', 'edu', 'ac', 'gen', 'firm', 'ind', 'ltd', 'plc', 'nic', 'res', 'mil']);
export function registrableDomain(host) {
  const labels = String(host || '').toLowerCase().replace(/\.$/, '').split('.').filter(Boolean);
  if (labels.length < 2 || net.isIP(host)) return null;
  const n = labels.length >= 3 && labels.at(-1).length === 2 && SLD.has(labels.at(-2)) ? 3 : 2;
  return labels.slice(-n).join('.');
}

export function isPublicIp(ip) {
  if (net.isIP(ip) !== 4) return net.isIP(ip) === 6 && !/^(::1|fe80:|fc|fd)/i.test(ip);
  const [a, b, c] = ip.split('.').map(Number);
  // documentation (RFC 5737) and benchmarking ranges are reserved too
  if ((a === 192 && b === 0 && c === 2) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113) || (a === 198 && (b === 18 || b === 19))) return false;
  return !(a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224);
}

export function domainInfo(host) {
  const domain = registrableDomain(host);
  if (!domain) return Promise.resolve({ domain: host, status: 'invalid' });
  return cached(`d:${domain}`, async () => {
    try {
      const r = await rdap(`domain/${domain}`);
      if (!r) return { domain, status: 'not_found' };
      const ev = (action) => (r.events || []).find((e) => e.eventAction === action)?.eventDate || null;
      const registered = ev('registration');
      return {
        domain,
        status: 'ok',
        registered,
        ageDays: registered ? Math.floor((Date.now() - Date.parse(registered)) / 86400000) : null,
        expires: ev('expiration'),
        registrar: vcardName(entityWithRole(r, 'registrar')),
        domainStatus: (r.status || []).slice(0, 4),
      };
    } catch (e) {
      return { domain, status: 'unavailable', reason: e.name === 'TimeoutError' ? 'registry timed out' : e.message };
    }
  });
}

const HOSTING = /hosting|host\b|cloud|vps|server|datacenter|data cent|colo|ovh|hetzner|digitalocean|linode|akamai|amazon|aws|google|microsoft|azure|oracle|alibaba|tencent|contabo|vultr|choopa|leaseweb|m247|hostinger|namecheap|godaddy|ionos|scaleway|cloudflare|fastly/i;

async function cymru(ip) {
  const rev = ip.split('.').reverse().join('.');
  const [origin] = await dns.resolveTxt(`${rev}.origin.asn.cymru.com`);
  const [asn, prefix, country] = origin.join('').split('|').map((s) => s.trim());
  const first = asn.split(' ')[0];
  let asName = null;
  try {
    const [as] = await dns.resolveTxt(`AS${first}.asn.cymru.com`);
    asName = as.join('').split('|').pop().trim();
  } catch { /* AS name is optional */ }
  return { asn: `AS${first}`, prefix, country: country || null, asName };
}

export function ipInfo(ip) {
  if (!net.isIP(ip)) return Promise.resolve({ ip, status: 'invalid' });
  if (!isPublicIp(ip)) return Promise.resolve({ ip, status: 'private' });
  return cached(`ip:${ip}`, async () => {
    const [asn, reg] = await Promise.allSettled([net.isIP(ip) === 4 ? cymru(ip) : Promise.reject(new Error('IPv6 ASN lookup not supported')), rdap(`ip/${ip}`)]);
    const a = asn.status === 'fulfilled' ? asn.value : {};
    const r = reg.status === 'fulfilled' && reg.value ? reg.value : {};
    if (asn.status === 'rejected' && reg.status === 'rejected') return { ip, status: 'unavailable', reason: 'ASN and RDAP lookups failed' };
    const owner = vcardName(entityWithRole(r, 'registrant')) || r.name || a.asName || null;
    const label = `${a.asName || ''} ${owner || ''}`;
    return {
      ip,
      status: 'ok',
      asn: a.asn || null,
      asName: a.asName || null,
      prefix: a.prefix || (r.startAddress && r.endAddress ? `${r.startAddress} – ${r.endAddress}` : null),
      country: a.country || r.country || null,
      network: r.name || null,
      owner,
      hosting: label.trim() ? (HOSTING.test(label) ? 'Hosting / cloud provider' : 'ISP or organisation network') : null,
    };
  });
}
