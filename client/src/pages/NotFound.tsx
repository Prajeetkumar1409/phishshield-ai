import { Link } from 'react-router-dom';
import { ShieldQuestion } from 'lucide-react';
import Page from '../components/ui/Page';

export default function NotFound() {
  return (
    <Page className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <ShieldQuestion className="h-16 w-16 text-cyan-300" />
      <h1 className="mt-6 text-5xl font-bold">404</h1>
      <p className="mt-3 text-slate-400">This page doesn’t exist — but at least it isn’t a phishing site.</p>
      <Link to="/" className="btn-primary mt-8">Back home</Link>
    </Page>
  );
}
