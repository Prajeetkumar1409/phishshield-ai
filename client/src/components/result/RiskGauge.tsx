import { motion } from 'framer-motion';
import CountUp from '../ui/CountUp';
import { VERDICT_META } from '../../lib/utils';
import type { Verdict } from '../../lib/types';

export default function RiskGauge({ score, verdict, size = 180 }: { score: number; verdict: Verdict; size?: number }) {
  const stroke = size * 0.075;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75; // 270° gauge
  const meta = VERDICT_META[verdict];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="absolute inset-4 rounded-full blur-2xl" style={{ background: `${meta.hex}22` }} />
      <svg width={size} height={size} className="relative rotate-[135deg]">
        <defs>
          <linearGradient id={`gauge-${verdict}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={meta.hex} stopOpacity="0.6" />
            <stop offset="100%" stopColor={meta.hex} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} strokeDasharray={`${arc} ${c}`} strokeLinecap="round" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#gauge-${verdict})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arc} ${c}`}
          initial={{ strokeDashoffset: arc }}
          animate={{ strokeDashoffset: arc * (1 - score / 100) }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 8px ${meta.hex}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-5xl font-bold text-white" style={{ fontSize: size * 0.27 }}>
          <CountUp value={score} duration={1.4} immediate />
        </div>
        <div className="text-[11px] uppercase tracking-widest text-slate-500">risk score</div>
      </div>
    </div>
  );
}

export function MiniRing({ score, verdict, size = 52 }: { score: number; verdict: Verdict; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const hex = VERDICT_META[verdict].hex;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={hex}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold text-white">{score}</span>
    </div>
  );
}
