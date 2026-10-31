import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../src/services/analysis.service.js';
import { urlClassifier } from '../src/engines/url/urlClassifier.js';
import { IsolationForest } from '../src/engines/ml/isolationForest.js';
import { extractUrls } from '../src/engines/url/urlParser.js';

const run = (type, content, extra = {}) => analyze({ type, content, ...extra });

test('flags a credential-phishing email with spoofed sender', () => {
  const r = run('email', 'Your PayPal account has been limited due to unusual activity. Verify your identity within 24 hours at http://paypa1-secure-login.com/verify or it will be suspended.', {
    sender: 'PayPal Support <service@paypal-security-team.com>',
  });
  assert.equal(r.verdict, 'phishing');
  assert.ok(r.signals.some((s) => s.title === 'Display-name spoofing'));
  assert.ok(r.highlights.length > 0);
});

test('flags a family-emergency pretext scam with no links', () => {
  const r = run('message', "Hi mom, I lost my phone, this is my new number. Need money urgently, please transfer it now and don't tell dad");
  assert.notEqual(r.verdict, 'safe');
  assert.ok(r.tactics.includes('pretext'));
});

test('flags an OTP-sharing scam that copies the protective warning', () => {
  const r = run('sms', 'Share the OTP you just received to complete your refund. Do not share this with anyone else.');
  assert.notEqual(r.verdict, 'safe');
});

test('passes ordinary personal and work messages', () => {
  assert.equal(run('message', 'Hey, are we still meeting for lunch tomorrow at 1? I booked the table.').verdict, 'safe');
  assert.equal(run('email', 'Hi team, notes from the sprint review are attached. Demo: https://github.com/org/repo/pull/42', { sender: 'Priya <priya@company.com>' }).verdict, 'safe');
});

test('passes a genuine OTP message', () => {
  assert.equal(run('sms', 'Your OTP for login is 553201. Do not share it with anyone. -HDFC Bank').verdict, 'safe');
});

test('URL classifier: official vs look-alike vs shortener', () => {
  assert.equal(urlClassifier.analyze('https://www.paypal.com/myaccount').verdict, 'safe');
  assert.equal(urlClassifier.analyze('https://www.amazon.in/gp/css/order-history').verdict, 'safe');
  const fake = urlClassifier.analyze('http://micros0ft-login.verify-account.xyz/auth');
  assert.equal(fake.verdict, 'phishing');
  assert.equal(fake.impersonating, 'Microsoft');
  assert.equal(urlClassifier.analyze('http://bit.ly/abc123').verdict, 'suspicious');
  assert.equal(urlClassifier.analyze('http://192.168.1.20/bank/login.php').verdict, 'phishing');
});

test('URL scan rejects input with no URL', () => {
  assert.throws(() => run('url', 'hello'), /No valid URL/);
});

test('extractUrls finds scheme-less links with offsets', () => {
  const text = 'Visit secure-login.xyz/verify now';
  const [u] = extractUrls(text);
  assert.equal(u.raw, 'secure-login.xyz/verify');
  assert.equal(text.slice(u.start, u.end), u.raw);
});

test('isolation forest scores outliers higher than inliers', () => {
  const data = Array.from({ length: 100 }, (_, i) => [i % 10, (i * 7) % 10]);
  const f = new IsolationForest({ seed: 1 }).fit(data);
  assert.ok(f.score([500, 500]) > f.score([5, 5]));
});
