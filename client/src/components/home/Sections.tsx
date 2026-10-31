import { useEffect, useState, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain, Globe, UserX, Activity, Fingerprint, Eye, ArrowRight, ScanText, Cpu, Layers, FileCheck2,
  Mail, MessageSquare, Link2, MessagesSquare, Puzzle,
} from 'lucide-react';
import Reveal from '../ui/Reveal';
import CountUp from '../ui/CountUp';
import { api } from '../../lib/api';
import type { Stats } from '../../lib/types';

/* ---------------- Live stats strip ---------------- */
export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    api.stats().then(setStats).catch(() => setStats(null));
  }, []);

  const items = [
    { label: 'Messages scanned', value: stats?.total ?? 0 },
    { label: 'Threats flagged', value: stats?.threatsBlocked ?? 0 },
    { label: 'Detection engines', value: 5 },
    { label: 'Brands protected', value: 28 },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="glass grid grid-cols-2 divide-white/10 md:grid-cols-4 md:divide-x">
        {items.map((it) => (
          <div key={it.label} className="px-6 py-7 text-center">
            <div className="font-display text-3xl font-bold text-white sm:text-4xl">
              <CountUp value={it.value} />
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">{it.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Features ---------------- */
const FEATURES = [
  { icon: Brain, title: 'NLP language model', text: 'TF-IDF + logistic regression trained on phishing and legitimate messages spots scam wording and explains which phrases drove the score.', color: 'from-cyan-400 to-sky-500' },
  { icon: Globe, title: 'URL intelligence', text: '18 lexical & structural features, typosquat and homoglyph detection, shorteners, risky TLDs and raw-IP hosts.', color: 'from-violet-400 to-fuchsia-500' },
  { icon: UserX, title: 'Impersonation checks', text: 'Display-name spoofing, look-alike sender domains, Reply-To mismatches and brand claims that links don’t back up.', color: 'from-fuchsia-400 to-pink-500' },
  { icon: Fingerprint, title: 'Social-engineering radar', text: 'Detects 9 manipulation tactics — urgency, fear, rewards, secrecy, authority, credential harvesting and more.', color: 'from-amber-400 to-orange-500' },
  { icon: Activity, title: 'Anomaly detection', text: 'Isolation Forests fit on legitimate traffic flag structurally unusual links and messages — catching novel attacks.', color: 'from-emerald-400 to-teal-500' },
  { icon: Eye, title: 'Explainable results', text: 'Every verdict comes with highlighted evidence, per-engine scores and practical next steps — no black box.', color: 'from-sky-400 to-indigo-500' },
];

function FeatureCard({ f, i }: { f: (typeof FEATURES)[number]; i: number }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  return (
    <Reveal delay={i * 0.06}>
      <div onMouseMove={onMove} className="glass glass-hover group relative h-full overflow-hidden p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: `radial-gradient(320px circle at ${pos.x}px ${pos.y}px, rgba(34,211,238,0.09), transparent 60%)` }}
        />
        <div className={`inline-flex rounded-xl bg-gradient-to-br ${f.color} p-2.5 shadow-lg`}>
          <f.icon className="h-5 w-5 text-ink-950" />
        </div>
        <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.text}</p>
      </div>
    </Reveal>
  );
}

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="section-label">Multi-engine detection</span>
        <h2 className="mt-5 text-3xl font-bold sm:text-4xl">Five AI engines. One clear verdict.</h2>
        <p className="mt-4 text-slate-400">Each engine looks at a different side of an attack. Their scores are fused into a single, calibrated risk score.</p>
      </Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} f={f} i={i} />
        ))}
      </div>
    </section>
  );
}

/* ---------------- Pipeline ---------------- */
const STEPS = [
  { icon: ScanText, title: 'Ingest', text: 'Parse headers, sender, subject and extract every link — even ones without http://.' },
  { icon: Cpu, title: 'Analyze', text: 'NLP, URL, impersonation, tactic and anomaly engines run in parallel.' },
  { icon: Layers, title: 'Fuse', text: 'Weighted noisy-OR fusion lets strong evidence dominate while weak signals accumulate.' },
  { icon: FileCheck2, title: 'Explain', text: 'You get a verdict, highlighted evidence and what to do next.' },
];

export function Pipeline() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="section-label">How it works</span>
        <h2 className="mt-5 text-3xl font-bold sm:text-4xl">From raw message to verdict in milliseconds</h2>
      </Reveal>
      <div className="relative mt-14 grid gap-6 md:grid-cols-4">
        <div className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.title} delay={i * 0.12} className="relative text-center">
            <div className="relative mx-auto flex h-[72px] w-[72px] items-center justify-center">
              <span className="absolute inset-0 animate-pulse-ring rounded-full border border-cyan-400/40" style={{ animationDelay: `${i * 0.5}s` }} />
              <div className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/10 bg-ink-900">
                <s.icon className="h-7 w-7 text-cyan-300" />
              </div>
            </div>
            <div className="mt-2 font-mono text-xs text-slate-500">0{i + 1}</div>
            <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
            <p className="mx-auto mt-2 max-w-[240px] text-sm text-slate-400">{s.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Channels ---------------- */
const CHANNELS = [
  { icon: Mail, title: 'Email', text: 'Raw emails with headers, spoofed senders, Reply-To tricks.', to: '/analyze?type=email' },
  { icon: MessageSquare, title: 'SMS', text: 'Smishing: KYC, parcel fees, bank alerts, OTP scams.', to: '/analyze?type=sms' },
  { icon: Link2, title: 'URLs', text: 'Typosquats, homoglyphs, shorteners, IP hosts.', to: '/analyze?type=url' },
  { icon: MessagesSquare, title: 'Chats', text: '“Hi Mum” scams, crypto schemes, fake job offers.', to: '/analyze?type=message' },
  { icon: Puzzle, title: 'Browser', text: 'Chrome extension checks the page you are on.', to: '/learn#extension' },
];

export function Channels() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="section-label">Every channel</span>
        <h2 className="mt-5 text-3xl font-bold sm:text-4xl">Wherever scammers reach you</h2>
      </Reveal>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {CHANNELS.map((c, i) => (
          <Reveal key={c.title} delay={i * 0.06}>
            <Link to={c.to} className="glass glass-hover group flex h-full flex-col p-5">
              <c.icon className="h-6 w-6 text-violet-300" />
              <h3 className="mt-4 font-semibold">{c.title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-slate-400">{c.text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-cyan-300">
                Try it <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
export function CallToAction() {
  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6">
      <Reveal>
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/15 via-ink-900 to-violet-600/20 px-8 py-14 text-center">
          <motion.div
            className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"
            animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
            transition={{ duration: 10, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"
            animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity }}
          />
          <h2 className="relative text-3xl font-bold sm:text-4xl">Got a message that feels off?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-slate-300">Paste it in. PhishShield tells you if it’s a scam — and why — in under a second.</p>
          <Link to="/analyze" className="btn-primary relative mt-8">
            Open the analyzer <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
