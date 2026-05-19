// components/TechnicianApplicationForm.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { ALL_SPECIALTIES } from "@/constants/authConstants";

interface TechnicianApplicationFormProps {
  userEmail: string;
  userId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function TechnicianApplicationForm({
  userEmail,
  userId,
  onClose,
  onSuccess,
}: TechnicianApplicationFormProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    location: "",
    bio: "",
    specialties: [] as string[],
    minPrice: 1500,
    warrantyDays: 30,
    serviceRadius: 10,
  });

  const toggleSpecialty = (specialty: string) => {
    setForm(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (form.specialties.length === 0) {
      toast.error("Please select at least one specialty");
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch("/api/technician/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          email: userEmail,
          location: form.location,
          bio: form.bio,
          specialties: form.specialties,
          min_price: form.minPrice,
          warranty_days: form.warrantyDays,
          service_radius: form.serviceRadius,
        }),
      });

      if (!response.ok) throw new Error("Application failed");

      toast.success("Application submitted successfully! We'll review your profile within 2-3 business days.");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-background rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b p-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">Become a Technician</h2>
            <p className="text-sm text-muted-foreground mt-1">Join our network of trusted repair technicians</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Requirements */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              Requirements
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Valid IPRS verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>2+ years experience</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Tools and equipment</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Good communication skills</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Base Location *</Label>
              <Input
                placeholder="e.g., Westlands, Nairobi"
                value={form.location}
                onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Bio / Experience *</Label>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="Tell us about your experience, certifications, and expertise..."
                value={form.bio}
                onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-3">
              <Label>Specialties *</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_SPECIALTIES.map((specialty) => (
                  <button
                    key={specialty}
                    type="button"
                    onClick={() => toggleSpecialty(specialty)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      form.specialties.includes(specialty)
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-border text-muted-foreground hover:border-emerald-500 hover:text-emerald-600"
                    }`}
                  >
                    {specialty}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Service Fee (KES) *</Label>
                <Input
                  type="number"
                  value={form.minPrice}
                  onChange={(e) => setForm(prev => ({ ...prev, minPrice: Number(e.target.value) }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Default Warranty (days)</Label>
                <select
                  value={form.warrantyDays}
                  onChange={(e) => setForm(prev => ({ ...prev, warrantyDays: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="60">60 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Service Radius (km) *</Label>
              <Input
                type="number"
                value={form.serviceRadius}
                onChange={(e) => setForm(prev => ({ ...prev, serviceRadius: Number(e.target.value) }))}
                required
              />
              <p className="text-xs text-muted-foreground">Maximum distance you're willing to travel for home visits</p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}