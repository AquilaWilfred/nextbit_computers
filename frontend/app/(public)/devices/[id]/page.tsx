'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, ArrowLeft, Clock, HardDrive } from 'lucide-react';

interface Device {
  id: string;
  device_id: string;
  serial: string | null;
  machine_id: string | null;
  mac_addresses: string[] | null;
  manufacturer: string | null;
  model: string | null;
  shop_id: string | null;
  created_at: string;
  last_seen: string;
}

interface Scan {
  id: string;
  device_id: string;
  scan_id: string;
  created_at: string;
}

export default function DeviceDetailPage() {
  const params = useParams();
  const deviceId = params.id as string;
  const [device, setDevice] = useState<Device | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const deviceName = device?.machine_id || device?.model || device?.device_id || 'Unknown Device';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch device
        const deviceRes = await fetch(`/api/devices/${deviceId}`);
        if (!deviceRes.ok) {
          throw new Error('Device not found');
        }
        const deviceData = await deviceRes.json();
        setDevice(deviceData);

        // Fetch scans
        try {
          const scansRes = await fetch(`/api/devices/${deviceId}/scans`);
          if (scansRes.ok) {
            const scansData = await scansRes.json();
            setScans(Array.isArray(scansData) ? scansData : []);
          }
        } catch {
          // Scans endpoint may not exist, that's okay
          setScans([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load device');
      } finally {
        setLoading(false);
      }
    };

    if (deviceId) {
      fetchData();
    }
  }, [deviceId, setError, setLoading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <p className="text-gray-500">Loading device details...</p>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="p-6">
        <Link href="/devices" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to devices
        </Link>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error loading device</p>
              <p className="text-red-700 text-sm">{error || 'Device not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Link href="/devices" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to devices
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">{deviceName}</h1>
          <p className="text-slate-600">{device.device_id}</p>
        </div>

        {/* Device Info Cards */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Device Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {device.manufacturer && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-slate-600">Manufacturer:</span>
                  <span className="text-sm font-medium text-slate-900">{device.manufacturer}</span>
                </div>
              )}
              {device.model && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-slate-600">Model:</span>
                  <span className="text-sm font-medium text-slate-900">{device.model}</span>
                </div>
              )}
              {device.serial && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-slate-600">Serial:</span>
                  <span className="text-xs font-mono text-slate-900">{device.serial}</span>
                </div>
              )}
              {device.mac_addresses && device.mac_addresses.length > 0 && (
                <div className="border-b pb-2">
                  <span className="text-sm text-slate-600 block mb-2">MAC Addresses:</span>
                  <div className="space-y-1">
                    {device.mac_addresses.map((mac, idx) => (
                      <div key={idx} className="text-xs font-mono text-slate-700 bg-slate-100 p-1 rounded">
                        {mac}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <Clock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-600">First Scanned</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(device.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-600">Last Seen</p>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(device.last_seen).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scans Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-slate-600" />
              <CardTitle>Scan History ({scans.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {scans.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No scans recorded yet</p>
            ) : (
              <div className="space-y-2">
                {scans.map((scan) => (
                  <Link
                    key={scan.id}
                    href={`/devices/${deviceId}/scans/${scan.scan_id}`}
                    className="block p-4 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 group-hover:text-blue-600">
                          {scan.scan_id}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(scan.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}