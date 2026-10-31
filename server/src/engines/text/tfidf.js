import { tokenize } from './tokenizer.js';

/** TF-IDF vectoriser producing L2-normalised sparse vectors. */
export class TfidfVectorizer {
  constructor({ minDf = 1 } = {}) {
    this.minDf = minDf;
    this.vocab = new Map();
    this.terms = [];
    this.idf = [];
  }

  fit(documents) {
    const df = new Map();
    for (const doc of documents) {
      for (const tok of new Set(tokenize(doc))) df.set(tok, (df.get(tok) || 0) + 1);
    }
    const n = documents.length;
    for (const [term, count] of df) {
      if (count < this.minDf) continue;
      this.vocab.set(term, this.terms.length);
      this.terms.push(term);
      this.idf.push(Math.log((1 + n) / (1 + count)) + 1);
    }
    return this;
  }

  /** Rebuild from an exported vocabulary (e.g. the scikit-learn model from ml/train.py). */
  static fromJSON({ terms, idf }) {
    const v = new TfidfVectorizer();
    v.terms = terms;
    v.idf = idf;
    terms.forEach((t, i) => v.vocab.set(t, i));
    return v;
  }

  transform(text) {
    const counts = new Map();
    for (const tok of tokenize(text)) {
      const idx = this.vocab.get(tok);
      if (idx !== undefined) counts.set(idx, (counts.get(idx) || 0) + 1);
    }
    const vec = new Map();
    let norm = 0;
    for (const [idx, c] of counts) {
      const v = (1 + Math.log(c)) * this.idf[idx];
      vec.set(idx, v);
      norm += v * v;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [idx, v] of vec) vec.set(idx, v / norm);
    return vec;
  }

  get size() {
    return this.terms.length;
  }
}
