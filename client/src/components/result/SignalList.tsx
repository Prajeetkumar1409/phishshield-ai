import { motion } from 'framer-motion';
import { Brain, Globe, UserX, Fingerprint, Activity, CheckCircle2 } from 'lucide-react';
import type { Signal } from '../../lib/types';
import { SEVERITY_META, cn } from '../../lib/utils';

const ICONS = { nlp: Brain, url: Globe, impersonation: UserX, social: Fingerprint, anomaly: Activity };

export default function SignalList({ signals }: { signals: Signal[] }) {
  if (!signals.length) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200">
        <CheckCircle2 className="h-5 w-5 shrink-0" /> No threat indicators were triggered.
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {signals.map((s, i) => {
        const Icon = ICONS[s.category] || Activity;
        const sev = SEVERITY_META[s.severity];
        return (
          <motion.li
            key={s.title + i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i }}
            className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5 transition hover:border-white/10"
          >
            <div className="mt-0.5 rounded-lg bg-white/5 p-2">
              <Icon className="h-4 w-4 text-slate-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-white">{s.title}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1', sev.cls)}>{sev.label}</span>
              </div>
              <p className="mt-1 break-words text-sm text-slate-400">{s.detail}</p>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
