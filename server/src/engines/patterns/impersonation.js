import { BRANDS } from '../../data/brands.js';
import { registrableDomain } from '../url/urlParser.js';
import { officialBrandFor } from '../url/brandMatcher.js';
import { levenshtein, normalizeHomoglyphs } from '../../utils/strings.js';

const FREE_MAIL = new Set([
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'proton.me', 'protonmail.com',
  'icloud.com', 'mail.com', 'gmx.com', 'yandex.com', 'zoho.com', 'rediffmail.com',
]);

/** Parse "Display Name <user@domain>" or a bare address. */
export function parseAddress(value) {
  if (!value) return null;
  const m = value.match(/^\s*"?([^"<]*?)"?\s*<\s*([^>\s]+@[^>\s]+)\s*>\s*$/) || value.match(/^\s*()([^\s<>]+@[^\s<>]+)\s*$/);
  if (!m) return null;
  const email = m[2].toLowerCase();
  const host = email.split('@')[1];
  return { name: m[1].trim(), email, host, domain: registrableDomain(host) };
}

/** Pull From / Reply-To / Subject / Return-Path headers out of a pasted raw email. */
export function parseHeaders(text) {
  const headers = {};
  const headerBlock = text.split(/\r?\n\r?\n/)[0];
  for (const line of headerBlock.split(/\r?\n/)) {
    const m = line.match(/^(From|Reply-To|Return-Path|Subject|To):\s*(.+)$/i);
    if (m) headers[m[1].toLowerCase()] = m[2].trim();
  }
  return headers;
}

/** Brands the message *claims* to be from, with spans for highlighting. */
export function claimedBrands(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const brand of BRANDS) {
    for (const kw of brand.keywords) {
      const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = [...lower.matchAll(re)];
      if (matches.length) {
        found.push({ brand, spans: matches.map((m) => ({ start: m.index, end: m.index + m[0].length, text: text.slice(m.index, m.index + m[0].length) })) });
        break;
      }
    }
  }
  return found;
}

/**
 * Impersonation analysis: does the message claim an identity (brand, executive,
 * family member) that its sender address or links do not back up?
 */
export function detectImpersonation({ text, sender, replyTo, urlResults = [] }) {
  const signals = [];
  const highlights = [];
  const claims = claimedBrands(text);
  const from = parseAddress(sender);
  const reply = parseAddress(replyTo);

  for (const c of claims) {
    for (const s of c.spans) highlights.push({ ...s, category: 'impersonation', label: `Claims to be ${c.brand.name}` });
  }

  if (from) {
    const official = officialBrandFor(from.domain);
    const nameBrand = BRANDS.find((b) => b.keywords.some((k) => from.name.toLowerCase().includes(k)));

    if (nameBrand && !nameBrand.domains.includes(from.domain)) {
      signals.push({ severity: 'critical', weight: 0.85, title: 'Display-name spoofing', detail: `Sender name says "${from.name}" but the address is ${from.email}, not @${nameBrand.domains[0]}.` });
    }
    for (const c of claims) {
      if (!c.brand.domains.includes(from.domain) && (!nameBrand || nameBrand !== c.brand)) {
        signals.push({ severity: 'high', weight: 0.7, title: 'Sender does not match brand', detail: `Message references ${c.brand.name}, but was sent from @${from.domain}.` });
        break;
      }
    }
    if (FREE_MAIL.has(from.domain) && (claims.length || /\b(bank|support|security|team|department|admin|helpdesk|ceo)\b/i.test(from.name))) {
      signals.push({ severity: 'high', weight: 0.6, title: 'Organisation using free webmail', detail: `An organisation would not normally write from a free ${from.domain} account.` });
    }
    if (!official) {
      const rawLabel = from.domain.split('.')[0];
      const label = normalizeHomoglyphs(rawLabel);
      const lookalike = BRANDS.flatMap((b) => b.domains.map((d) => ({ b, d }))).find(({ d }) => {
        const t = d.split('.')[0];
        if (t.length < 5) return false;
        if (label === t) return rawLabel !== t; // homoglyph swap, e.g. paypa1
        const dist = levenshtein(label, t);
        return dist > 0 && dist <= (t.length > 6 ? 2 : 1);
      });
      if (lookalike) {
        signals.push({ severity: 'critical', weight: 0.85, title: 'Look-alike sender domain', detail: `@${from.domain} imitates ${lookalike.d}.` });
      }
    }
    if (reply && reply.domain !== from.domain) {
      signals.push({ severity: 'high', weight: 0.55, title: 'Reply-To mismatch', detail: `Replies would go to @${reply.domain} instead of the sender's @${from.domain}.` });
    }
  }

  // Claimed brand, but links lead elsewhere.
  if (claims.length && urlResults.length) {
    const officialLinks = urlResults.filter((u) => claims.some((c) => c.brand.domains.includes(u.domain)));
    const foreignLinks = urlResults.filter((u) => !officialBrandFor(u.domain));
    if (!officialLinks.length && foreignLinks.length) {
      signals.push({ severity: 'high', weight: 0.6, title: 'Links don\'t lead to the claimed brand', detail: `Mentions ${claims.map((c) => c.brand.name).join(', ')} but links go to ${foreignLinks.slice(0, 2).map((u) => u.domain).join(', ')}.` });
    }
  }
  for (const u of urlResults) {
    if (u.impersonating) {
      signals.push({ severity: 'critical', weight: 0.8, title: `Link impersonates ${u.impersonating}`, detail: `${u.host} is not an official ${u.impersonating} domain.` });
      break;
    }
  }

  let survive = 1;
  for (const s of signals) survive *= 1 - s.weight;
  return {
    score: 1 - survive,
    signals,
    highlights,
    claimedBrands: claims.map((c) => c.brand.name),
    sender: from,
  };
}
