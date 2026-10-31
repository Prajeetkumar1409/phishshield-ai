import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Globe, Activity, Layers, ChevronDown, CheckCircle2, Puzzle, Download, ToggleRight, FolderOpen } from 'lucide-react';
import Page from '../components/ui/Page';
import Reveal from '../components/ui/Reveal';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

const MODELS = [
  {
    icon: Brain,
    title: 'NLP text classifier',
    body: 'Messages are normalised (URLs, money, phone numbers and digits become placeholder tokens), lightly stemmed and split into unigrams and bigrams. TF-IDF weighting feeds an L2-regularised logistic regression trained on a curated phishing / legitimate corpus. Because the model is linear, each term’s contribution to the score is directly readable — that is what the “NLP explainability” panel shows.',
  },
  {
    icon: Globe,
    title: 'URL classifier',
    body: '18 lexical and structural features per link — length, dots, hyphens, digits, subdomain depth, entropy, raw IP, “@” userinfo, punycode, risky TLD, shortener, credential keywords, free hosting, and brand checks. Look-alike domains are found with Levenshtein distance after collapsing homoglyphs (0→o, 1→l, rn→m, Cyrillic letters). A logistic regression and an expert rule-set are combined; verified official brand domains are capped as safe.',
  },
  {
    icon: Activity,
    title: 'Isolation Forest anomaly detection',
    body: 'Two Isolation Forests are fit only on legitimate data — one on URL structure, one on message stylometry (shouting, punctuation, link density, digits, currency). Outliers are isolated in fewer random splits, so they score higher. This catches unusual attacks the supervised models have never seen.',
  },
  {
    icon: Layers,
    title: 'Score fusion',
    body: 'Engine outputs are combined with a weighted noisy-OR: risk = 1 − Π(1 − wᵢ·pᵢ). One strong piece of evidence (e.g. a typosquatted link) can drive the verdict alone, while several weak signals accumulate. Scores ≥ 65 are phishing, ≥ 35 suspicious.',
  },
];

const TIPS = [
  'Check the real sender address, not just the display name.',
  'Hover over links — does the domain exactly match the company?',
  'Banks never ask for your OTP, PIN, CVV or password.',
  'Urgency, threats and “keep this secret” are manipulation tactics.',
  'Gift cards, crypto and wire transfers are a scammer’s favourite payment.',
  'When in doubt, contact the organisation through its official app or website.',
  'Turn on two-factor authentication for email and banking.',
  'Report phishing: cybercrime.gov.in (India) · reportfraud.ftc.gov (US) · forward scam SMS to 7726.',
];

function Accordion({ item, open, onToggle }: { item: (typeof MODELS)[number]; open: boolean; onToggle: () => void }) {
  return (
    <div className="glass overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center gap-4 p-5 text-left">
        <span className="rounded-xl bg-gradient-to-br from-cyan-400/20 to-violet-500/20 p-2.5"><item.icon className="h-5 w-5 text-cyan-300" /></span>
        <span className="flex-1 font-display text-lg font-semibold text-white">{item.title}</span>
        <ChevronDown className={cn('h-5 w-5 text-slate-500 transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400 sm:pl-[76px]">{item.body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Learn() {
  const [open, setOpen] = useState(0);
  const [models, setModels] = useState<Record<string, Record<string, unknown>> | null>(null);
  const { hash } = useLocation();

  useEffect(() => {
    api.models().then((m) => setModels(m as Record<string, Record<string, unknown>>)).catch(() => {});
  }, []);
  useEffect(() => {
    if (hash) setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 300);
  }, [hash]);

  return (
    <Page className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <span className="section-label">Learn</span>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">How PhishShield AI thinks</h1>
      <p className="mt-3 max-w-2xl text-slate-400">No black boxes. Every model is trained in-house on start-up and runs locally on the server — your messages never leave it.</p>

      <section id="models" className="mt-10 scroll-mt-24 space-y-3">
        {MODELS.map((m, i) => (
          <Accordion key={m.title} item={m} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
        ))}
      </section>

      {models && (
        <Reveal className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ['NLP vocabulary', `${models.textClassifier?.vocabulary} terms`],
            ['NLP training samples', String(models.textClassifier?.samples)],
            ['URL features', `${models.urlClassifier?.features} per link`],
          ].map(([k, v]) => (
            <div key={k} className="glass p-4">
              <div className="text-xs uppercase tracking-wider text-slate-500">{k}</div>
              <div className="mt-1 font-mono text-lg text-white">{v}</div>
            </div>
          ))}
        </Reveal>
      )}

      <section id="tips" className="mt-20 scroll-mt-24">
        <Reveal>
          <h2 className="text-2xl font-bold sm:text-3xl">Stay-safe checklist</h2>
        </Reveal>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {TIPS.map((t, i) => (
            <Reveal key={t} delay={i * 0.04}>
              <div className="glass flex h-full gap-3 p-4 text-sm text-slate-300">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" /> {t}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="extension" className="mt-20 scroll-mt-24">
        <Reveal>
          <div className="glass relative overflow-hidden p-6 sm:p-8">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <Puzzle className="h-7 w-7 text-violet-300" />
              <h2 className="text-2xl font-bold">Browser extension</h2>
            </div>
            <p className="relative mt-3 max-w-2xl text-slate-400">
              The PhishShield Chrome extension checks the page you’re on with one click, and lets you right-click any selected text or link to scan it.
            </p>
            <ol className="relative mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Download, t: 'Get the folder', d: 'Use the extension/ folder from the project repository.' },
                { icon: ToggleRight, t: 'Developer mode', d: 'Open chrome://extensions and enable Developer mode.' },
                { icon: FolderOpen, t: 'Load unpacked', d: 'Click “Load unpacked”, pick the folder, then set your API URL in the popup.' },
              ].map((s, i) => (
                <li key={s.t} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-xs text-violet-200">{i + 1}</span>
                    <s.icon className="h-4 w-4 text-violet-300" /> {s.t}
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>
    </Page>
  );
}
