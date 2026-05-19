"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Building2, Store, Mail, Phone, MapPin } from "lucide-react";
import { InviteForm, InviteFormKey } from "@/types/network/stores/invite.types";

interface StoreDetailsFormProps {
  form: InviteForm;
  onFieldChange: (key: InviteFormKey) => (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const StoreDetailsForm = memo(function StoreDetailsForm({
  form,
  onFieldChange,
}: StoreDetailsFormProps) {
  return (
    <Card className="border border-border p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Building2 className="w-4 h-4 text-[var(--brand)]" />
        <h3 className="font-semibold text-sm">Store Details</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">
            Store Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={form.storeName}
              onChange={onFieldChange("storeName")}
              placeholder="e.g. Westlands Tech Hub"
              className="pl-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">Contact Name</label>
          <Input
            value={form.contactName}
            onChange={onFieldChange("contactName")}
            placeholder="Store manager name"
            className="text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">
            Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              type="email"
              value={form.email}
              onChange={onFieldChange("email")}
              placeholder="store@example.com"
              className="pl-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={form.phone}
              onChange={onFieldChange("phone")}
              placeholder="+254 7XX XXX XXX"
              className="pl-8 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium">Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={form.address}
              onChange={onFieldChange("address")}
              placeholder="Street address"
              className="pl-8 text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium">City</label>
          <Input
            value={form.city}
            onChange={onFieldChange("city")}
            placeholder="e.g. Nairobi"
            className="text-sm"
          />
        </div>
      </div>
    </Card>
  );
});