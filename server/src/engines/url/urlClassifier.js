import { LogisticRegression, toSparse } from '../ml/logisticRegression.js';
import { StandardScaler } from '../ml/scaler.js';
import { BENIGN_URLS, PHISHING_URLS } from '../../data/urls.js';
import { parseUrl } from './urlParser.js';
import { extractUrlFeatures } from './urlFeatures.js';
import { anomalyDetector } from '../anomaly/anomalyDetector.js';
import { clamp, round } from '../../utils/strings.js';

/** Expert rules: [test, weight, severity, title, detail]. Weights combine via noisy-OR. */
const RULES = [
  [(f) => f.raw.isIp, 0.7, 'high', 'Raw IP address', 'Link points to a bare IP address instead of a domain name.'],
  [(f) => f.raw.userInfo, 0.75, 'high', '"@" obfuscation', 'Text before "@" in a URL is ignored by browsers — used to disguise the real destination.'],
  [(f) => f.raw.typosquat, 0.85, 'critical', 'Look-alike domain', (f) => `Domain imitates ${f.brand.typosquat.official}${f.brand.typosquat.homoglyph ? ' using look-alike characters' : ''}.`],
  [(f) => f.raw.brandMismatch, 0.7, 'high', 'Brand name on unofficial domain', (f) => `Mentions ${f.brand.brandMention.brand} but is not hosted on ${f.brand.brandMention.official}.`],
  [(f) => f.raw.punycode, 0.65, 'high', 'Punycode / Unicode domain', 'Internationalised characters can make a fake domain look identical to a real one.'],
  [(f) => f.raw.suspiciousTld, 0.4, 'medium', 'High-risk TLD', (f, p) => `".${p.tld}" domains are disproportionately used for abuse.`],
  [(f) => f.raw.shortener, 0.35, 'medium', 'URL shortener', 'The real destination is hidden behind a link shortener.'],
  [(f) => f.raw.abusedHosting, 0.3, 'medium', 'Free hosting platform', 'Free site builders are frequently used to host throwaway phishing pages.'],
  [(f) => f.raw.sensitiveWords >= 2, 0.35, 'medium', 'Credential-themed keywords', (f) => `Contains: ${f.sensitive.slice(0, 4).join(', ')}.`],
  [(f) => f.raw.subdomains >= 3, 0.35, 'medium', 'Deep subdomain chain', 'Many nested subdomains are often used to push the real domain out of view.'],
  [(f) => f.raw.hostHyphens >= 2, 0.25, 'low', 'Hyphenated domain', 'Multiple hyphens are common in auto-generated phishing domains.'],
  [(f) => f.raw.noHttps === 1, 0.2, 'low', 'No HTTPS', 'Connection is not encrypted.'],
  [(f, p) => p.port && !['80', '443'].includes(p.port), 0.3, 'medium', 'Non-standard port', (f, p) => `Uses port ${p.port}.`],
];

class UrlClassifier {
  constructor() {
    const rows = [];
    const labels = [];
    for (const [list, label] of [[BENIGN_URLS, 0], [PHISHING_URLS, 1]]) {
      for (const u of list) {
        const p = parseUrl(u);
        if (!p) continue;
        rows.push(extractUrlFeatures(p).vector);
        labels.push(label);
      }
    }
    this.scaler = new StandardScaler().fit(rows);
    const X = rows.map((r) => toSparse(this.scaler.transform(r)));
    this.model = new LogisticRegression({ learningRate: 0.3, epochs: 800, l2: 0.01 }).fit(X, labels, rows[0].length);

    const correct = X.filter((x, i) => (this.model.predictProba(x) >= 0.5 ? 1 : 0) === labels[i]).length;
    this.trainingInfo = { samples: rows.length, features: rows[0].length, trainAccuracy: round(correct / rows.length, 3) };
  }

  analyze(rawUrl) {
    const parsed = parseUrl(rawUrl);
    if (!parsed || !parsed.host.includes('.')) return null;

    const features = extractUrlFeatures(parsed);
    const mlProbability = this.model.predictProba(toSparse(this.scaler.transform(features.vector)));
    const anomaly = anomalyDetector.scoreUrl(parsed);

    const reasons = [];
    let survive = 1;
    for (const [test, weight, severity, title, detail] of RULES) {
      if (!test(features, parsed)) continue;
      survive *= 1 - weight;
      reasons.push({ severity, title, detail: typeof detail === 'function' ? detail(features, parsed) : detail });
    }
    const ruleScore = 1 - survive;

    let score = 1 - (1 - ruleScore) * (1 - 0.6 * mlProbability) * (1 - 0.3 * anomaly.anomaly);
    // Verified official brand domain: strong prior towards safe.
    if (features.brand.official) {
      score = Math.min(score, 0.12);
      reasons.unshift({ severity: 'info', title: 'Official domain', detail: `Registered domain belongs to ${features.brand.official.name}.` });
    }
    // A shortener alone only hides the destination; it can't prove intent.
    if (features.raw.shortener && !features.raw.sensitiveWords) score = Math.min(score, 0.55);
    if (anomaly.anomaly > 0.5 && !features.brand.official) {
      reasons.push({ severity: 'medium', title: 'Structurally anomalous', detail: 'URL structure deviates strongly from normal, legitimate links (Isolation Forest).' });
    }

    const riskScore = Math.round(clamp(score) * 100);
    return {
      url: parsed.original,
      host: parsed.host,
      domain: parsed.domain,
      protocol: parsed.protocol,
      riskScore,
      verdict: riskScore >= 65 ? 'phishing' : riskScore >= 35 ? 'suspicious' : 'safe',
      mlProbability: round(mlProbability, 3),
      anomalyScore: anomaly.anomaly,
      ruleScore: round(ruleScore, 3),
      impersonating: features.brand.typosquat?.brand || (features.raw.brandMismatch ? features.brand.brandMention.brand : null),
      reasons,
      features: features.raw,
    };
  }
}

export const urlClassifier = new UrlClassifier();
