export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Shannon entropy in bits per character. */
export function entropy(str) {
  if (!str) return 0;
  const freq = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  let h = 0;
  for (const n of Object.values(freq)) {
    const p = n / str.length;
    h -= p * Math.log2(p);
  }
  return h;
}

const HOMOGLYPHS = [
  [/rn/g, 'm'],
  [/vv/g, 'w'],
  [/0/g, 'o'],
  [/1/g, 'l'],
  [/3/g, 'e'],
  [/5/g, 's'],
  [/\$/g, 's'],
  [/@/g, 'a'],
  [/[íìï]/g, 'i'],
  [/[а]/g, 'a'], // Cyrillic a
  [/[е]/g, 'e'], // Cyrillic e
  [/[о]/g, 'o'], // Cyrillic o
  [/[р]/g, 'p'], // Cyrillic r
  [/[с]/g, 'c'], // Cyrillic s
];

/** Collapse common look-alike characters so "paypa1" and "pаypal" both become "paypal". */
export function normalizeHomoglyphs(str) {
  let out = str.toLowerCase();
  for (const [re, rep] of HOMOGLYPHS) out = out.replace(re, rep);
  return out;
}

export const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
export const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
