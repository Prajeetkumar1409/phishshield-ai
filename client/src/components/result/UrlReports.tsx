import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Lock, LockOpen } from 'lucide-react';
import type { UrlReport } from '../../lib/types';
import { MiniRing } from './RiskGauge';
import { SEVERITY_META, VERDICT_META, cn } from '../../lib/utils';

function UrlCard({ u, defaultOpen }: { u: UrlReport; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = VERDICT_META[u.verdict];
  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/[0.02]">
        <MiniRing score={u.riskScore} verdict={u.verdict} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {u.protocol === 'https' ? <Lock className="h-3.5 w-3.5 text-emerald-400" /> : <LockOpen className="h-3.5 w-3.5 text-rose-400" />}
            <span className="truncate font-mono text-sm text-white">{u.host}</span>
          </div>
          <div className="mt-0.5 truncate font-mono text-xs text-slate-500">{u.url}</div>
        </div>
        <span className={cn('hidden rounded-full px-2.5 py-1 text-xs font-semibold ring-1 sm:inline', meta.bg, meta.text, meta.ring)}>{meta.label}</span>
        <ChevronDown className={cn('h-4 w-4 text-slate-500 transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-white/5 p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['ML model', u.mlProbability],
                  ['Rules', u.ruleScore],
                  ['Anomaly', u.anomalyScore],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-lg bg-white/[0.03] py-2">
                    <div className="font-mono text-sm text-white">{Math.round((v as number) * 100)}%</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
                  </div>
                ))}
              </div>
              {u.reasons.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {u.reasons.map((r) => (
                    <li key={r.title} className="flex gap-2.5 text-sm">
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', SEVERITY_META[r.severity].dot)} />
                      <span>
                        <span className="font-medium text-slate-200">{r.title}</span>
                        <span className="text-slate-400"> — {r.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">No risky URL characteristics found.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function UrlReports({ urls }: { urls: UrlReport[] }) {
  return (
    <div className="space-y-3">
      {urls.map((u, i) => (
        <UrlCard key={u.url + i} u={u} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
