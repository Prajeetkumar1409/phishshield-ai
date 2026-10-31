export default function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d="M32 4 8 13v17c0 15 10 26 24 30 14-4 24-15 24-30V13L32 4Z" fill="url(#logo-g)" />
      <path d="m22 32 7 7 13-14" fill="none" stroke="#05070f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
