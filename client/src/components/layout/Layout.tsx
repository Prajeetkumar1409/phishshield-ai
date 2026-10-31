import type { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[900px]" aria-hidden />
      <Navbar />
      <div className="relative flex-1">{children}</div>
      <Footer />
    </div>
  );
}
