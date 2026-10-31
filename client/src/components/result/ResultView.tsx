import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  ShieldCheck, ShieldAlert, ShieldX, Copy, Download, Gauge, Highlighter, ListChecks, Link2, Brain, Lightbulb, Zap,
} from 'lucide-react';
import type { ScanResult } from '../../lib/types';
import { VERDICT_META, cn } from '../../lib/utils';
import RiskGauge from './RiskGauge';
import EngineBreakdown from './EngineBreakdown';
import HighlightedText from './HighlightedText';
import SignalList from './SignalList';
import UrlReports from './UrlReports';

const VERDICT_ICON = { safe: ShieldCheck, suspicious: ShieldAlert, phishing: ShieldX };

function Panel({ title, icon: Icon, children, delay = 0, className = '' }: { title: string; icon: typeof Gauge; children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45 }} className={cn('glass p-5 sm:p-6', className)}>
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <Icon className="h-4 w-4 text-cyan-300" /> {title}
      </h3>
      {children}
    </motion.section>
  );
}

export default function ResultView({ result }: { result: ScanResult }) {
  const meta = VERDICT_META[result.verdict];
  const VIcon = VERDICT_ICON[result.verdict];
  const visibleSignals = result.signals.filter((s) => s.severity !== 'info' || result.verdict === 'safe');

  const copy = async () => {
    const text = `PhishShield AI verdict: ${meta.label.toUpperCase()} (risk ${result.riskScore}/100)\n${result.summary}\n\nSignals:\n${result.signals.map((s) => `- [${s.severity}] ${s.title}: ${s.detail}`).join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Report copied to clipboard');
    } catch {
      toast.error('Clipboard not available');
    }
  };
  const download = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `phishshield-${result.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      {/* Verdict header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn('glass relative overflow-hidden p-6 ring-1', meta.ring)}
      >
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full blur-3xl" style={{ background: `${meta.hex}25` }} />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <RiskGauge score={result.riskScore} verdict={result.verdict} size={170} />
          <div className="flex-1 text-center sm:text-left">
            <div className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1', meta.bg, meta.text, meta.ring)}>
              <VIcon className="h-4 w-4" /> {meta.label}
            </div>
            <p className="mt-3 text-lg leading-snug text-white">{result.summary}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-400 sm:justify-start">
              <span>Confidence <b className="text-slate-200">{Math.round(result.confidence * 100)}%</b></span>
              <span className="inline-flex items-center gap-1"><Zap className="h-3 w-3" /> {result.processingMs} ms</span>
              <span>{result.signals.filter((s) => s.severity !== 'info').length} indicators</span>
              {result.claimedBrands.length > 0 && <span>Claims to be <b className="text-slate-200">{result.claimedBrands.join(', ')}</b></span>}
            </div>
            <div className="mt-4 flex justify-center gap-2 sm:justify-start">
              <button onClick={copy} className="btn-ghost !px-3 !py-1.5 text-xs"><Copy className="h-3.5 w-3.5" /> Copy report</button>
              <button onClick={download} className="btn-ghost !px-3 !py-1.5 text-xs"><Download className="h-3.5 w-3.5" /> JSON</button>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Engine breakdown" icon={Gauge} delay={0.1}>
          <EngineBreakdown breakdown={result.breakdown} />
        </Panel>
        <Panel title="What to do" icon={Lightbulb} delay={0.15}>
          <ul className="space-y-2.5">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-300">
                <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold', meta.bg, meta.text)}>{i + 1}</span>
                {r}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {result.type !== 'url' && (
        <Panel title="Evidence in message" icon={Highlighter} delay={0.2}>
          <HighlightedText text={result.input.content} highlights={result.highlights} />
        </Panel>
      )}

      <Panel title="Threat indicators" icon={ListChecks} delay={0.25}>
        <SignalList signals={visibleSignals} />
      </Panel>

      {result.urls.length > 0 && (
        <Panel title={`Link analysis (${result.urls.length})`} icon={Link2} delay={0.3}>
          <UrlReports urls={result.urls} />
        </Panel>
      )}

      {result.nlp && result.nlp.topTerms.length > 0 && (
        <Panel title="NLP explainability" icon={Brain} delay={0.35}>
          <p className="mb-3 text-sm text-slate-400">
            Phrases with the largest influence on the language model. <span className="text-rose-300">Red</span> pushes towards phishing, <span className="text-emerald-300">green</span> towards legitimate.
          </p>
          <div className="flex flex-wrap gap-2">
            {result.nlp.topTerms.map((t) => (
              <span
                key={t.term}
                className={cn(
                  'rounded-lg px-2.5 py-1 font-mono text-xs ring-1',
                  t.weight > 0 ? 'bg-rose-500/10 text-rose-200 ring-rose-400/20' : 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/20'
                )}
              >
                {t.term} <span className="opacity-60">{t.weight > 0 ? '+' : ''}{t.weight.toFixed(2)}</span>
              </span>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
