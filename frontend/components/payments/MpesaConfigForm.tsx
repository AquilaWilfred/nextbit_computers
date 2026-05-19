"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MpesaSettings } from "@/types/pay.types";

interface MpesaConfigFormProps {
  settings: MpesaSettings;
  saving: boolean;
  onUpdate: <K extends keyof MpesaSettings>(key: K, value: MpesaSettings[K]) => void;
  onSave: () => void;
}

export const MpesaConfigForm = memo(function MpesaConfigForm({
  settings,
  saving,
  onUpdate,
  onSave,
}: MpesaConfigFormProps) {
  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">M-Pesa B2C Payout Configuration</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(["consumerKey", "consumerSecret", "initiatorPassword"] as const).map((field) => (
          <div key={field} className="space-y-1">
            <label className="text-sm font-medium capitalize">
              {field.replace(/([A-Z])/g, " $1")}
            </label>
            <Input
              type="password"
              value={settings[field]}
              onChange={(e) => onUpdate(field, e.target.value)}
            />
          </div>
        ))}
        <div className="space-y-1">
          <label className="text-sm font-medium">ShortCode (Paybill/Till)</label>
          <Input
            value={settings.shortcode}
            onChange={(e) => onUpdate("shortcode", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Initiator Name</label>
          <Input
            value={settings.initiatorName}
            onChange={(e) => onUpdate("initiatorName", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">API Host</label>
          <Select value={settings.apiHost} onValueChange={(val) => onUpdate("apiHost", val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sandbox">Sandbox (for testing)</SelectItem>
              <SelectItem value="production">Production (live)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1">
          <label className="text-sm font-medium">B2C Certificate Content</label>
          <Textarea
            placeholder="-----BEGIN CERTIFICATE----- ... -----END CERTIFICATE-----"
            className="font-mono text-xs min-h-[120px]"
            value={settings.certContent}
            onChange={(e) => onUpdate("certContent", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Paste the entire content of the .cer file provided by Safaricom here.
          </p>
        </div>
      </div>
      <Button className="mt-4" onClick={onSave} disabled={saving}>
        {saving ? "Saving..." : "Save M-Pesa Settings"}
      </Button>
    </Card>
  );
});