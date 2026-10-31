import { motion } from 'framer-motion';
import { Brain, Globe, UserX, Fingerprint, Activity } from 'lucide-react';
import type { ScanResult } from '../../lib/types';

const ENGINES = [
  { key: 'nlp', label: 'NLP language model', icon: Brain },
  { key: 'url', label: 'URL intelligence', icon: Globe },
  { key: 'impersonation', label: 'Impersonation', icon: UserX },
  { key: 'socialEngineering', label: 'Social engineering', icon: Fingerprint },
  { key: 'anomaly', label: 'Anomaly detection', icon: Activity },
] as const;

const barColor = (v: number) =>
  v >= 65 ? 'from-orange-400 to-rose-500' : v >= 35 ? 'from-yellow-300 to-amber-500' : 'from-emerald-300 to-teal-500';

export default function EngineBreakdown({ breakdown }: { breakdown: ScanResult['breakdown'] }) {
  return (
    <div className="space-y-4">
      {ENGINES.map(({ key, label, icon: Icon }, i) => {
        const v = breakdown[key];
        if (v === null || v === undefined) return null;
        return (
          <div key={key}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-slate-300">
                <Icon className="h-4 w-4 text-slate-500" /> {label}
              </span>
              <span className="font-mono text-slate-400">{v}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${barColor(v)}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(v, 2)}%` }}
                transition={{ duration: 1, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
