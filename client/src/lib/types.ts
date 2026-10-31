export type ScanType = 'email' | 'sms' | 'url' | 'message';
export type Verdict = 'safe' | 'suspicious' | 'phishing';
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface Signal {
  category: 'url' | 'nlp' | 'social' | 'impersonation' | 'anomaly';
  severity: Severity;
  title: string;
  detail: string;
}

export interface Highlight {
  start: number;
  end: number;
  category: string;
  label: string;
}

export interface UrlReport {
  url: string;
  host: string;
  domain: string;
  protocol: string;
  riskScore: number;
  verdict: Verdict;
  mlProbability: number;
  anomalyScore: number;
  ruleScore: number;
  impersonating: string | null;
  reasons: { severity: Severity; title: string; detail: string }[];
  features: Record<string, number>;
}

export interface ScanResult {
  id: string;
  type: ScanType;
  createdAt: string;
  riskScore: number;
  verdict: Verdict;
  confidence: number;
  summary: string;
  breakdown: {
    nlp: number | null;
    url: number | null;
    impersonation: number;
    socialEngineering: number | null;
    anomaly: number;
  };
  signals: Signal[];
  highlights: Highlight[];
  urls: UrlReport[];
  nlp: { probability: number; topTerms: { term: string; weight: number }[]; coverage: number } | null;
  tactics: string[];
  claimedBrands: string[];
  recommendations: string[];
  input: { content: string; sender: string | null; subject: string | null };
  processingMs: number;
}

export interface ScanSummary {
  id: string;
  type: ScanType;
  createdAt: string;
  riskScore: number;
  verdict: Verdict;
  summary: string;
  preview: string;
  signalCount: number;
}

export interface Stats {
  total: number;
  threatsBlocked: number;
  averageRisk: number;
  byVerdict: Record<Verdict, number>;
  byType: Record<ScanType, number>;
  timeline: { date: string; safe: number; suspicious: number; phishing: number }[];
  topSignals: { name: string; count: number }[];
}

export interface AnalyzeInput {
  type: ScanType;
  content: string;
  sender?: string;
  subject?: string;
  save?: boolean;
}
