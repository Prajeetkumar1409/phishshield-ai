import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { ScanLine, ShieldX, Gauge, Percent, Trash2, RefreshCw, Inbox, ArrowUpRight, ShieldCheck, ShieldAlert } from 'lucide-react';
import Page from '../components/ui/Page';
import CountUp from '../components/ui/CountUp';
import { api } from '../lib/api';
import type { ScanSummary, Stats, Verdict, ScanType } from '../lib/types';
import { TYPE_META, VERDICT_META, cn, timeAgo } from '../lib/utils';

// Chart palettes validated for dark surface, lightness band and colour-vision deficiency.
const VERDICT_CHART: Record<Verdict, string> = { safe: '#059669', suspicious: '#bf8a00', phishing: '#db2777' };
const TYPE_CHART: Record<ScanType, string> = { email: '#0891b2', sms: '#8b5cf6', url: '#ec4899', message: '#65a30d' };
const SURFACE = '#0d1324';
const AXIS = { stroke: '#64748b', fontSize: 11, tickLine: false, axisLine: false } as const;
const VERDICT_ICON = { safe: ShieldCheck, suspicious: ShieldAlert, phishing: ShieldX };

type TooltipPayload = { name: string; value: number; color?: string; payload?: { fill?: string } }[];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-ink-800/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label && <div className="mb-1 font-medium text-white">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color || p.payload?.fill }} />
          <span className="capitalize">{p.name}</span>
          <span className="ml-auto pl-4 font-mono text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className={cn('glass p-5', className)}>
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
      {children}
    </motion.section>
  );
}

function Kpi({ icon: Icon, label, value, suffix, accent, i }: { icon: typeof Gauge; label: string; value: number; suffix?: string; accent: string; i: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} className="glass glass-hover p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</span>
        <span className={cn('rounded-lg p-2', accent)}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-3 font-display text-3xl font-bold text-white">
        <CountUp value={value} suffix={suffix} />
      </div>
    </motion.div>
  );
}

