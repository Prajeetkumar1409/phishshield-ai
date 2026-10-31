import type { Severity, Verdict, ScanType } from './types';
import { Mail, MessageSquare, Link2, MessagesSquare, type LucideIcon } from 'lucide-react';

export { clsx as cn } from 'clsx';

export const VERDICT_META: Record<Verdict, { label: string; color: string; text: string; bg: string; ring: string; hex: string }> = {
  safe: { label: 'Safe', color: 'emerald', text: 'text-emerald-300', bg: 'bg-emerald-400/10', ring: 'ring-emerald-400/30', hex: '#34d399' },
  suspicious: { label: 'Suspicious', color: 'amber', text: 'text-amber-300', bg: 'bg-amber-400/10', ring: 'ring-amber-400/30', hex: '#fbbf24' },
  phishing: { label: 'Phishing', color: 'rose', text: 'text-rose-300', bg: 'bg-rose-500/10', ring: 'ring-rose-400/30', hex: '#fb7185' },
};

export const SEVERITY_META: Record<Severity, { label: string; cls: string; dot: string }> = {
  critical: { label: 'Critical', cls: 'bg-rose-500/15 text-rose-300 ring-rose-400/30', dot: 'bg-rose-400' },
  high: { label: 'High', cls: 'bg-orange-500/15 text-orange-300 ring-orange-400/30', dot: 'bg-orange-400' },
  medium: { label: 'Medium', cls: 'bg-amber-500/15 text-amber-300 ring-amber-400/30', dot: 'bg-amber-400' },
  low: { label: 'Low', cls: 'bg-sky-500/15 text-sky-300 ring-sky-400/30', dot: 'bg-sky-400' },
  info: { label: 'Info', cls: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30', dot: 'bg-emerald-400' },
};

export const TYPE_META: Record<ScanType, { label: string; icon: LucideIcon; placeholder: string }> = {
  email: { label: 'Email', icon: Mail, placeholder: 'Paste the email body here (or the full raw email including From:/Reply-To: headers)…' },
  sms: { label: 'SMS', icon: MessageSquare, placeholder: 'Paste the text message here…' },
  url: { label: 'URL', icon: Link2, placeholder: 'Paste one or more URLs (one per line)…' },
  message: { label: 'Chat / Social', icon: MessagesSquare, placeholder: 'Paste a WhatsApp, Telegram, Instagram or any chat message…' },
};

export const HIGHLIGHT_CLS: Record<string, string> = {
  url: 'bg-rose-500/20 text-rose-200 decoration-rose-400',
  impersonation: 'bg-fuchsia-500/20 text-fuchsia-200 decoration-fuchsia-400',
  urgency: 'bg-amber-500/20 text-amber-200 decoration-amber-400',
  threat: 'bg-orange-500/20 text-orange-200 decoration-orange-400',
  credentials: 'bg-red-500/25 text-red-200 decoration-red-400',
  financial: 'bg-yellow-500/20 text-yellow-200 decoration-yellow-400',
  reward: 'bg-lime-500/15 text-lime-200 decoration-lime-400',
  secrecy: 'bg-violet-500/20 text-violet-200 decoration-violet-400',
  authority: 'bg-sky-500/20 text-sky-200 decoration-sky-400',
  action: 'bg-cyan-500/20 text-cyan-200 decoration-cyan-400',
  pretext: 'bg-pink-500/20 text-pink-200 decoration-pink-400',
};

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
