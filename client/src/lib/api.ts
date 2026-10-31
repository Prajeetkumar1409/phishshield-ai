import type { AnalyzeInput, ScanResult, ScanSummary, Stats } from './types';

// Same-origin in production (API serves the SPA); Vite proxies /api in dev.
// Set VITE_API_URL when the frontend is hosted separately (e.g. Vercel + Render).
const BASE = `${(import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')}/api/v1`;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ApiError('Cannot reach the PhishShield API. Is the server running?', 0);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.message || `Request failed (${res.status})`, res.status);
  return body as T;
}

export const api = {
  analyze: (input: AnalyzeInput) => request<ScanResult>('/analyze', { method: 'POST', body: JSON.stringify(input) }),
  history: (params: { limit?: number; verdict?: string; type?: string } = {}) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][]);
    return request<{ total: number; items: ScanSummary[] }>(`/history?${q}`);
  },
  scan: (id: string) => request<ScanResult>(`/history/${id}`),
  deleteScan: (id: string) => request<void>(`/history/${id}`, { method: 'DELETE' }),
  clearHistory: () => request<void>('/history', { method: 'DELETE' }),
  stats: () => request<Stats>('/stats'),
  models: () => request<Record<string, unknown>>('/models'),
};