function Empty() {
  return (
    <div className="glass flex flex-col items-center p-14 text-center">
      <Inbox className="h-12 w-12 text-slate-600" />
      <h3 className="mt-4 text-lg font-semibold">No scans yet</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-400">Run a few scans in the analyzer and your threat analytics will appear here.</p>
      <Link to="/analyze" className="btn-primary mt-6">Start scanning</Link>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [filter, setFilter] = useState<Verdict | ''>('');
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([api.stats(), api.history({ limit: 25, verdict: filter || undefined })]);
      setStats(s);
      setScans(h.items);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    await api.deleteScan(id).catch((e) => toast.error(e.message));
    load();
  };
  const clearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    await api.clearHistory();
    setConfirmClear(false);
    toast.success('History cleared');
    load();
  };

  const pie = stats ? (Object.keys(stats.byVerdict) as Verdict[]).map((v) => ({ name: VERDICT_META[v].label, value: stats.byVerdict[v], fill: VERDICT_CHART[v] })).filter((d) => d.value > 0) : [];
  const types = stats ? (Object.keys(stats.byType) as ScanType[]).map((t) => ({ name: TYPE_META[t].label, value: stats.byType[t], fill: TYPE_CHART[t] })) : [];
  const timeline = stats?.timeline.map((d) => ({ ...d, label: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) })) ?? [];
  const phishRate = stats?.total ? Math.round((stats.byVerdict.phishing / stats.total) * 100) : 0;

  return (
    <Page className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="section-label">Threat dashboard</span>
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Your threat landscape</h1>
          <p className="mt-2 text-slate-400">Analytics across every scan saved to history.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost !py-2 text-sm"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh</button>
          {!!stats?.total && (
            <button onClick={clearAll} className={cn('btn-ghost !py-2 text-sm', confirmClear && '!border-rose-400/40 !bg-rose-500/15 !text-rose-200')}>
              <Trash2 className="h-4 w-4" /> {confirmClear ? 'Click again to confirm' : 'Clear history'}
            </button>
          )}
        </div>
      </div>

      {!loading && stats && stats.total === 0 ? (
        <Empty />
      ) : (
        stats && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Kpi i={0} icon={ScanLine} label="Total scans" value={stats.total} accent="bg-cyan-400/10 text-cyan-300" />
              <Kpi i={1} icon={ShieldX} label="Threats flagged" value={stats.threatsBlocked} accent="bg-rose-400/10 text-rose-300" />
              <Kpi i={2} icon={Gauge} label="Average risk" value={stats.averageRisk} accent="bg-amber-400/10 text-amber-300" />
              <Kpi i={3} icon={Percent} label="Phishing rate" value={phishRate} suffix="%" accent="bg-violet-400/10 text-violet-300" />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
              <Card title="Scans · last 14 days" className="lg:col-span-2">
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={timeline} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap="28%">
                      <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={16} />
                      <YAxis {...AXIS} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} formatter={(v: string) => <span className="capitalize text-slate-400">{v}</span>} />
                      {(['safe', 'suspicious', 'phishing'] as Verdict[]).map((v, i, arr) => (
                        <Bar key={v} dataKey={v} stackId="a" fill={VERDICT_CHART[v]} stroke={SURFACE} strokeWidth={2} radius={i === arr.length - 1 ? [4, 4, 0, 0] : 0} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Verdicts">
                <div className="relative h-56">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={pie} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="90%" paddingAngle={2} stroke={SURFACE} strokeWidth={2}>
                        {pie.map((d) => <Cell key={d.name} fill={d.fill} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-3xl font-bold text-white">{stats.total}</span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500">scans</span>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {(Object.keys(stats.byVerdict) as Verdict[]).map((v) => {
                    const Icon = VERDICT_ICON[v];
                    return (
                      <li key={v} className="flex items-center gap-2 text-sm">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: VERDICT_CHART[v] }} />
                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-slate-300">{VERDICT_META[v].label}</span>
                        <span className="ml-auto font-mono text-slate-400">{stats.byVerdict[v]}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Scans by channel">
                <div className="h-56">
                  <ResponsiveContainer>
                    <BarChart data={types} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
                      <XAxis type="number" hide allowDecimals={false} />
                      <YAxis type="category" dataKey="name" {...AXIS} width={90} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar dataKey="value" name="scans" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#94a3b8', fontSize: 11 }}>
                        {types.map((d) => <Cell key={d.name} fill={d.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Most frequent indicators">
                {stats.topSignals.length ? (
                  <ul className="space-y-3">
                    {stats.topSignals.map((s) => (
                      <li key={s.name} className="group" title={`${s.name}: ${s.count}`}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="truncate text-slate-300">{s.name}</span>
                          <span className="font-mono text-slate-400">{s.count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/5">
                          <motion.div
                            className="h-full rounded-full bg-[#0891b2] group-hover:brightness-125"
                            initial={{ width: 0 }}
                            animate={{ width: `${(s.count / stats.topSignals[0].count) * 100}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No indicators recorded yet.</p>
                )}
              </Card>
            </div>

            <Card title="Recent scans">
              <div className="mb-4 flex flex-wrap gap-2">
                {(['', 'phishing', 'suspicious', 'safe'] as const).map((v) => (
                  <button
                    key={v || 'all'}
                    onClick={() => setFilter(v)}
                    className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition', filter === v ? 'bg-white/10 text-white ring-1 ring-white/15' : 'text-slate-400 hover:text-white')}
                  >
                    {v ? VERDICT_META[v].label : 'All'}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-slate-500">
                    <tr className="border-b border-white/5">
                      <th className="py-2.5 pr-4 font-medium">Verdict</th>
                      <th className="py-2.5 pr-4 font-medium">Channel</th>
                      <th className="py-2.5 pr-4 font-medium">Content</th>
                      <th className="py-2.5 pr-4 font-medium">Risk</th>
                      <th className="py-2.5 pr-4 font-medium">When</th>
                      <th className="py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {scans.map((s) => {
                      const m = VERDICT_META[s.verdict];
                      const TIcon = TYPE_META[s.type].icon;
                      return (
                        <tr key={s.id} className="group border-b border-white/5 transition hover:bg-white/[0.02]">
                          <td className="py-3 pr-4">
                            <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold ring-1', m.bg, m.text, m.ring)}>{m.label}</span>
                          </td>
                          <td className="py-3 pr-4 text-slate-400"><span className="inline-flex items-center gap-1.5"><TIcon className="h-4 w-4" /> {TYPE_META[s.type].label}</span></td>
                          <td className="max-w-xs truncate py-3 pr-4 text-slate-300">{s.preview}</td>
                          <td className="py-3 pr-4 font-mono text-white">{s.riskScore}</td>
                          <td className="whitespace-nowrap py-3 pr-4 text-slate-500">{timeAgo(s.createdAt)}</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-1 opacity-60 transition group-hover:opacity-100">
                              <Link to={`/scan/${s.id}`} className="rounded-md p-1.5 hover:bg-white/10" aria-label="Open"><ArrowUpRight className="h-4 w-4" /></Link>
                              <button onClick={() => remove(s.id)} className="rounded-md p-1.5 hover:bg-rose-500/15 hover:text-rose-300" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!scans.length && (
                      <tr><td colSpan={6} className="py-8 text-center text-slate-500">No scans match this filter.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )
      )}
    </Page>
  );
}
