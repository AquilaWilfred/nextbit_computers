// components/technician/ProfileTab.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Upload, Lock, RefreshCw } from "lucide-react";
import { TechnicianProfile } from "@/types/technician.types";
import { ALL_SPECIALTIES } from "@/constants/technician.constants";

interface ProfileTabProps {
  profile: TechnicianProfile;
  onSave: (profile: TechnicianProfile) => Promise<boolean>;
  isAutoRefreshing?: boolean;  // Add this
}

export function ProfileTab({ profile, onSave, isAutoRefreshing = false }: ProfileTabProps) {
  const [form, setForm] = useState<TechnicianProfile>({
    ...profile,
    name: profile.name || "",
    phone: profile.phone || "",
    email: profile.email || "",
    location: profile.location || "",
    bio: profile.bio || "",
    specialties: profile.specialties || [],
    minPrice: profile.minPrice || 0,
    warrantyDays: profile.warrantyDays || 30,
    serviceRadius: profile.serviceRadius || 10,
    available: profile.available ?? true,
    iprsVerified: profile.iprsVerified ?? false,
    insured: profile.insured ?? false,
    rating: profile.rating || 0,
    reviewCount: profile.reviewCount || 0,
    joinedAt: profile.joinedAt || new Date().toISOString(),
  });
  
  const [saving, setSaving] = useState(false);
  
  const set = (key: keyof TechnicianProfile, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const toggleSpecialty = (s: string) => {
    const curr = form.specialties || [];
    set("specialties", curr.includes(s) ? curr.filter((x) => x !== s) : [...curr, s]);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Auto-refresh indicator */}
      {isAutoRefreshing && (
        <div className="flex items-center justify-center gap-2 text-xs text-blue-600 bg-blue-50 py-2 rounded-lg">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Profile data syncing...</span>
        </div>
      )}

      {/* Verification status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Verification & Trust
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <div className="text-sm font-medium">IPRS Verification</div>
              <div className="text-xs text-muted-foreground">Kenya national ID verification</div>
            </div>
            {form.iprsVerified ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Verified ✓</Badge>
            ) : (
              <Button size="sm" variant="outline">Upload ID</Button>
            )}
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <div>
              <div className="text-sm font-medium">Insurance certificate</div>
              <div className="text-xs text-muted-foreground">Required to show "Insured" badge</div>
            </div>
            {form.insured ? (
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active ✓</Badge>
            ) : (
              <Button size="sm" variant="outline"><Upload className="h-3.5 w-3.5 mr-1" /> Upload</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Basic info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Public profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Full name</Label>
              <Input 
                value={form.name || ""} 
                onChange={(e) => set("name", e.target.value)} 
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input 
                value={form.phone || ""} 
                onChange={(e) => set("phone", e.target.value)} 
                placeholder="Your phone number"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Location / base area</Label>
            <Input 
              value={form.location || ""} 
              onChange={(e) => set("location", e.target.value)} 
              placeholder="e.g. Westlands, Nairobi"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bio <span className="font-normal text-muted-foreground">(shown to customers)</span></Label>
            <Textarea 
              value={form.bio || ""} 
              onChange={(e) => set("bio", e.target.value)} 
              rows={3} 
              placeholder="Tell customers about your experience and expertise..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Specialties */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Specialties</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALL_SPECIALTIES.map((s) => {
              const active = (form.specialties || []).includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`min-w-[8rem] px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                    active
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-sm"
                      : "bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pricing & service */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pricing & service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Starting price (KES)</Label>
              <Input
                type="number"
                value={form.minPrice || 0}
                onChange={(e) => set("minPrice", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Default warranty (days)</Label>
              <Select value={String(form.warrantyDays || 30)} onValueChange={(v) => set("warrantyDays", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[14, 30, 60, 90].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Service radius (km)</Label>
            <Input
              type="number"
              value={form.serviceRadius || 10}
              onChange={(e) => set("serviceRadius", Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Only requests within this distance will be shown to you.</p>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save profile"}
      </Button>
    </div>
  );
}