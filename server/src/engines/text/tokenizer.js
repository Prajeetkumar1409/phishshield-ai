const STOPWORDS = new Set(
  ('a an the and or but if of to in on at by for with from is are was were be been being this that these those ' +
    'it its i me my we our you your he she they them their his her as so do does did have has had will would ' +
    'can could should shall may might must am not no just than then there here what which who whom when where ' +
    'how all any each few more most other some such only own same too very s t up out about into over').split(' ')
);

/** Light suffix stripping so "verify", "verified", "verifying" share a feature. */
function stem(word) {
  if (word.length <= 4) return word;
  return word
    .replace(/(ations?|ing|edly|ed|ies|es|ly|ment|s)$/u, '')
    .replace(/(.)\1$/u, '$1');
}

/**
 * Normalise text and produce unigram + bigram tokens.
 * URLs, money amounts, phone numbers and other numbers become placeholder tokens
 * so the classifier learns the pattern rather than the literal value.
 */
export function tokenize(text) {
  const normalised = text
    .toLowerCase()
    .replace(/https?:\/\/\S+|www\.\S+/g, ' __url__ ')
    .replace(/[$€£₹]\s?\d[\d,.]*|\d[\d,.]*\s?(usd|inr|rs|dollars|lakh|crore)\b/g, ' __money__ ')
    .replace(/\+?\d[\d\s-]{8,}\d/g, ' __phone__ ')
    .replace(/\d+/g, ' __num__ ');

  const words = normalised
    .split(/[^a-z_]+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .map(stem);

  const tokens = [...words];
  for (let i = 0; i < words.length - 1; i++) tokens.push(`${words[i]} ${words[i + 1]}`);
  return tokens;
}
