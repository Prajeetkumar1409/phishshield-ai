import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ScanSearch, Eraser, FlaskConical, ShieldCheck, ShieldX } from 'lucide-react';
import Page from '../components/ui/Page';
import ResultView from '../components/result/ResultView';
import { ScanningState, EmptyState } from '../components/analyzer/ScanningState';
import { api } from '../lib/api';
import { SAMPLES, type Sample } from '../lib/samples';
import { TYPE_META, cn } from '../lib/utils';
import type { ScanResult, ScanType } from '../lib/types';

const TYPES: ScanType[] = ['email', 'sms', 'url', 'message'];
const MIN_SCAN_MS = 1100; // let the scanning animation breathe

export default function Analyze() {
  const [params, setParams] = useSearchParams();
  const initialType = (TYPES.includes(params.get('type') as ScanType) ? params.get('type') : 'email') as ScanType;

  const [type, setType] = useState<ScanType>(initialType);
  const [content, setContent] = useState(params.get('q') ?? '');
  const [sender, setSender] = useState('');
  const [subject, setSubject] = useState('');
  const [save, setSave] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const autoRan = useRef(false);

  const run = useCallback(
    async (override?: { type: ScanType; content: string; sender?: string; subject?: string }) => {
      const payload = override ?? { type, content, sender, subject };
      if (!payload.content.trim()) {
        toast.error('Paste something to analyze first');
        return;
      }
      setLoading(true);
      setResult(null);
      if (window.innerWidth < 1024) setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      const started = Date.now();
      try {
        const res = await api.analyze({
          type: payload.type,
          content: payload.content,
          ...(payload.type === 'email' && { sender: payload.sender || undefined, subject: payload.subject || undefined }),
          save,
        });
        await new Promise((r) => setTimeout(r, Math.max(0, MIN_SCAN_MS - (Date.now() - started))));
        setResult(res);
        if (res.verdict === 'phishing') toast.error('Phishing detected', { description: `Risk score ${res.riskScore}/100` });
        else if (res.verdict === 'suspicious') toast.warning('Suspicious content', { description: `Risk score ${res.riskScore}/100` });
        else toast.success('Looks safe', { description: `Risk score ${res.riskScore}/100` });
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [type, content, sender, subject, save]
  );

  // Deep link from the home page quick-scan: /analyze?type=url&q=...
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const q = params.get('q');
    if (q) {
      run({ type: initialType, content: q });
      setParams({ type: initialType }, { replace: true });
    }
  }, [params, initialType, run, setParams]);

  const switchType = (t: ScanType) => {
    setType(t);
    setParams({ type: t }, { replace: true });
  };

  const loadSample = (s: Sample) => {
    setContent(s.content);
    setSender(s.sender ?? '');
    setSubject(s.subject ?? '');
  };

  const clear = () => {
    setContent('');
    setSender('');
    setSubject('');
    setResult(null);
  };

  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run();
  };

  const meta = TYPE_META[type];

  return (
    <Page className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <span className="section-label">Analyzer</span>
        <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Scan a message or link</h1>
        <p className="mt-2 text-slate-400">Choose a channel, paste the content, and get an explainable verdict.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ---------- Input ---------- */}
        <div className="lg:col-span-5">
          <div className="glass p-5 sm:p-6 lg:sticky lg:top-24" onKeyDown={onKey}>
            <div className="grid grid-cols-4 gap-1 rounded-xl border border-white/10 bg-ink-950/60 p-1">
              {TYPES.map((t) => {
                const Icon = TYPE_META[t].icon;
                return (
                  <button
                    key={t}
                    onClick={() => switchType(t)}
                    className={cn('relative flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 text-xs font-medium transition sm:flex-row sm:justify-center sm:text-sm', type === t ? 'text-white' : 'text-slate-400 hover:text-slate-200')}
                  >
                    {type === t && <motion.span layoutId="type-tab" className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-500/25 to-violet-500/25 ring-1 ring-white/10" transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }} />}
                    <Icon className="relative h-4 w-4" />
                    <span className="relative">{t === 'message' ? 'Chat' : TYPE_META[t].label}</span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={type} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="mt-5 space-y-3">
                {type === 'email' && (
                  <>
                    <input className="input" value={sender} onChange={(e) => setSender(e.target.value)} placeholder='From — e.g. "PayPal" <service@paypal.com>' aria-label="Sender" />
                    <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (optional)" aria-label="Subject" />
                  </>
                )}
                <div className="relative">
                  <textarea
                    className={cn('input resize-y font-mono text-sm leading-relaxed', type === 'url' ? 'min-h-[140px]' : 'min-h-[260px]')}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={meta.placeholder}
                    maxLength={20000}
                    aria-label="Content to analyze"
                  />
                  <span className="pointer-events-none absolute bottom-3 right-3 font-mono text-[10px] text-slate-600">{content.length}/20000</span>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-slate-500">
                <FlaskConical className="h-3.5 w-3.5" /> Try a sample
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLES[type].map((s) => (
                  <button
                    key={s.label}
                    onClick={() => loadSample(s)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition',
                      s.kind === 'phish' ? 'border-rose-400/20 bg-rose-400/5 text-rose-200 hover:bg-rose-400/10' : 'border-emerald-400/20 bg-emerald-400/5 text-emerald-200 hover:bg-emerald-400/10'
                    )}
                  >
                    {s.kind === 'phish' ? <ShieldX className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-slate-400">
              <button
                type="button"
                role="switch"
                aria-checked={save}
                onClick={() => setSave((s) => !s)}
                className={cn('relative h-5 w-9 rounded-full transition', save ? 'bg-cyan-500' : 'bg-white/15')}
              >
                <motion.span layout className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow', save ? 'right-0.5' : 'left-0.5')} />
              </button>
              Save to scan history & dashboard
            </label>

            <div className="mt-5 flex gap-3">
              <button onClick={() => run()} disabled={loading} className="btn-primary flex-1">
                <ScanSearch className="h-4 w-4" /> {loading ? 'Analyzing…' : 'Analyze'}
              </button>
              <button onClick={clear} className="btn-ghost" aria-label="Clear">
                <Eraser className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ---------- Result ---------- */}
        <div className="scroll-mt-24 lg:col-span-7" ref={resultRef}>
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ScanningState />
              </motion.div>
            ) : result ? (
              <motion.div key={result.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ResultView result={result} />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <EmptyState />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Page>
  );
}
