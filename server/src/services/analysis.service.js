import crypto from 'node:crypto';
import config from '../config/index.js';
import { textClassifier } from '../engines/text/textClassifier.js';
import { urlClassifier } from '../engines/url/urlClassifier.js';
import { extractUrls } from '../engines/url/urlParser.js';
import { anomalyDetector } from '../engines/anomaly/anomalyDetector.js';
import { detectSocialEngineering, hasProtectiveLanguage } from '../engines/patterns/socialEngineering.js';
import { detectImpersonation, parseHeaders } from '../engines/patterns/impersonation.js';
import { clamp, round } from '../utils/strings.js';

const MAX_URLS = 20;
const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

const verdictFor = (score) =>
  score >= config.thresholds.phishing ? 'phishing' : score >= config.thresholds.suspicious ? 'suspicious' : 'safe';

/** Keep the highest-priority, non-overlapping highlight spans. */
function resolveHighlights(spans) {
  const priority = { url: 3, impersonation: 2 };
  const sorted = [...spans].sort(
    (a, b) => (priority[b.category] || 1) - (priority[a.category] || 1) || b.end - b.start - (a.end - a.start)
  );
  const kept = [];
  for (const s of sorted) {
    if (!kept.some((k) => s.start < k.end && k.start < s.end)) kept.push(s);
  }
  return kept.sort((a, b) => a.start - b.start).map(({ start, end, category, label }) => ({ start, end, category, label }));
}

function buildRecommendations(verdict, ctx) {
  const recs = [];
  if (verdict === 'safe') {
    recs.push('No strong phishing indicators found — still verify unexpected requests through a channel you trust.');
    if (ctx.urls.length) recs.push('Hover over links before clicking to confirm the destination matches what you expect.');
    return recs;
  }
  recs.push(verdict === 'phishing' ? 'Do not click any links, open attachments or reply to this message.' : 'Treat this message with caution until you can verify the sender.');
  if (ctx.tactics.includes('credentials')) recs.push('Never share passwords, OTPs, PINs or CVV codes — legitimate organisations will not ask for them.');
  if (ctx.tactics.includes('financial')) recs.push('Do not send money, gift cards or crypto. Confirm any payment request by phone using a number you already know.');
  if (ctx.brands.length) recs.push(`Contact ${ctx.brands[0]} directly through their official app or website — not through details in this message.`);
  if (ctx.tactics.includes('pretext')) recs.push('Call the person on their known number to confirm it is really them.');
  if (ctx.tactics.includes('secrecy')) recs.push('Requests for secrecy are a red flag — talk to a colleague or family member before acting.');
  if (ctx.urls.some((u) => u.verdict !== 'safe')) recs.push('If you already clicked a link and entered details, change your password and enable two-factor authentication immediately.');
  recs.push('Report it: forward phishing emails to your IT/security team, or report scam SMS to your carrier (7726 / cybercrime.gov.in).');
  return recs;
}

function buildSummary(verdict, signals, type) {
  const what = { email: 'email', sms: 'SMS', url: 'link', message: 'message' }[type];
  if (verdict === 'safe') return `This ${what} looks legitimate. No significant phishing indicators were detected.`;
  const top = signals.slice(0, 3).map((s) => s.title[0].toLowerCase() + s.title.slice(1));
  const lead = verdict === 'phishing' ? `This ${what} is very likely a phishing or scam attempt` : `This ${what} shows suspicious characteristics`;
  return top.length ? `${lead}: ${top.join(', ')}.` : `${lead}.`;
}

/**
 * Core detection pipeline. Runs every engine relevant to the input type and
 * fuses their probabilities with a weighted noisy-OR, which lets one strong
 * piece of evidence dominate while weak signals accumulate.
 */
