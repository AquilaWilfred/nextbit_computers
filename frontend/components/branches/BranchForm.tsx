"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPicker } from "@/components/map/MapPicker";
import { BranchHoursEditor } from "./BranchHoursEditor";
import { X, Loader2, MapPin } from "lucide-react";
import { BranchFormData } from "@/types/branches.types";
import { getGoogleMapsUrl } from "@/lib/utils/branchUtilApis";

interface BranchFormProps {
  isOpen: boolean;
  editingId: number | null;
  form: BranchFormData;
  locating: boolean;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onUpdateField: <K extends keyof BranchFormData>(field: K, value: BranchFormData[K]) => void;
  onUpdateHour: (index: number, field: keyof { label: string; value: string }, value: string) => void;
  onAddHourRow: () => void;
  onRemoveHourRow: (index: number) => void;
  onSetLocation: (lat: number, lng: number) => void;
  onDetectLocation: () => void;
}

export const BranchForm = memo(function BranchForm({
  isOpen,
  editingId,
  form,
  locating,
  submitting,
  onClose,
  onSubmit,
  onUpdateField,
  onUpdateHour,
  onAddHourRow,
  onRemoveHourRow,
  onSetLocation,
  onDetectLocation,
}: BranchFormProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <Card className="w-full max-w-lg shadow-2xl my-4">
        <form onSubmit={onSubmit}>
          <div className="p-6 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-bold">
              {editingId ? "Edit Branch" : "Add New Branch"}
            </h2>
            <Button type="button" variant="ghost" size="icon" onClick={onClose}>
              <X size={16} />
            </Button>
          </div>

          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Branch Name *</label>
                <Input
                  placeholder="e.g. Nairobi CBD Branch"
                  value={form.name}
                  onChange={(e) => onUpdateField("name", e.target.value)}
                  required
                />
              </div>
              
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Address *</label>
                <Input
                  placeholder="e.g. Kenyatta Avenue, Nairobi"
                  value={form.address}
                  onChange={(e) => onUpdateField("address", e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input
                  placeholder="+254…"
                  value={form.phone}
                  onChange={(e) => onUpdateField("phone", e.target.value)}
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="branch@store.com"
                  value={form.email}
                  onChange={(e) => onUpdateField("email", e.target.value)}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Location (Lat / Lng) *</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Latitude e.g. -1.2921"
                  value={form.lat}
                  onChange={(e) => onUpdateField("lat", e.target.value)}
                />
                <Input
                  placeholder="Longitude e.g. 36.8219"
                  value={form.lng}
                  onChange={(e) => onUpdateField("lng", e.target.value)}
                />
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onDetectLocation}
                disabled={locating}
                className="gap-2 w-full"
              >
                {locating ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                {locating ? "Detecting…" : "📍 Use My Current Location"}
              </Button>
              
              <div className="rounded-lg overflow-hidden border border-border mt-1">
                <p className="text-[11px] text-muted-foreground bg-muted px-3 py-1.5 border-b border-border">
                  🗺️ Click anywhere on the map to pin the branch location
                </p>
                <MapPicker
                  key={`${form.lat}-${form.lng}`}
                  lat={form.lat ? parseFloat(form.lat) : undefined}
                  lng={form.lng ? parseFloat(form.lng) : undefined}
                  onPick={onSetLocation}
                />
              </div>
              
              {form.lat && form.lng && (
                <a
                  href={getGoogleMapsUrl(form.lat, form.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline block text-center"
                >
                  Preview on Google Maps ↗
                </a>
              )}
            </div>

            {/* Hours */}
            <BranchHoursEditor
              hours={form.hours}
              onUpdateHour={onUpdateHour}
              onAddRow={onAddHourRow}
              onRemoveRow={onRemoveHourRow}
            />

            {/* Toggles */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isMain}
                  onChange={(e) => onUpdateField("isMain", e.target.checked)}
                  className="rounded"
                />
                Main Branch
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => onUpdateField("active", e.target.checked)}
                  className="rounded"
                />
                Active
              </label>
            </div>
          </div>

          <div className="p-6 border-t border-border flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[var(--brand)] text-white hover:opacity-90 min-w-[100px]"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : editingId ? (
                "Save Changes"
              ) : (
                "Add Branch"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
});