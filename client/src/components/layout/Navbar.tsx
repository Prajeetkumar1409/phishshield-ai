import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, ScanSearch } from 'lucide-react';
import Logo from '../ui/Logo';
import { cn } from '../../lib/utils';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/analyze', label: 'Analyzer' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/learn', label: 'Learn' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 transition-all duration-300',
        scrolled ? 'border-b border-white/10 bg-ink-950/75 backdrop-blur-xl' : 'border-b border-transparent'
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <Logo className="h-8 w-8 transition-transform duration-500 group-hover:rotate-[360deg]" />
          <span className="font-display text-lg font-bold text-white">
            PhishShield<span className="text-gradient"> AI</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className="relative rounded-full px-4 py-1.5 text-sm font-medium">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-white/10" transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }} />
                  )}
                  <span className={cn('relative transition-colors', isActive ? 'text-white' : 'text-slate-400 hover:text-white')}>{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link to="/analyze" className="btn-primary hidden !py-2 text-sm sm:inline-flex">
            <ScanSearch className="h-4 w-4" /> Scan now
          </Link>
          <button className="rounded-lg p-2 text-slate-300 hover:bg-white/10 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-white/10 bg-ink-950/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === '/'}
                  className={({ isActive }) => cn('rounded-lg px-3 py-2.5 text-sm font-medium', isActive ? 'bg-white/10 text-white' : 'text-slate-400')}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