export function analyze({ type, content, sender, subject, replyTo }) {
  const started = process.hrtime.bigint();
  const signals = [];
  const components = {};
  let highlights = [];
  let tactics = [];
  let nlp = null;
  let impersonation = { score: 0, signals: [], highlights: [], claimedBrands: [] };

  // ---- URL-only scan ----------------------------------------------------
  if (type === 'url') {
    const candidates = content.split(/[\s,]+/).filter(Boolean).slice(0, MAX_URLS);
    const urls = candidates.map((u) => urlClassifier.analyze(u)).filter(Boolean);
    if (!urls.length) {
      const err = new Error('No valid URL found in input.');
      err.status = 422;
      throw err;
    }
    for (const u of urls) {
      for (const r of u.reasons) signals.push({ category: 'url', severity: r.severity, title: r.title, detail: `${u.host}: ${r.detail}` });
    }
    const worst = Math.max(...urls.map((u) => u.riskScore));
    components.url = worst;
    components.anomaly = Math.round(Math.max(...urls.map((u) => u.anomalyScore)) * 100);
    components.impersonation = urls.some((u) => u.impersonating) ? 90 : 0;
    return finalize({ type, riskScore: worst, components, signals, highlights, urls, nlp, tactics, brands: [...new Set(urls.map((u) => u.impersonating).filter(Boolean))], started, content });
  }

  // ---- Text scan (email / sms / message) --------------------------------
  if (type === 'email') {
    const headers = parseHeaders(content);
    sender = sender || headers.from;
    replyTo = replyTo || headers['reply-to'];
    subject = subject || headers.subject;
  }
  const fullText = [subject, content].filter(Boolean).join('\n');

  // URLs
  const found = extractUrls(content).slice(0, MAX_URLS);
  const urls = [];
  for (const f of found) {
    const r = urlClassifier.analyze(f.raw);
    if (!r) continue;
    urls.push(r);
    highlights.push({ start: f.start, end: f.end, category: 'url', label: `Link — ${r.verdict} (${r.riskScore})` });
    if (r.verdict !== 'safe') {
      signals.push({ category: 'url', severity: r.verdict === 'phishing' ? 'critical' : 'medium', title: `${r.verdict === 'phishing' ? 'Malicious' : 'Suspicious'} link: ${r.host}`, detail: r.reasons.filter((x) => x.severity !== 'info').slice(0, 2).map((x) => x.title).join(' · ') || 'Flagged by URL model.' });
    }
  }

  // NLP
  nlp = textClassifier.predict(fullText);
  const protective = hasProtectiveLanguage(fullText) && !urls.some((u) => u.verdict !== 'safe');
  const nlpRisk = clamp((nlp.probability - 0.35) / 0.6) * (protective ? 0.4 : 1);
  if (protective) {
    signals.push({ category: 'nlp', severity: 'info', title: 'Protective wording', detail: 'Message warns you not to share codes — typical of genuine transactional alerts.' });
  }
  components.nlp = Math.round(nlp.probability * 100);
  if (nlp.probability >= 0.6) {
    signals.push({ category: 'nlp', severity: nlp.probability >= 0.85 ? 'high' : 'medium', title: 'Phishing language detected', detail: `NLP model is ${Math.round(nlp.probability * 100)}% confident the wording matches known phishing/scam messages.` });
  }

  // Social engineering
  const se = detectSocialEngineering(fullText);
  const offset = fullText.length - content.length; // subject prefix shifts spans
  highlights.push(...se.highlights.filter((h) => h.start >= offset).map((h) => ({ ...h, start: h.start - offset, end: h.end - offset })));
  tactics = se.tactics.map((t) => t.id);
  components.socialEngineering = Math.round(se.score * 100);
  for (const t of se.tactics) {
    signals.push({ category: 'social', severity: t.id === 'credentials' || t.id === 'financial' ? 'high' : 'medium', title: t.label, detail: `${t.description} Evidence: "${t.evidence.slice(0, 3).join('", "')}"` });
  }

  // Impersonation
  impersonation = detectImpersonation({ text: content, sender, replyTo, urlResults: urls });
  highlights.push(...impersonation.highlights);
  components.impersonation = Math.round(impersonation.score * 100);
  for (const s of impersonation.signals) signals.push({ category: 'impersonation', severity: s.severity, title: s.title, detail: s.detail });

  // Anomaly
  const textAnomaly = anomalyDetector.scoreText(fullText);
  const urlAnomaly = urls.length ? Math.max(...urls.map((u) => u.anomalyScore)) : 0;
  const anomaly = Math.max(textAnomaly.anomaly, urlAnomaly);
  components.anomaly = Math.round(anomaly * 100);
  if (anomaly >= 0.5) {
    signals.push({ category: 'anomaly', severity: 'low', title: 'Statistical anomaly', detail: 'Formatting and structure deviate from typical legitimate messages (Isolation Forest).' });
  }

  const urlRisk = urls.length ? Math.max(...urls.map((u) => u.riskScore)) / 100 : 0;
  components.url = Math.round(urlRisk * 100);

  // Weighted noisy-OR fusion.
  const parts = [
    [nlpRisk, 0.75 * (0.4 + 0.6 * nlp.coverage)],
    [urlRisk, 0.85],
    [impersonation.score, 0.8],
    [se.score, 0.6],
    [anomaly, 0.25],
  ];
  const risk = 1 - parts.reduce((acc, [p, w]) => acc * (1 - p * w), 1);

  return finalize({ type, riskScore: Math.round(risk * 100), components, signals, highlights, urls, nlp, tactics, brands: impersonation.claimedBrands, started, content, sender, subject });
}

function finalize({ type, riskScore, components, signals, highlights, urls, nlp, tactics, brands, started, content, sender, subject }) {
  const verdict = verdictFor(riskScore);
  signals.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  const dedup = signals.filter((s, i) => signals.findIndex((x) => x.title === s.title) === i);
  const confidence = round(clamp(0.55 + Math.abs(riskScore / 100 - 0.5) * 0.9), 2);

  return {
    id: crypto.randomUUID(),
    type,
    createdAt: new Date().toISOString(),
    riskScore,
    verdict,
    confidence,
    summary: buildSummary(verdict, dedup.filter((s) => s.severity !== 'info'), type),
    breakdown: {
      nlp: components.nlp ?? null,
      url: components.url ?? null,
      impersonation: components.impersonation ?? 0,
      socialEngineering: components.socialEngineering ?? null,
      anomaly: components.anomaly ?? 0,
    },
    signals: dedup,
    highlights: resolveHighlights(highlights),
    urls,
    nlp,
    tactics,
    claimedBrands: brands,
    recommendations: buildRecommendations(verdict, { tactics, brands, urls }),
    input: { content, sender: sender || null, subject: subject || null },
    processingMs: round(Number(process.hrtime.bigint() - started) / 1e6, 2),
  };
}

export function modelInfo() {
  return {
    textClassifier: { algorithm: 'TF-IDF (uni+bi-grams) + Logistic Regression', ...textClassifier.trainingInfo },
    urlClassifier: { algorithm: 'Lexical/structural features + Logistic Regression + expert rules', ...urlClassifier.trainingInfo },
    anomalyDetector: { algorithm: 'Isolation Forest (fit on legitimate URLs and messages)' },
    fusion: 'Weighted noisy-OR over NLP, URL, impersonation, social-engineering and anomaly scores',
  };
}
