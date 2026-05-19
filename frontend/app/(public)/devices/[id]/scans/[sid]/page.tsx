'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Loader2, AlertCircle, ArrowLeft, Copy,
  CheckCircle2, XCircle, Shield, Cpu, HardDrive, Battery, Monitor, Activity,
  Sun, Moon,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer,
} from 'recharts';
import { useTheme } from '@/contexts/ThemeContext';
import { Scan } from '@/types/probe';

// ─── Emphasis system ──────────────────────────────────────────────────────────

type Emphasis = 'high' | 'medium' | 'low' | 'mono';

function valueClass(e?: Emphasis) {
  switch (e) {
    case 'high':   return 'text-slate-900 font-bold text-[15px]';
    case 'medium': return 'text-slate-800 font-semibold text-sm';
    case 'mono':   return 'text-slate-700 font-mono text-xs font-medium';
    case 'low':    return 'text-slate-400 text-sm italic';
    default:       return 'text-slate-700 text-sm font-medium';
  }
}

function formatDisplayValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === 'string' && typeof value[1] === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value[1])) {
      return value[0];
    }
    return value.filter(v => v != null).map(String).join(', ');
  }
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

// ─── DataTable ────────────────────────────────────────────────────────────────
// Label col auto-shrinks to content. Value takes rest. No fixed widths.

type Row = { label: string; value?: unknown; emphasis?: Emphasis };

