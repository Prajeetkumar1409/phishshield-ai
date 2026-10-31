import { BRANDS } from '../../data/brands.js';
import { levenshtein, normalizeHomoglyphs } from '../../utils/strings.js';

const OFFICIAL = new Map();
for (const b of BRANDS) for (const d of b.domains) OFFICIAL.set(d, b);

const label = (domain) => domain.split('.')[0];

/** Is this registrable domain one of the official domains for a known brand? */
export function officialBrandFor(domain) {
  return OFFICIAL.get(domain) || null;
}

/**
 * Detects look-alike (typosquatted / homoglyph) domains and brand names placed
 * somewhere in a URL that is not owned by the brand.
 */
export function analyzeBrandUsage(parsed) {
  if (!parsed || parsed.isIp) return { typosquat: null, brandMention: null };
  if (officialBrandFor(parsed.domain)) return { typosquat: null, brandMention: null, official: officialBrandFor(parsed.domain) };

  const domLabel = label(parsed.domain);
  const normLabel = normalizeHomoglyphs(domLabel);
  let typosquat = null;
  let brandMention = null;

  for (const brand of BRANDS) {
    for (const official of brand.domains) {
      const target = label(official);
      if (target.length < 4) continue;
      const dist = levenshtein(normLabel, target);
      const homoglyph = normLabel === target && domLabel !== target;
      if (homoglyph || (dist > 0 && dist <= (target.length > 6 ? 2 : 1))) {
        typosquat = { brand: brand.name, official, distance: dist, homoglyph };
        break;
      }
    }
    if (typosquat) break;
  }

  const haystack = normalizeHomoglyphs(`${parsed.host}${parsed.path}`).replace(/[^a-z]/g, ' ');
  for (const brand of BRANDS) {
    const hit = brand.domains.some((d) => {
      const t = label(d);
      return t.length >= 3 && new RegExp(`(^|[^a-z])${t}([^a-z]|$)`).test(haystack);
    });
    if (hit) {
      brandMention = { brand: brand.name, official: brand.domains[0] };
      break;
    }
  }
  // A domain like "paypal-secure-login.com" contains the brand inside the label itself.
  if (!brandMention) {
    for (const brand of BRANDS) {
      const t = label(brand.domains[0]);
      if (t.length >= 5 && normLabel.includes(t) && normLabel !== t) {
        brandMention = { brand: brand.name, official: brand.domains[0] };
        break;
      }
    }
  }
  return { typosquat, brandMention };
}
