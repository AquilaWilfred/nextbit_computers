// components/RequestFormModal.tsx
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { RequestFormState, Urgency, ServiceMode, PartsPreference } from "@/types/repairs.types";
import { URGENCY_META, FORM_DEFAULTS } from "@/constants/repairs.constants";
import { getPresignedUrl, uploadFile } from "@/hooks/settings/useSettings";

interface Attachment {
  id: string;
  file: File;
  preview: string;
  url?: string;
  uploading: boolean;
  error?: string;
}

interface RequestFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RequestFormState & { photoUrls?: string[] }) => Promise<boolean>;
  selectedTechnicianName?: string;
}

export function RequestFormModal({ open, onClose, onSubmit, selectedTechnicianName }: RequestFormModalProps) {
  const [form, setForm] = useState<RequestFormState>(FORM_DEFAULTS);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const set = (key: keyof RequestFormState, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const attachFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const maxFiles = 5;
    const nextFiles = Array.from(files).slice(0, Math.max(0, maxFiles - attachments.length));
    if (nextFiles.length === 0) {
      toast.error(`You can attach up to ${maxFiles} files.`);
      return;
    }

    for (const file of nextFiles) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        toast.error("Please upload only photos or videos.");
        continue;
      }

      const id = `${file.name}-${file.size}-${Date.now()}`;
      const preview = URL.createObjectURL(file);
      setAttachments((prev) => [...prev, { id, file, preview, uploading: true }]);

      try {
        const presigned = await getPresignedUrl(file.name, file.type);
        const url = await uploadFile(file, presigned);
        setAttachments((prev) => prev.map((item) => item.id === id ? { ...item, url, uploading: false } : item));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setAttachments((prev) => prev.map((item) => item.id === id ? { ...item, uploading: false, error: message } : item));
        toast.error(message);
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (!form.deviceType || !form.issue || !form.location) {
      toast.error("Please fill in device type, issue, and location.");
      return;
    }

    if (attachments.some((item) => item.uploading)) {
      toast.error("Please wait for all uploads to finish before posting.");
      return;
    }

    if (attachments.some((item) => item.error)) {
      toast.error("Remove or retry failed uploads before posting.");
      return;
    }

    setSubmitting(true);
    const success = await onSubmit({ ...form, photoUrls: attachments.map((item) => item.url).filter(Boolean) });
    setSubmitting(false);

    if (!success) {
      return;
    }

    setForm(FORM_DEFAULTS);
    setAttachments([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Post repair request</CardTitle>
          {selectedTechnicianName ? (
            <p className="text-sm text-muted-foreground">
              Request a quote from <span className="font-semibold text-foreground">{selectedTechnicianName}</span>. Fill in the issue details and submit to notify nearby technicians.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Verified technicians nearby will send you itemised quotes. No upfront payment.
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Device type *</Label>
              <Select value={form.deviceType} onValueChange={(v) => set("deviceType", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {["Laptop", "Desktop", "Tablet", "Printer", "Phone", "Monitor", "Other"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Brand / Model</Label>
              <Input placeholder="e.g. Dell XPS 15" value={form.brand} onChange={(e) => set("brand", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Describe the problem *</Label>
            <Textarea
              placeholder="Be specific — e.g. 'Screen flickers after 30 min, backlight issue not a cable'"
              value={form.issue}
              onChange={(e) => set("issue", e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Upload photos / videos</Label>
            <div
              className="relative border-2 border-dashed border-border rounded-lg p-4 text-center text-muted-foreground text-sm cursor-pointer hover:border-foreground/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={(e) => attachFiles(e.target.files)}
              />
              <Camera className="h-6 w-6 mx-auto mb-1 opacity-50" />
              <div>Tap to add photos or videos</div>
              <div className="text-xs text-muted-foreground mt-1">Up to 5 files, images and short videos supported.</div>
            </div>
            {attachments.length > 0 && (
              <div className="grid grid-cols-1 gap-2 mt-3">
                {attachments.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-slate-50 px-3 py-2 text-left text-xs">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{item.file.name}</div>
                      <div className="text-muted-foreground">
                        {item.uploading ? "Uploading…" : item.error ? item.error : `${(item.file.size / 1024 / 1024).toFixed(2)} MB`}
                      </div>
                    </div>
                    <button type="button" className="text-red-600 hover:text-red-700" onClick={() => removeAttachment(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Urgency *</Label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as Urgency[]).map((u) => {
                const m = URGENCY_META[u];
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => set("urgency", u)}
                    className={`rounded-lg p-3 text-center text-xs font-semibold transition-colors ${
                      form.urgency === u
                        ? `${m.active} border-2 shadow-sm`
                        : "border border-border bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <div className="text-2xl mb-1">{m.emoji}</div>
                    <div className="uppercase tracking-[.08em]">{m.label}</div>
                    <div className="font-normal opacity-80">{m.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max budget (KES)</Label>
              <Input type="number" placeholder="e.g. 10000" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Location *</Label>
              <Input placeholder="e.g. Westlands, Nairobi" value={form.location} onChange={(e) => set("location", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Service mode</Label>
            <Select value={form.serviceMode} onValueChange={(v) => set("serviceMode", v as ServiceMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="drop_off">Drop-off at technician</SelectItem>
                <SelectItem value="home_visit">Technician comes to me (+ transport fee)</SelectItem>
                <SelectItem value="either">Either — let technician decide</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Parts preference</Label>
            <Select value={form.partsPreference} onValueChange={(v) => set("partsPreference", v as PartsPreference)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="oem_only">Original OEM only</SelectItem>
                <SelectItem value="oem_or_aftermarket">OEM or quality aftermarket</SelectItem>
                <SelectItem value="cheapest">Cheapest available</SelectItem>
                <SelectItem value="tech_choice">Technician's recommendation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-[2]" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Posting..." : "Post request — get free quotes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}