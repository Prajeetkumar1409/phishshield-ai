import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import Analyze from './pages/Analyze';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ui/ErrorBoundary';

// Chart-heavy pages are split into their own chunks.
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ScanDetail = lazy(() => import('./pages/ScanDetail'));
const Learn = lazy(() => import('./pages/Learn'));

function ScrollToTop() {
  const { pathname } = useLocation();
  // Block body: newer browsers return a Promise from scrollTo, which React would call as a cleanup.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <Layout>
      <ScrollToTop />
      <ErrorBoundary resetKey={location.pathname}>
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scan/:id" element={<ScanDetail />} />
              <Route path="/learn" element={<Learn />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
