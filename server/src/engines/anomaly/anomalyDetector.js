import { IsolationForest } from '../ml/isolationForest.js';
import { BENIGN_URLS } from '../../data/urls.js';
import { LEGITIMATE } from '../../data/corpus.js';
import { parseUrl } from '../url/urlParser.js';
import { structuralVector } from '../url/urlFeatures.js';
import { clamp, round } from '../../utils/strings.js';

/** Stylometric profile of a message: shouting, punctuation, links, numbers, money. */
export function textProfile(text) {
  const letters = text.replace(/[^a-z]/gi, '');
  const words = text.split(/\s+/).filter(Boolean);
  const len = Math.max(1, text.length);
  return [
    letters ? (text.match(/[A-Z]/g) || []).length / letters.length : 0,
    ((text.match(/!/g) || []).length / len) * 100,
    (text.match(/https?:\/\/|www\./gi) || []).length,
    (text.match(/\d/g) || []).length / len,
    (text.match(/[$€£₹]|\b(usd|inr|rs\.?)\b/gi) || []).length,
    words.length ? letters.length / words.length : 0,
    ((text.match(/[^\w\s.,'?-]/g) || []).length / len) * 100,
  ];
}

/**
 * Unsupervised anomaly detection: Isolation Forests are fit only on *legitimate*
 * data, so anything structurally unlike normal traffic stands out — including
 * novel phishing patterns the supervised models have never seen.
 */
class AnomalyDetector {
  constructor() {
    const urlRows = BENIGN_URLS.map(parseUrl).filter(Boolean).map(structuralVector);
    this.urlForest = new IsolationForest({ trees: 150, sampleSize: 32, seed: 11 }).fit(urlRows);
    this.urlBaseline = this.#baseline(this.urlForest, urlRows);

    const textRows = LEGITIMATE.map(textProfile);
    this.textForest = new IsolationForest({ trees: 150, sampleSize: 32, seed: 23 }).fit(textRows);
    this.textBaseline = this.#baseline(this.textForest, textRows);
  }

  /** 95th-percentile score on training data = the boundary of "normal". */
  #baseline(forest, rows) {
    const scores = rows.map((r) => forest.score(r)).sort((a, b) => a - b);
    return scores[Math.floor(scores.length * 0.95)];
  }

  #normalise(score, baseline) {
    return round(clamp((score - baseline) / (0.75 - baseline)), 3);
  }

  scoreUrl(parsed) {
    const raw = this.urlForest.score(structuralVector(parsed));
    return { raw: round(raw, 3), anomaly: this.#normalise(raw, this.urlBaseline) };
  }

  scoreText(text) {
    const raw = this.textForest.score(textProfile(text));
    return { raw: round(raw, 3), anomaly: this.#normalise(raw, this.textBaseline) };
  }
}

export const anomalyDetector = new AnomalyDetector();
