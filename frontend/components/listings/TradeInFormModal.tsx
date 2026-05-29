// components/listings/TradeInFormModal.tsx
"use client";

import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DeviceType, Condition } from '@/types/listings/listings.types';
import { DEVICE_LABELS, CONDITION_META } from '@/constants/listings/listings.constants';
import { ImageUploader } from './ImageUploader';
import { X } from 'lucide-react';
import { PRESET_BRANDS } from '@/constants/brands.constants';
import { useBranches } from '@/hooks/branches/useBranches';
import { Branch } from '@/types/branches.types';
import { OSRM_ROUTE_URL } from '@/constants/mapConstants';

const CONDITION_BUTTON_CLASSES: Record<Condition, string> = {
  excellent: 'border-emerald-600 text-white',
  good:      'border-blue-600 text-white',
  fair:      'border-amber-600 text-white',
};

const CONDITION_SELECTION_STYLES: Record<Condition, React.CSSProperties> = {
  excellent: {
    backgroundImage: 'linear-gradient(135deg, #34d399 0%, #10b981 50%, #047857 100%)',
    borderColor: '#047857',
    color: '#ffffff',
    boxShadow: '0 20px 40px rgba(16, 185, 129, 0.25)',
  },
  good: {
    backgroundImage: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 50%, #2563eb 100%)',
    borderColor: '#2563eb',
    color: '#ffffff',
    boxShadow: '0 20px 40px rgba(37, 99, 235, 0.25)',
  },
  fair: {
    backgroundImage: 'linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #d97706 100%)',
    borderColor: '#d97706',
    color: '#ffffff',
    boxShadow: '0 20px 40px rgba(217, 119, 6, 0.25)',
  },
};

// Haversine straight-line distance in km (used as fallback when OSRM fails)
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface TradeInFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  formData: any;
  onFieldChange: (field: string, value: any) => void;
  images: File[];
  previews: string[];
  onAddImages: (files: File[]) => void;
  onRemoveImage: (index: number) => void;
  primaryIndex?: number;
  onSetPrimary?: (index: number) => void;
}

export const TradeInFormModal: FC<TradeInFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  submitting,
  formData,
  onFieldChange,
  images,
  previews,
  onAddImages,
  onRemoveImage,
  primaryIndex,
  onSetPrimary,
}) => {
  // ─── All hooks must come before any conditional return ───────────────────────
  const { branches } = useBranches();
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [branchDistances, setBranchDistances] = useState<Record<number, number>>({});
  const [autoDetecting, setAutoDetecting] = useState(false);

  // Ref to abort in-flight distance computation when coords/branches change again
  const computeAbortRef = useRef<AbortController | null>(null);

  // ─── Route distance computation ──────────────────────────────────────────────
  useEffect(() => {
    // Nothing to compute until the user has shared their location
    if (!userCoords || branches.length === 0) return;

    // Cancel any previous in-flight batch
    computeAbortRef.current?.abort();
    const controller = new AbortController();
    computeAbortRef.current = controller;

    const run = async () => {
      const dists: Record<number, number> = {};

      const tasks = branches.map((b: Branch) => async () => {
        if (controller.signal.aborted) return;

        // Branch lat/lng are stored as strings in the DB – parse safely
        const bLat = Number(b.lat);
        const bLng = Number(b.lng);

        // Guard against missing / invalid coordinates
        if (!isFinite(bLat) || !isFinite(bLng)) {
          return; // skip branch entirely rather than routing to 0,0
        }

        try {
          // OSRM expects lon,lat ordering
          const url =
            `${OSRM_ROUTE_URL}/${userCoords.lng},${userCoords.lat};${bLng},${bLat}` +
            `?overview=false`;
          const resp = await fetch(url, { signal: controller.signal });

          if (!resp.ok) throw new Error(`OSRM ${resp.status}`);

          const j = await resp.json();
          const distanceMeters: number | undefined = j?.routes?.[0]?.legs?.[0]?.distance;

          dists[b.id] =
            distanceMeters != null
              ? distanceMeters / 1000
              : haversineKm(userCoords.lat, userCoords.lng, bLat, bLng);
        } catch (e: any) {
          // AbortError means a newer computation started – don't overwrite state
          if (e?.name === 'AbortError') return;
          // Any other OSRM failure – fall back to straight-line distance
          dists[b.id] = haversineKm(userCoords.lat, userCoords.lng, bLat, bLng);
        }
      });

      // Process in batches of 8 to avoid hammering the public OSRM instance
      const batchSize = 8;
      for (let i = 0; i < tasks.length; i += batchSize) {
        if (controller.signal.aborted) return;
        await Promise.all(tasks.slice(i, i + batchSize).map(fn => fn()));
      }

      if (!controller.signal.aborted) {
        setBranchDistances(dists);
      }
    };

    run();

    return () => {
      controller.abort();
    };
  }, [userCoords, branches]); // fresh closure every time either changes

  // ─── Sorted branches (nearest first) ─────────────────────────────────────────
  const sortedBranches = useMemo(() => {
    if (!branches || branches.length === 0) return [] as Branch[];
    return [...branches].sort((a, b) => {
      const da = branchDistances[a.id] ?? Number.MAX_VALUE;
      const db = branchDistances[b.id] ?? Number.MAX_VALUE;
      return da - db;
    });
  }, [branches, branchDistances]);

  // ─── Geolocation + reverse-geocode ───────────────────────────────────────────
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setAutoDetecting(true);

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserCoords({ lat, lng });

        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          );
          if (resp.ok) {
            const j = await resp.json();
            const place =
              j.address?.city ||
              j.address?.town ||
              j.address?.village ||
              j.address?.state ||
              j.display_name;
            onFieldChange('location', place || `${lat.toFixed(4)},${lng.toFixed(4)}`);
          } else {
            onFieldChange('location', `${lat.toFixed(4)},${lng.toFixed(4)}`);
          }
        } catch {
          onFieldChange('location', `${lat.toFixed(4)},${lng.toFixed(4)}`);
        } finally {
          setAutoDetecting(false);
        }
      },
      _err => {
        setAutoDetecting(false);
      },
      { timeout: 10000 },
    );
  }, [onFieldChange]);

  const formatNumberInput = (value?: number) => {
  if (value == null) return '';
  return value.toLocaleString('en-US');
};

