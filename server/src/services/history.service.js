import { scanRepository } from '../repositories/scan.repository.js';

/** Lightweight list view — full content stays in the detail endpoint. */
const toSummary = (s) => ({
  id: s.id,
  type: s.type,
  createdAt: s.createdAt,
  riskScore: s.riskScore,
  verdict: s.verdict,
  summary: s.summary,
  preview: (s.input?.subject || s.input?.content || '').slice(0, 140),
  signalCount: s.signals.length,
});

export const historyService = {
  save: (result) => scanRepository.create(result),
  list: (query) => {
    const { total, items } = scanRepository.findAll(query);
    return { total, items: items.map(toSummary) };
  },
  get: (id) => scanRepository.findById(id),
  remove: (id) => scanRepository.remove(id),
  clear: () => scanRepository.clear(),

  stats() {
    const scans = scanRepository.all();
    const byVerdict = { safe: 0, suspicious: 0, phishing: 0 };
    const byType = { email: 0, sms: 0, url: 0, message: 0 };
    const signalCounts = {};
    const days = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = { date: d.toISOString().slice(0, 10), safe: 0, suspicious: 0, phishing: 0 };
    }

    let riskSum = 0;
    for (const s of scans) {
      byVerdict[s.verdict]++;
      byType[s.type]++;
      riskSum += s.riskScore;
      const day = days[s.createdAt.slice(0, 10)];
      if (day) day[s.verdict]++;
      for (const sig of s.signals) {
        if (sig.severity === 'info') continue;
        const key = sig.title.replace(/:.*$/, '');
        signalCounts[key] = (signalCounts[key] || 0) + 1;
      }
    }

    return {
      total: scans.length,
      threatsBlocked: byVerdict.phishing + byVerdict.suspicious,
      averageRisk: scans.length ? Math.round(riskSum / scans.length) : 0,
      byVerdict,
      byType,
      timeline: Object.values(days),
      topSignals: Object.entries(signalCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, count]) => ({ name, count })),
    };
  },
};
