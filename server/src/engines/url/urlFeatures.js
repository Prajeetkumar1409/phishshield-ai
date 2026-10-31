import { SUSPICIOUS_TLDS, URL_SHORTENERS, ABUSED_HOSTING } from '../../data/brands.js';
import { entropy } from '../../utils/strings.js';
import { analyzeBrandUsage } from './brandMatcher.js';

const SENSITIVE_WORDS = [
  'login', 'log-in', 'signin', 'sign-in', 'verify', 'verification', 'secure', 'account', 'update', 'confirm',
  'banking', 'password', 'webscr', 'wallet', 'claim', 'reward', 'free', 'gift', 'unlock', 'suspend', 'billing',
  'payment', 'refund', 'kyc', 'auth', 'session', 'recover', 'validate', 'prize', 'winner', 'bonus',
];

export const FEATURE_NAMES = [
  'length', 'hostDots', 'hostHyphens', 'hostDigits', 'subdomains', 'isIp', 'userInfo', 'noHttps',
  'suspiciousTld', 'shortener', 'sensitiveWords', 'hostEntropy', 'pathDepth', 'queryLength', 'punycode',
  'brandMismatch', 'typosquat', 'abusedHosting',
];

function abusedHost(host) {
  for (const h of ABUSED_HOSTING) if (host === h || host.endsWith(`.${h}`)) return true;
  return false;
}

/** Extracts a lexical/structural feature profile for a parsed URL. */
export function extractUrlFeatures(parsed) {
  const full = `${parsed.host}${parsed.path}${parsed.query}`.toLowerCase();
  const brand = analyzeBrandUsage(parsed);
  const sensitive = SENSITIVE_WORDS.filter((w) => full.includes(w));

  const raw = {
    length: full.length,
    hostDots: (parsed.host.match(/\./g) || []).length,
    hostHyphens: (parsed.host.match(/-/g) || []).length,
    hostDigits: (parsed.host.match(/\d/g) || []).length,
    subdomains: parsed.subdomain ? parsed.subdomain.split('.').filter((s) => s && s !== 'www').length : 0,
    isIp: parsed.isIp ? 1 : 0,
    userInfo: parsed.hasUserInfo ? 1 : 0,
    noHttps: parsed.protocol === 'https' ? 0 : parsed.explicitScheme ? 1 : 0.5,
    suspiciousTld: SUSPICIOUS_TLDS.has(parsed.tld) ? 1 : 0,
    shortener: URL_SHORTENERS.has(parsed.host.replace(/^www\./, '')) ? 1 : 0,
    sensitiveWords: sensitive.length,
    hostEntropy: entropy(parsed.host),
    pathDepth: parsed.path.split('/').filter(Boolean).length,
    queryLength: parsed.query.length,
    punycode: parsed.host.includes('xn--') || /[^\x00-\x7f]/.test(parsed.host) ? 1 : 0,
    brandMismatch: brand.brandMention && !brand.official ? 1 : 0,
    typosquat: brand.typosquat ? 1 : 0,
    abusedHosting: abusedHost(parsed.host) ? 1 : 0,
  };

  const vector = FEATURE_NAMES.map((k) => raw[k]);
  // Log-scale unbounded counts so a single long URL doesn't dominate the model.
  vector[0] = Math.log1p(vector[0]);
  vector[13] = Math.log1p(vector[13]);

  return { raw, vector, brand, sensitive };
}

/** Compact structural vector used by the anomaly detector. */
export function structuralVector(parsed) {
  const full = `${parsed.host}${parsed.path}${parsed.query}`;
  return [
    Math.log1p(full.length),
    (parsed.host.match(/\./g) || []).length,
    (parsed.host.match(/-/g) || []).length,
    (full.match(/\d/g) || []).length / Math.max(1, full.length),
    parsed.path.split('/').filter(Boolean).length,
    Math.log1p(parsed.query.length),
    entropy(parsed.host),
    (full.match(/[^a-z0-9./-]/gi) || []).length,
    parsed.host.length,
  ];
}
