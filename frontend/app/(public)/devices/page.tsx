'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';

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

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/devices');
        if (!response.ok) {
          throw new Error(`Failed to fetch devices: ${response.statusText}`);
        }
        const data = await response.json();
        setDevices(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load devices');
        setDevices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const filteredDevices = useMemo(() => {
    if (!searchTerm.trim()) return devices;
    const term = searchTerm.toLowerCase();
    return devices.filter(device => 
      device.machine_id?.toLowerCase().includes(term) ||
      device.device_id.toLowerCase().includes(term) ||
      device.serial?.toLowerCase().includes(term)
    );
  }, [devices, searchTerm]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <p className="text-gray-500">Loading devices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error loading devices</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Scanned Devices</h1>
          <p className="text-slate-600">Browse all devices that have been scanned by NextBit Probe</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by machine ID, device ID, or serial number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-4 py-3 text-base"
            />
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Found {filteredDevices.length} device{filteredDevices.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Devices Grid */}
        {filteredDevices.length === 0 ? (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">
                {searchTerm ? 'No devices match your search' : 'No devices scanned yet'}
              </p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-blue-600 hover:text-blue-700 text-sm mt-2 font-semibold"
                >
                  Clear search
                </button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDevices.map((device) => (
              <Link key={device.id} href={`/devices/${device.device_id}`}>
                <Card className="h-full hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                      {device.machine_id || 'Unknown Machine'}
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-1">{device.device_id}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {device.manufacturer && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Manufacturer:</span>
                        <span className="text-sm font-medium text-slate-900">{device.manufacturer}</span>
                      </div>
                    )}
                    {device.model && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Model:</span>
                        <span className="text-sm font-medium text-slate-900">{device.model}</span>
                      </div>
                    )}
                    {device.serial && (
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-600">Serial:</span>
                        <span className="text-xs font-mono text-slate-900 truncate">{device.serial}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-xs text-slate-500">Last Seen:</span>
                      <span className="text-xs text-slate-700">
                        {new Date(device.last_seen).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