function DataTable({ rows }: { rows: Row[] }) {
  return (
    <table className="border-collapse w-full" style={{ tableLayout: 'auto' }}>
      <tbody>
        {rows.map(({ label, value, emphasis }, i) => {
          const displayValue = formatDisplayValue(value);
          return (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-slate-800/80 transition-colors">
              <td className="py-2 pl-4 pr-5 align-middle whitespace-nowrap">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 select-none">
                  {label}
                </span>
              </td>
              <td className={`py-2 pr-3 align-middle ${valueClass(emphasis)}`}>
                {displayValue
                  ? displayValue
                  : <span className="text-slate-300 dark:text-slate-500 font-normal text-sm not-italic">N/A</span>}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── CheckTable ───────────────────────────────────────────────────────────────

type Check = { name?: string; passed: boolean; weight?: number; detail?: string };

function CheckTable({ checks }: { checks: Check[] }) {
  const sorted = [...checks].sort((a, b) => {
    const w = (b.weight ?? 0) - (a.weight ?? 0);
    return w !== 0 ? w : (a.passed ? 1 : 0) - (b.passed ? 1 : 0);
  });

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse w-full" style={{ tableLayout: 'auto' }}>
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            {['Status', 'Check', 'Weight', 'Detail'].map(h => (
              <th key={h} className="py-2 px-3 first:pl-4 last:pr-4 text-left text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((c, i) => (
            <tr key={i}
              className={`border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors
                ${!c.passed ? 'bg-red-50/60 dark:bg-red-500/10 hover:bg-red-50 dark:hover:bg-red-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <td className="py-2.5 pl-4 pr-3 whitespace-nowrap">
                {c.passed
                  ? <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[13px]"><CheckCircle2 className="w-3.5 h-3.5" /> Pass</span>
                  : <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[13px]"><XCircle className="w-3.5 h-3.5" /> Fail</span>}
              </td>
              <td className={`py-2.5 px-3 whitespace-nowrap text-sm ${!c.passed ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                {c.name || 'Unnamed'}
              </td>
              <td className="py-2.5 px-3 whitespace-nowrap">
                <span className={`inline-block px-2 py-0.5 rounded text-xs font-black font-mono border
                  ${(c.weight ?? 0) >= 3 ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : (c.weight ?? 0) === 2 ? 'bg-blue-100 text-blue-700 border-blue-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'}`}>
                  ×{c.weight ?? '—'}
                </span>
              </td>
              <td className={`py-2.5 px-3 pr-4 font-mono text-xs ${!c.passed ? 'text-red-700 font-semibold' : 'text-slate-600'}`}>
                {c.detail || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, icon, children, className = '' }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm flex flex-col ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <span className="text-[var(--brand)]">{icon}</span>
        <span className="text-[10.5px] font-black uppercase tracking-[0.2em] text-[var(--brand)]">{title}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────

function ScoreRing({ pct, rating }: { pct?: number; rating?: string }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ - ((typeof pct === 'number' ? pct : 0) / 100) * circ;
  const color =
    rating === 'EXCELLENT' ? '#15803d' :
    rating === 'GOOD'      ? '#1d4ed8' :
    rating === 'POOR'      ? '#d97706' :
    rating === 'VERY POOR' ? '#dc2626' : '#475569';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="106" height="106" className="-rotate-90">
        <circle cx="53" cy="53" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
        <circle cx="53" cy="53" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-[20px] font-black font-mono leading-none" style={{ color }}>{pct ?? '—'}%</div>
        <div className="text-[8.5px] font-black uppercase tracking-widest mt-0.5 text-white/50">{rating || '—'}</div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScanDetailPage() {
  const params   = useParams();
  const deviceId = params.id  as string;
  const scanId   = params.sid as string;
  const { theme, toggleTheme } = useTheme();

  const [scan, setScan]       = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  const auditUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/devices/${deviceId}/scans/${scanId}` : '';

  const copy = async () => {
    try { await navigator.clipboard.writeText(auditUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!deviceId || !scanId) return;
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = await fetch(`/api/devices/${deviceId}/scans/${scanId}`);
        if (!res.ok) throw new Error('Scan not found');
        setScan(await res.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load scan');
      } finally { setLoading(false); }
    })();
  }, [deviceId, scanId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      <p className="text-[11px] font-mono text-slate-400 tracking-widest uppercase">Loading diagnostic report…</p>
    </div>
  );

  if (error || !scan) return (
    <div className="p-6">
      <Link href={`/devices/${deviceId}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to device
      </Link>
      <div className="flex gap-3 p-4 rounded-xl border border-red-200 bg-red-50">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-red-900 text-sm">Error loading scan</p>
          <p className="text-red-700 text-sm mt-0.5">{error || 'Scan not found'}</p>
        </div>
      </div>
    </div>
  );

  // ── derive ──
  const score        = scan.data?.score;
  const system       = scan.data?.system ?? {};
  const modelName    = [system.manufacturer, system.model].filter(Boolean).join(' ') || 'Unknown Device';
  const machineId    = system.machine_id || scan.data?.device_id || deviceId;
  const checks       = score?.checks ?? [];
  const passedChecks = checks.filter(c => c.passed).length;
  const failedChecks = checks.length - passedChecks;
  const earned       = passedChecks;
  const total        = checks.length;
  const reportDate   = scan.data?.timestamp
    ? new Date(scan.data.timestamp).toLocaleString()
    : new Date(scan.created_at).toLocaleString();
  const securityHash = (scan.data?.security?.hash as string | undefined)
    || (scan.data?.hmac as string | undefined)
    || scan.id
    || scan.scan_id
    || '';
  const hashPrefix = securityHash ? String(securityHash).slice(0, 8).toUpperCase() : 'UNKNOWN';

  const getNum = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
    return 0;
  };

  const diskInfo    = scan.data?.disks ?? {};
  const primaryDisk = (diskInfo.disks ?? [])[0] ?? {};
  const sysApps    = getNum(diskInfo.system_apps_gb   ?? diskInfo.system_apps   ?? diskInfo.systemApps);
  const custom     = getNum(diskInfo.custom_gb        ?? diskInfo.custom_apps_gb ?? diskInfo.customBuilt ?? diskInfo.custom);
  const downloaded = getNum(diskInfo.downloaded_gb    ?? diskInfo.downloaded    ?? diskInfo.downloads);
  const freeSpace  = getNum(diskInfo.free_gb ?? diskInfo.freeSpace ?? primaryDisk.free_gb ??
    (primaryDisk.total_gb ? primaryDisk.total_gb - getNum(primaryDisk.used_gb) : 0));

  const diskRadar = [
    { name: 'System',    value: sysApps },
    { name: 'Custom',    value: custom },
    { name: 'Downloads', value: downloaded },
    { name: 'Free',      value: freeSpace },
  ];

  const fmt = (items?: string[]) => items?.length ? items.join(', ') : undefined;

  const batteryRatingRaw = scan.data?.battery?.rating;
  const batteryRating = Array.isArray(batteryRatingRaw) ? batteryRatingRaw[0] : batteryRatingRaw;
  const aiBullets = batteryRating === 'VERY POOR'
    ? [
      'Replace the battery before final audit handoff.',
      'Record a fresh health scan after replacement.',
      'Flag this device for urgent repair review.',
    ]
    : batteryRating === 'POOR'
      ? [
        'Confirm stability under load.',
        'Schedule service before resale.',
        'Verify battery calibration and capacity.',
      ]
      : freeSpace < 20
        ? [
          'Clear temporary files to free space.',
          'Verify no data corruption is present.',
          'Re-run the audit after cleanup.',
        ]
        : [
          'Review firmware and battery condition.',
          'Validate machine specifics before issuing report.',
          'Keep this audit report readily available for repair staff.',
        ];

  const hasBattery    = scan.data?.battery    && Object.keys(scan.data.battery).length > 0;
  const hasGpu        = scan.data?.gpu        && Object.keys(scan.data.gpu).length > 0;
  const hasCpuThrottle = scan.data?.cpu_throttle && Object.keys(scan.data.cpu_throttle).length > 0;

  // Collect small side-by-side panels: battery, gpu, cpu_throttle
  // We tile them in a responsive grid so 1→2→3 across breakpoints
  const sidePanels: { title: string; icon: React.ReactNode; rows: Row[] }[] = [
    ...(hasBattery ? [{
      title: 'Battery', icon: <Battery className="w-3.5 h-3.5" />,
      rows: Object.entries(scan.data!.battery!).map(([k, v]) => ({
        label: k.replace(/_/g, ' '), value: v, emphasis: 'medium' as Emphasis,
      })),
    }] : []),
    ...(hasGpu ? [{
      title: 'GPU', icon: <Monitor className="w-3.5 h-3.5" />,
      rows: Object.entries(scan.data!.gpu!).map(([k, v]) => ({
        label: k.replace(/_/g, ' '), value: v, emphasis: 'medium' as Emphasis,
      })),
    }] : []),
    ...(hasCpuThrottle ? [{
      title: 'CPU Throttle', icon: <Cpu className="w-3.5 h-3.5" />,
      rows: Object.entries(scan.data!.cpu_throttle!).map(([k, v]) => ({
        label: k.replace(/_/g, ' '), value: v, emphasis: 'medium' as Emphasis,
      })),
    }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">

      {/* ── sticky nav ── */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm dark:bg-slate-950/95 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between gap-4">
        <Link href={`/devices/${deviceId}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to device
        </Link>
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--brand)] hidden sm:block">
          NextBit Probe · Diagnostic Report
        </span>
        <div className="flex items-center gap-2">
          {toggleTheme && (
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-[var(--brand)] hover:text-[var(--brand)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {theme === 'dark'
                ? <Sun className="w-4 h-4" />
                : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          )}
          <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded dark:bg-slate-900 dark:text-slate-300">
            {scan?.data?.probe_version ? `v${scan.data.probe_version}` : '—'}
          </span>
        </div>
      </div>

      {/* ── hero ── */}
      <div className="bg-slate-900">
        <div className="px-6 py-6 md:py-8 flex flex-col sm:flex-row sm:items-center gap-6 max-w-none">

          {/* left: report identity */}
          <div className="flex-1 min-w-0">
            {/* eyebrow */}
            <p className="text-[9.5px] font-black uppercase tracking-[0.28em] text-sky-300 mb-2">
              NextBit Verified™ | Hardware Health & Identity Certificate
            </p>
            {/* model name — large, prominent */}
            <h1 className="text-3xl sm:text-4xl font-black text-[var(--brand)] leading-tight tracking-tight">
              {modelName}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-200">
              Scan ID: <span className="font-mono text-slate-100">{scan.scan_id}</span>
              <span className="mx-2 text-slate-400">|</span>
              Security Hash: <span className="font-mono text-slate-100">{hashPrefix}</span>
            </p>
            {/* machine id — monospaced, clearly readable */}
            <p className="mt-2 font-mono text-sm font-semibold text-slate-300 bg-slate-800 inline-block px-2 py-0.5 rounded">
              {machineId}
            </p>
            {/* meta row */}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2.5 text-[11px] font-mono text-slate-400">
              <span>{reportDate}</span>
              {system.os_name && <><span>·</span><span>{system.os_name}</span></>}
              {system.serial  && <><span>·</span><span>S/N {system.serial}</span></>}
            </div>
          </div>

          {/* right: score block */}
          <div className="flex items-center gap-5 flex-shrink-0 sm:border-l sm:border-slate-700 sm:pl-6">
            <ScoreRing pct={score?.pct} rating={score?.overall} />
            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Score</p>
                <p className="text-2xl font-black font-mono text-[var(--brand)] leading-none">
                  {earned}<span className="text-slate-900 text-base font-mono ml-0.5">/{total}</span>
                </p>
              </div>
              <div className="flex gap-5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">Passed</p>
                  <p className="text-4xl font-black font-mono text-emerald-900 leading-none">{passedChecks}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-0.5">Failed</p>
                  <p className="text-4xl font-black font-mono text-red-400 leading-none">{failedChecks}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── body: full-width, tight gutters ── */}
      <div className="px-4 sm:px-6 py-5 space-y-4">

        {/* ── System ── */}
        <Section title="System" icon={<Cpu className="w-3.5 h-3.5" />}>
          <div className="relative overflow-hidden">
            <div
              draggable
              onDragStart={e => e.dataTransfer.setData('text/plain', 'AI Recommendation')}
              className="hidden lg:block absolute right-4 top-4 w-[420px] rounded-[32px] border border-blue-300/30 bg-slate-950/95 p-5 shadow-[0_28px_60px_-30px_rgba(15,23,42,0.9)] text-sm text-slate-100 cursor-grab"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300 mb-3">AI Recommendation</p>
              <ul className="space-y-2 list-disc pl-4 text-slate-100">
                {aiBullets.map((line, index) => (
                  <li key={index} className="leading-6">
                    <span className="font-semibold text-sky-200">{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-slate-400">Drag this note to keep it visible while you review repairs.</p>
            </div>
            <div className="lg:pr-[460px]">
              <DataTable rows={[
                { label: 'Manufacturer / Model', value: [system.manufacturer, system.model].filter(Boolean).join(' / ') || undefined, emphasis: 'high' },
                { label: 'CPU',             value: system.cpu,                                                                          emphasis: 'high' },
                { label: 'RAM',             value: system.ram_gb ? `${system.ram_gb} GB` : undefined,                                   emphasis: 'high' },
                { label: 'OS',              value: system.os_name,                                                                      emphasis: 'medium' },
                { label: 'Cores / Threads', value: `${system.cores ?? system.cpu_cores ?? 'N/A'} / ${system.threads ?? system.cpu_threads ?? 'N/A'}`, emphasis: 'medium' },
                { label: 'Serial Number',   value: system.serial,        emphasis: 'mono' },
                { label: 'Machine ID',      value: system.machine_id,    emphasis: 'mono' },
                { label: 'MAC Addresses',   value: fmt(system.mac_addresses), emphasis: 'mono' },
                { label: 'BIOS Date',       value: system.bios_date,     emphasis: 'mono' },
                { label: 'BIOS Version',    value: system.bios_version,  emphasis: 'mono' },
                { label: 'BIOS Age',        value: system.bios_age,      emphasis: 'low' },
                { label: 'Last Boot',       value: system.last_boot,     emphasis: 'mono' },
              ]} />
            </div>
            <div className="mt-4 lg:hidden rounded-3xl border border-blue-300/20 bg-slate-950/95 p-5 text-sm text-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-300 mb-3">AI Recommendation</p>
              <ul className="space-y-2 list-disc pl-4 text-slate-100">
                {aiBullets.map((line, index) => (
                  <li key={index} className="leading-6">
                    <span className="font-semibold text-sky-200">{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-slate-400">Drag this note to keep it visible while you review repairs.</p>
            </div>
          </div>
        </Section>

        {/* ── Check Results ── */}
        <Section title="Check Results" icon={<Shield className="w-3.5 h-3.5" />}>
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-slate-100">
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {passedChecks} passed
            </span>
            <span className="text-slate-300 text-xs">·</span>
            <span className="inline-flex items-center gap-1 text-red-600 font-bold text-xs">
              <XCircle className="w-3.5 h-3.5 text-red-500" /> {failedChecks} failed
            </span>
          </div>
          {checks.length > 0
            ? <CheckTable checks={checks} />
            : <p className="text-sm text-slate-500 p-4">No check results available.</p>}
        </Section>

        {/* ── Small panels tiled side-by-side ── */}
        {/* 1 panel → full width, 2 → 2-col, 3 → 3-col on lg */}
        {sidePanels.length > 0 && (
          <div className={`grid gap-4
            ${sidePanels.length === 1 ? 'grid-cols-1' : ''}
            ${sidePanels.length === 2 ? 'grid-cols-1 md:grid-cols-2' : ''}
            ${sidePanels.length === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : ''}
          `}>
            {sidePanels.map(p => (
              <Section key={p.title} title={p.title} icon={p.icon}>
                <DataTable rows={p.rows} />
              </Section>
            ))}
          </div>
        )}

        {/* ── Disk Summary ── */}
        <Section title="Disk Summary" icon={<HardDrive className="w-3.5 h-3.5" />}>
          {/* table + chart side by side on md+ */}
          <div className="flex flex-col md:flex-row">
            <div className="flex-1">
              <DataTable rows={[
                { label: 'Free Space',     value: `${freeSpace.toFixed(2)} GB`,  emphasis: 'high' },
                { label: 'System Apps',    value: `${sysApps.toFixed(2)} GB`,    emphasis: 'medium' },
                { label: 'Downloaded',     value: `${downloaded.toFixed(2)} GB`, emphasis: 'medium' },
                { label: 'Custom / Built', value: `${custom.toFixed(2)} GB`,     emphasis: 'medium' },
              ]} />
            </div>
            <div className="md:w-64 lg:w-80 border-t md:border-t-0 md:border-l border-slate-100 p-3 flex flex-col justify-center">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 mb-1 text-center">Capacity Distribution</p>
              <div className="h-[190px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={diskRadar} outerRadius="70%">
                    <PolarGrid stroke="rgba(148,163,184,0.25)" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, Math.max(100, sysApps, custom, downloaded, freeSpace)]}
                      tick={false} axisLine={false}
                    />
                    <Radar dataKey="value" stroke="#1e40af" fill="#3b82f6" fillOpacity={0.18} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Audit URL ── */}
        <Section title="Audit URL" icon={<Activity className="w-3.5 h-3.5" />}>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 whitespace-nowrap">Report URL</span>
            <a
              href={auditUrl} target="_blank" rel="noreferrer"
              className="flex-1 min-w-0 font-mono text-xs text-blue-700 font-semibold hover:text-blue-900 hover:underline truncate"
            >
              {auditUrl || 'Loading…'}
            </a>
            <button
              onClick={copy}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 px-4 pb-3">
            Embed this URL in a QR code for device audit scanning.
          </p>
        </Section>

      </div>
    </div>
  );
}