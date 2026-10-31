import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radar, ShieldQuestion } from 'lucide-react';

const STEPS = ['Parsing content & headers', 'Extracting links', 'Running NLP classifier', 'Scoring URLs', 'Checking impersonation', 'Detecting anomalies', 'Fusing verdict'];

export function ScanningState() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 140);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="glass flex min-h-[420px] flex-col items-center justify-center p-8">
      <div className="relative flex h-32 w-32 items-center justify-center">
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute inset-0 animate-pulse-ring rounded-full border border-cyan-400/50" style={{ animationDelay: `${i * 0.6}s` }} />
        ))}
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
          <Radar className="h-14 w-14 text-cyan-300" />
        </motion.div>
      </div>
      <p className="mt-8 font-display text-lg text-white">Analyzing…</p>
      <ul className="mt-4 space-y-1.5 font-mono text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className={i < step ? 'text-emerald-400' : i === step ? 'text-cyan-300' : 'text-slate-600'}>
            {i < step ? '✓' : i === step ? '›' : '·'} {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmptyState() {
  return (
    <div className="glass flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-2xl" />
        <ShieldQuestion className="relative h-16 w-16 text-cyan-300" />
      </div>
      <h3 className="mt-6 text-xl font-semibold">Ready when you are</h3>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
        Paste a message or link on the left — or load one of the samples — and PhishShield will break down every red flag it finds.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] text-slate-500">
        {['Ctrl + Enter to scan', 'Raw email headers supported', 'Up to 20 links per scan'].map((t) => (
          <span key={t} className="rounded-full border border-white/10 px-2.5 py-1">{t}</span>
        ))}
      </div>
    </div>
  );
}
