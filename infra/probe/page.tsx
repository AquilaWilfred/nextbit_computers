'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, ArrowLeft, Copy } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Scan } from '@/types/probe';

export default function ScanDetailPage() {
  const params = useParams();
  const deviceId = params.id as string;
  const scanId = params.sid as string;

  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auditUrl = typeof window !== 'undefined' ? `${window.location.origin}/devices/${deviceId}/scans/${scanId}` : '';
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(auditUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  useEffect(() => {
    const fetchScan = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/devices/${deviceId}/scans/${scanId}`);
        if (!response.ok) {
          throw new Error('Scan not found');
        }
        const data = await response.json();
        setScan(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scan');
      } finally {
        setLoading(false);
      }
    };

    if (deviceId && scanId) {
      fetchScan();
    }
  }, [deviceId, scanId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <p className="text-gray-500">Loading scan details...</p>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="p-6">
        <Link href={`/devices/${deviceId}`} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to device
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error loading scan</p>
              <p className="text-red-700 text-sm">{error || 'Scan not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const score = scan.data?.score;
  const system = scan.data?.system ?? {};
  const deviceName = system.machine_id || system.model || scan.data?.device_id || deviceId;
  const checks = score?.checks ?? [];
  const passedChecks = checks.filter((check) => check.passed).length;
  const failedChecks = checks.length - passedChecks;
  const earned = typeof score?.earned === 'number' ? score.earned : passedChecks;
  const total = typeof score?.total === 'number' ? score.total : checks.length;
  const reportDate = scan.data?.timestamp ? new Date(scan.data.timestamp).toLocaleString() : new Date(scan.created_at).toLocaleString();

  const getTextColor = (rating?: string) => {
    switch (rating) {
      case 'EXCELLENT': return 'text-green-600';
      case 'GOOD': return 'text-blue-600';
      case 'POOR': return 'text-amber-600';
      case 'VERY POOR': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  const getNumberValue = (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
    return 0;
  };

  const diskInfo = scan.data?.disks ?? {};
  const primaryDisk = (diskInfo.disks ?? [])[0] ?? {};
  const systemApps = getNumberValue(diskInfo.system_apps_gb ?? diskInfo.system_apps ?? diskInfo.systemApps);
  const customBuilt = getNumberValue(diskInfo.custom_gb ?? diskInfo.custom_apps_gb ?? diskInfo.customBuilt ?? diskInfo.custom);
  const downloaded = getNumberValue(diskInfo.downloaded_gb ?? diskInfo.downloaded ?? diskInfo.downloads);
  const freeSpace = getNumberValue(diskInfo.free_gb ?? diskInfo.freeSpace ?? primaryDisk.free_gb ?? (primaryDisk.total_gb ? primaryDisk.total_gb - getNumberValue(primaryDisk.used_gb) : 0));

  const diskRadarData = [
    { name: 'System apps', value: systemApps },
    { name: 'Custom/built', value: customBuilt },
    { name: 'Downloaded', value: downloaded },
    { name: 'Free space', value: freeSpace },
  ];

  const renderLabelValue = (label: string, value: string | number | undefined) => (
    <div className="flex justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-medium">{value ?? 'N/A'}</span>
    </div>
  );

  const formatCsv = (items?: string[]) => (items && items.length > 0 ? items.join(', ') : 'N/A');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <Link href={`/devices/${deviceId}`} className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to device
        </Link>

        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardContent>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="uppercase tracking-[0.24em] text-xs text-slate-500">NextBit Probe</p>
                <h1 className="text-4xl font-bold text-slate-900">Hardware Diagnostic Report</h1>
                <p className="text-slate-600 mt-1">{reportDate} · {deviceName} · {system.os_name || 'Unknown OS'} · v{scan.data?.probe_version || 'N/A'}</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-slate-900">{score?.pct ?? 'N/A'}%</div>
                <div className={`text-xl font-semibold ${getTextColor(score?.overall)}`}>{score?.overall || 'Unknown'}</div>
                <div className="text-sm text-slate-600">Score {earned}/{total} · {passedChecks} passed · {failedChecks} failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>System</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {renderLabelValue('Manufacturer / Model', `${system.manufacturer || 'N/A'}${system.manufacturer && system.model ? ' / ' : ''}${system.model || ''}`)}
                  {renderLabelValue('Serial Number', system.serial || 'N/A')}
                  {renderLabelValue('Machine ID', system.machine_id || 'N/A')}
                  {renderLabelValue('CPU', system.cpu || 'N/A')}
                  {renderLabelValue('Cores / Threads', `${system.cores ?? system.cpu_cores ?? 'N/A'} / ${system.threads ?? system.cpu_threads ?? 'N/A'}`)}
                  {renderLabelValue('RAM', system.ram_gb ? `${system.ram_gb} GB` : 'N/A')}
                  {renderLabelValue('OS', system.os_name || 'N/A')}
                  {renderLabelValue('MAC Addresses', formatCsv(system.mac_addresses))}
                  {renderLabelValue('BIOS Date', system.bios_date || 'N/A')}
                  {renderLabelValue('BIOS Version', system.bios_version || 'N/A')}
                  {renderLabelValue('BIOS Age', system.bios_age || 'N/A')}
                  {renderLabelValue('Last Boot', system.last_boot || 'N/A')}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Audit QR Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm text-slate-700">
                  <p className="text-slate-600">When the audit QR is scanned, it should resolve to this machine’s report URL.</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 break-words text-sm text-slate-900">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">Audit URL:</span>
                        <div className="mt-1 text-blue-600 hover:text-blue-800 break-words">
                          <a href={auditUrl} target="_blank" rel="noreferrer">{auditUrl || 'Loading...'}</a>
                        </div>
                      </div>
                      <button
                        onClick={copyToClipboard}
                        className="flex-shrink-0 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded transition-colors"
                        title="Copy URL"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copied && <p className="text-green-600 text-xs mt-1">Copied to clipboard!</p>}
                  </div>
                  <p className="text-slate-500">Use a QR encoder to embed this URL into the machine-specific audit QR code.</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Health Checks</CardTitle>
              </CardHeader>
              <CardContent>
                {checks.length > 0 ? (
                  <div className="space-y-2">
                    {checks.map((check, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded bg-slate-50 hover:bg-slate-100 transition-colors">
                        <span className={`text-lg font-bold ${check.passed ? 'text-green-600' : 'text-red-600'}`}>
                          {check.passed ? '✓' : '✗'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-slate-900 block">{check.name || 'Unnamed check'}</span>
                          <span className="text-xs text-slate-600 block">{check.detail || 'No details provided'}</span>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">Weight: {check.weight ?? '-'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No health checks available.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {scan.data?.battery && Object.keys(scan.data.battery).length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Battery</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {Object.entries(scan.data.battery).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {scan.data?.gpu && Object.keys(scan.data.gpu).length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>GPU</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {Object.entries(scan.data.gpu).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {scan.data?.cpu_throttle && Object.keys(scan.data.cpu_throttle).length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle>CPU Throttle</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    {Object.entries(scan.data.cpu_throttle).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm text-slate-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-sm font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle>Disk Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
                  <div className="space-y-3">
                    <p className="text-sm text-slate-600">Major capacity categories are shown in the radar chart. Zero values mean no measurable usage was reported for that category.</p>
                    {diskRadarData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <span>{item.name}</span>
                        <span className="font-semibold text-slate-900">{item.value.toFixed(1)} GB</span>
                      </div>
                    ))}
                  </div>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={diskRadarData} outerRadius="80%">
                        <PolarGrid stroke="rgba(148,163,184,0.25)" />
                        <PolarAngleAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, Math.max(100, systemApps, customBuilt, downloaded, freeSpace)]} tick={false} axisLine={false} />
                        <Radar dataKey="value" stroke="#0f172a" fill="#0f172a" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}