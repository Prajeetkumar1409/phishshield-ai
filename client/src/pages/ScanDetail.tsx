import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Page from '../components/ui/Page';
import ResultView from '../components/result/ResultView';
import { ScanningState } from '../components/analyzer/ScanningState';
import { api } from '../lib/api';
import type { ScanResult } from '../lib/types';
import { TYPE_META } from '../lib/utils';

export default function ScanDetail() {
  const { id } = useParams();
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) api.scan(id).then(setScan).catch((e) => setError(e.message));
  }, [id]);

  return (
    <Page className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
      {error ? (
        <div className="glass mt-6 p-10 text-center text-slate-400">{error}</div>
      ) : scan ? (
        <>
          <div className="mb-6 mt-4">
            <h1 className="text-2xl font-bold">{TYPE_META[scan.type].label} scan</h1>
            <p className="text-sm text-slate-500">{new Date(scan.createdAt).toLocaleString()} {scan.input.sender && `· from ${scan.input.sender}`}</p>
          </div>
          <ResultView result={scan} />
        </>
      ) : (
        <div className="mt-6"><ScanningState /></div>
      )}
    </Page>
  );
}
