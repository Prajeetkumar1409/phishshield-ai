import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Link2, AlertTriangle, ShieldAlert, UserX, Clock } from 'lucide-react';

const CHIPS = [
  { icon: Clock, text: 'Urgency pressure', cls: 'text-amber-300 border-amber-400/30 bg-amber-400/10', pos: '-top-5 left-6', delay: 0.9 },
  { icon: UserX, text: 'Brand impersonation', cls: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-400/10', pos: '-right-6 top-1/2', delay: 1.2 },
  { icon: Link2, text: 'Look-alike domain', cls: 'text-rose-300 border-rose-400/30 bg-rose-400/10', pos: '-bottom-5 left-10', delay: 1.5 },
];

function ScanVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md animate-float">
      <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-tr from-cyan-500/20 via-transparent to-violet-500/20 blur-3xl" />
      <div className="glass relative overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/20 font-bold text-blue-300">P</div>
            <div>
              <div className="text-sm font-semibold text-white">PayPal Security</div>
              <div className="font-mono text-[11px] text-rose-300">service@paypa1-secure.com</div>
            </div>
          </div>
          <span className="rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-400/30">
            PHISHING · 97
          </span>
        </div>
        <div className="space-y-2 text-sm leading-relaxed text-slate-300">
          <p>
            Your account has been <mark className="rounded bg-orange-500/25 px-1 text-orange-200">suspended</mark>. Please{' '}
            <mark className="rounded bg-red-500/25 px-1 text-red-200">verify your identity</mark>{' '}
            <mark className="rounded bg-amber-500/25 px-1 text-amber-200">within 24 hours</mark>:
          </p>
          <p className="truncate font-mono text-xs">
            <mark className="rounded bg-rose-500/25 px-1 text-rose-200">http://paypa1-secure-login.com/verify</mark>
          </p>
        </div>
        <div className="mt-5 space-y-2">
          {[['NLP', 94], ['URL', 96], ['Impersonation', 99]].map(([k, v], i) => (
            <div key={k} className="flex items-center gap-3 text-xs">
              <span className="w-24 text-slate-400">{k}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${v}%` }}
                  transition={{ delay: 0.6 + i * 0.2, duration: 1.1, ease: 'easeOut' }}
                />
              </div>
              <span className="w-6 text-right font-mono text-slate-300">{v}</span>
            </div>
          ))}
        </div>
        {/* scan line */}
        <div className="pointer-events-none absolute inset-x-0 h-16 animate-scan bg-gradient-to-b from-transparent via-cyan-400/15 to-transparent">
          <div className="absolute inset-x-0 bottom-1/2 h-px bg-cyan-300/70 shadow-[0_0_12px_2px_rgba(34,211,238,0.6)]" />
        </div>
      </div>

      {CHIPS.map(({ icon: Icon, text, cls, pos, delay }) => (
        <motion.div
          key={text}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay, type: 'spring' }}
          className={`absolute ${pos} hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md sm:flex ${cls}`}
        >
          <Icon className="h-3.5 w-3.5" /> {text}
        </motion.div>
      ))}
    </div>
  );
}

export default function Hero() {
  const [url, setUrl] = useState('');
  const navigate = useNavigate();

  const quickScan = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    navigate(`/analyze?type=url&q=${encodeURIComponent(url.trim())}`);
  };

  return (
    <section className="mx-auto grid max-w-7xl items-center gap-16 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-2 lg:pt-20">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
        <span className="section-label">
          <Sparkles className="h-3.5 w-3.5" /> Explainable AI threat detection
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
          Stop phishing <br className="hidden sm:block" />
          <span className="text-gradient">before you click.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
          PhishShield AI scans emails, SMS, chats and links with NLP, URL intelligence and anomaly detection — then shows you
          <span className="text-slate-200"> exactly why </span>
          something is dangerous.
        </p>

        <form onSubmit={quickScan} className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="input pl-11" placeholder="Paste a suspicious link…" aria-label="URL to scan" />
          </div>
          <button className="btn-primary">
            Quick scan <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
          <Link to="/analyze" className="inline-flex items-center gap-1.5 text-cyan-300 hover:text-cyan-200">
            <ShieldAlert className="h-4 w-4" /> Analyze an email or SMS
          </Link>
          <span className="inline-flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> No sign-up · results in &lt;50 ms
          </span>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}>
        <ScanVisual />
      </motion.div>
    </section>
  );
}
