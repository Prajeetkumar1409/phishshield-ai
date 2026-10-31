import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Logo from '../ui/Logo';

export default function Footer() {
  return (
    <footer className="relative mt-24 border-t border-white/10 bg-ink-950/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2.5">
            <Logo className="h-7 w-7" />
            <span className="font-display text-lg font-bold text-white">PhishShield AI</span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
            Explainable AI that detects phishing emails, scam SMS, malicious links and social-engineering tactics — before you click.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> All analysis runs on our own models — your messages are never sent to third parties.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li><Link className="hover:text-white" to="/analyze">Analyzer</Link></li>
            <li><Link className="hover:text-white" to="/dashboard">Threat dashboard</Link></li>
            <li><Link className="hover:text-white" to="/learn#extension">Browser extension</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Resources</h4>
          <ul className="mt-3 space-y-2 text-sm text-slate-400">
            <li><Link className="hover:text-white" to="/learn">How the AI works</Link></li>
            <li><Link className="hover:text-white" to="/learn#tips">Stay-safe checklist</Link></li>
            <li><Link className="hover:text-white" to="/learn#models">Model details</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} PhishShield AI · Built for safer inboxes
      </div>
    </footer>
  );
}