// ─── Auto-detect location when modal opens ───────────────────────────────────
  useEffect(() => {
    if (isOpen) detectLocation();
  }, [isOpen]);

  // ─── Early return AFTER all hooks ────────────────────────────────────────────
  if (!isOpen) return null;

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8">
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-white flex justify-between items-center sticky top-0 bg-white">
          <div>
            <h3 className="text-2xl font-bold text-gray-800">List Your Device</h3>
            <p className="text-sm text-gray-500 mt-1">Fill in the details below to start selling on NextBit Marketplace</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Two-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Device Type *</label>
              <select
                value={formData.device_type || 'laptop'}
                onChange={e => onFieldChange('device_type', e.target.value as DeviceType)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              >
                {(Object.keys(DEVICE_LABELS) as DeviceType[]).map(k => (
                  <option key={k} value={k}>{DEVICE_LABELS[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Brand *</label>
              <select
                value={formData.brand || ''}
                onChange={e => onFieldChange('brand', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              >
                <option value="">Select brand</option>
                {PRESET_BRANDS.sort((a, b) => a.name.localeCompare(b.name)).map(b => (
                  <option key={b.name} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Model *</label>
              <input
                value={formData.model || ''}
                onChange={e => onFieldChange('model', e.target.value)}
                placeholder="e.g. iPhone 14 Pro, Galaxy S23"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Asking Price (KES) *</label>
              <input
                type="text"
                inputMode="numeric"
                value={formatNumberInput(formData.asking_price_kes)}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  const parsed = raw === '' ? undefined : parseInt(raw, 10);
                  onFieldChange('asking_price_kes', Number.isNaN(parsed) ? undefined : parsed);
                }}
                placeholder="e.g. 45,000"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Condition Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Condition <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(Object.keys(CONDITION_META) as Condition[]).map(c => {
                const isSelected = formData.condition === c;
                const meta = CONDITION_META[c];
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => onFieldChange('condition', c)}
                    style={isSelected ? CONDITION_SELECTION_STYLES[c] : undefined}
                    className={`p-6 rounded-2xl border-2 text-left transition-all duration-200 min-h-[110px] ${
                      isSelected
                        ? `${CONDITION_BUTTON_CLASSES[c]} ring-2 ring-offset-2 ring-current scale-[1.02]`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow shadow-sm hover:shadow-xl'
                    }`}
                  >
                    <div className={`font-semibold text-lg ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                      {meta.label}
                    </div>
                    <div className={`text-sm mt-2 leading-snug ${isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                      {meta.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <ImageUploader
            images={images}
            previews={previews}
            onAddImages={onAddImages}
            onRemoveImage={onRemoveImage}
            primaryIndex={primaryIndex}
            onSetPrimary={onSetPrimary}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
              <div className="flex gap-2">
                <input
                  value={formData.location || ''}
                  onChange={e => onFieldChange('location', e.target.value)}
                  placeholder="e.g. Nairobi, Mombasa"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
                />
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={autoDetecting}
                  className="px-3 py-2 rounded-lg bg-gray-100 border"
                >
                  {autoDetecting ? 'Detecting...' : 'Detect'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Drop-off Branch *</label>
              <select
                value={formData.drop_branch || ''}
                onChange={e => onFieldChange('drop_branch', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm"
              >
                <option value="">Select branch</option>
                {sortedBranches.map(b => (
                  <option key={b.id} value={b.name}>
                    {b.name}{branchDistances[b.id] != null ? ` • ${branchDistances[b.id].toFixed(1)} km` : ''}
                  </option>
                ))}
              </select>

              {/* Brief details for selected branch */}
              {formData.drop_branch && (() => {
                const sel = branches.find(bb => bb.name === formData.drop_branch);
                if (!sel) return null;
                const dist = branchDistances[sel.id];
                return (
                  <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                    <div className="font-semibold">
                      {sel.name}{dist != null ? ` • ${dist.toFixed(1)} km` : ''}
                    </div>
                    <div className="text-xs">{sel.address}</div>
                    {sel.phone && <div className="text-xs">{sel.phone}</div>}
                  </div>
                );
              })()}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Specifications & Notes</label>
            <textarea
              value={formData.specs || ''}
              onChange={e => onFieldChange('specs', e.target.value)}
              rows={4}
              placeholder="RAM, storage, CPU, battery health, accessories included, cosmetic condition, etc."
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm resize-vertical"
            />
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <div>
                <strong className="block mb-1">What happens next?</strong>
                <ul className="text-xs space-y-1 list-disc pl-4">
                  <li>A seller will verify your device at the drop-off branch</li>
                  <li>Device gets QISJ grade and listed on marketplace</li>
                  <li>You receive platform credit when sold (minus small fee)</li>
                  <li>Average time to sell: 3-7 days</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full mt-6">
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting}
              className={`flex-1 h-12 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer ${
                submitting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 shadow-sm shadow-blue-500/10'
              }`}
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Submitting...</span>
                </>
              ) : (
                'List on Marketplace'
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 h-12 border border-gray-300 bg-white rounded-xl text-sm font-semibold text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};