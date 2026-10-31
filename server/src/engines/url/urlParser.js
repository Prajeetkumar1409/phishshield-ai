import { MULTI_PART_SUFFIXES } from '../../data/brands.js';

const URL_RE = /\b((?:https?:\/\/|www\.)[^\s<>"'()]+|(?<![@\w.-])(?:[a-z0-9-]+\.)+(?:com|net|org|info|biz|xyz|top|tk|ml|ga|cf|gq|icu|club|online|site|win|in|co|io|ru|cn|cc|ly|me|app|shop|live|support|link|click|us|uk|gov|edu)(?:\/[^\s<>"'()]*)?)/gi;

/** Find URLs (with or without scheme) in free text along with their character offsets. */
export function extractUrls(text) {
  const out = [];
  const seen = new Set();
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[0].replace(/[.,;:!?]+$/, '');
    if (seen.has(raw.toLowerCase())) continue;
    seen.add(raw.toLowerCase());
    out.push({ raw, start: m.index, end: m.index + raw.length });
  }
  return out;
}

/** Registrable domain, e.g. "login.paypal.co.uk" -> "paypal.co.uk". */
export function registrableDomain(host) {
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  return MULTI_PART_SUFFIXES.has(lastTwo) ? parts.slice(-3).join('.') : lastTwo;
}

/** Parse a URL defensively. Returns null when it cannot be interpreted as a URL. */
export function parseUrl(raw) {
  let input = raw.trim();
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) input = `http://${input}`;
  let u;
  try {
    u = new URL(input);
  } catch {
    return null;
  }
  // WHATWG URL drops userinfo from host, but "user@host" is a classic obfuscation trick.
  const hasUserInfo = Boolean(u.username || u.password) || /^[a-z]+:\/\/[^/]*@/i.test(input);
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[');
  const domain = isIp ? host : registrableDomain(host);
  const tld = isIp ? '' : host.split('.').pop();
  const subdomain = isIp ? '' : host.slice(0, Math.max(0, host.length - domain.length - 1));

  return {
    original: raw,
    href: u.href,
    protocol: u.protocol.replace(':', ''),
    host,
    domain,
    subdomain,
    tld,
    path: u.pathname,
    query: u.search,
    port: u.port,
    isIp,
    hasUserInfo,
    explicitScheme: /^[a-z]+:\/\//i.test(raw.trim()),
  };
}
