"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChevronRight, MapPin, CheckCircle2, Pencil } from "lucide-react";
import { ShippingFormData } from "@/types/checkout/checkout.types";
import { formatKenyanPhone } from "@/lib/utils/checkout/checkout.utils";
import { getLoginUrl } from "@/lib/ux";
import { DeliveryMapModal } from "@/components/checkout/DeliveryMapModal";
import { useAuth } from "@/hooks/auth/useAuth";

interface ShippingFormProps {
  shipping: ShippingFormData;
  isAuthenticated: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (updates: Partial<ShippingFormData>) => void;
}

export function ShippingForm({
  shipping,
  isAuthenticated,
  onSubmit,
  onChange,
}: ShippingFormProps) {
  const { user } = useAuth();
  const [mapOpen, setMapOpen] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  const accountName = user?.name?.trim() ?? "";
  const [userFirstName, userLastName] = accountName
    ? (() => {
        const parts = accountName.split(/\s+/);
        const first = parts[0] || "";
        const last = parts.slice(1).join(" ") || first;
        return [first, last];
      })()
    : ["", ""];

  // Stable refs — prevent onChange/shipping from being effect dependencies
  const initialShipping = useRef(shipping);
  const onChangeRef = useRef(onChange);
  const didAutoFill = useRef(false);
  useEffect(() => { onChangeRef.current = onChange; });

  // ── Auto-fill from account on mount ──────────────────────────────────
  useEffect(() => {
    if (!user || didAutoFill.current) return;
    didAutoFill.current = true;

    const s = initialShipping.current;
    const updates: Partial<ShippingFormData> = {};

    if (!s.firstName && userFirstName) updates.firstName = userFirstName;
    if (!s.lastName  && userLastName)  updates.lastName  = userLastName;
    if (!s.email     && user.email)    updates.email     = user.email;
    if (!s.phone     && user.phone)    updates.phone     = user.phone;

    if (Object.keys(updates).length > 0) {
      onChangeRef.current(updates);
      setAutoFilled(true);
    }
  // Only re-run if the user object itself arrives (e.g. auth resolves async)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, userFirstName, userLastName]);

  const hasPinned = shipping.deliveryLat != null && shipping.deliveryLng != null;

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5">

        {/* ── Auto-fill notice ───────────────────────────────────────── */}
        {autoFilled && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>We filled in your account details — update anything that's changed.</span>
          </div>
        )}

        {/* ── Name ──────────────────────────────────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              value={shipping.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              placeholder="First Name"
              required
              readOnly={isAuthenticated}
            />
            {isAuthenticated && (
              <p className="text-xs text-muted-foreground">Taken from your account and cannot be changed here.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              value={shipping.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              placeholder="Last Name"
              required
              readOnly={isAuthenticated}
            />
            {isAuthenticated && (
              <p className="text-xs text-muted-foreground">Taken from your account and cannot be changed here.</p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={shipping.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="For order receipts and tracking"
              required
              readOnly={isAuthenticated}
            />
            {isAuthenticated && (
              <p className="text-xs text-muted-foreground">This is your authenticated account email.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number *</Label>
            <Input
              id="phone"
              value={shipping.phone}
              onChange={(e) => onChange({ phone: formatKenyanPhone(e.target.value) })}
              placeholder="e.g. +254 112 554 165"
              required
              readOnly={isAuthenticated}
            />
            {isAuthenticated && (
              <p className="text-xs text-muted-foreground">Phone locked to your account for verified delivery contact.</p>
            )}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="additionalPhone1">Additional Phone #1</Label>
            <Input
              id="additionalPhone1"
              value={shipping.additionalPhone1 || ""}
              onChange={(e) => onChange({ additionalPhone1: formatKenyanPhone(e.target.value) })}
              placeholder="Optional extra contact number"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="additionalPhone2">Additional Phone #2</Label>
            <Input
              id="additionalPhone2"
              value={shipping.additionalPhone2 || ""}
              onChange={(e) => onChange({ additionalPhone2: formatKenyanPhone(e.target.value) })}
              placeholder="Optional extra contact number"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deliveryNote">Delivery Instructions</Label>
          <Textarea
            id="deliveryNote"
            value={shipping.deliveryNote || ""}
            onChange={(e) => onChange({ deliveryNote: e.target.value })}
            placeholder="Leave a note for the driver or person delivering rest of the order"
            rows={4}
          />
          <p className="text-xs text-muted-foreground">Optional details for the delivery person or if someone else is collecting.</p>
        </div>

        <div className="rounded-2xl border border-border bg-muted/50 p-4">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-sm font-semibold">Delivery pin</p>
              <p className="text-xs text-muted-foreground">Pin the exact delivery location on the map. Address fields are populated automatically.</p>
            </div>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:border-[var(--brand)] hover:text-[var(--brand)] transition"
              >
                {hasPinned ? "Update location" : "Pick location"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => (window.location.href = getLoginUrl("/checkout"))}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:border-[var(--brand)] hover:text-[var(--brand)] transition"
              >
                Sign in to unlock location pin
              </button>
            )}
          </div>

          {hasPinned ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-background p-4 shadow-sm border border-border">
                <p className="text-sm font-medium text-foreground">{shipping.deliveryAddress}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {shipping.city}{shipping.county ? ` · ${shipping.county}` : ""}{shipping.country ? ` · ${shipping.country}` : ""}
                  {shipping.postalCode ? ` · ${shipping.postalCode}` : ""}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
                <div className="rounded-xl bg-background p-3 border border-border">
                  <p className="font-semibold text-xs uppercase tracking-[0.14em]">City</p>
                  <p>{shipping.city || "Automatic from pin"}</p>
                </div>
                <div className="rounded-xl bg-background p-3 border border-border">
                  <p className="font-semibold text-xs uppercase tracking-[0.14em]">County</p>
                  <p>{shipping.county || "Automatic from pin"}</p>
                </div>
                <div className="rounded-xl bg-background p-3 border border-border">
                  <p className="font-semibold text-xs uppercase tracking-[0.14em]">Country</p>
                  <p>{shipping.country || "Automatic from pin"}</p>
                </div>
                <div className="rounded-xl bg-background p-3 border border-border">
                  <p className="font-semibold text-xs uppercase tracking-[0.14em]">Postal code</p>
                  <p>{shipping.postalCode || "Optional"}</p>
                </div>
              </div>
            </div>
          ) : (
            isAuthenticated ? (
              <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                Tap the map button to set your delivery pin. This removes manual county/city address entry and reduces delivery errors.
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                <div className="mb-3">
                  <p className="font-semibold text-foreground">Delivery pin requires a signed-in account</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Sign in to access the map-based location picker and auto-populate your delivery address fields.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => (window.location.href = getLoginUrl("/checkout"))}
                  className="inline-flex items-center justify-center rounded-full border border-border bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand)]/90 transition"
                >
                  Sign in to use delivery pin
                </button>
              </div>
            )
          )}
        </div>

        {/* ── Delivery Pin CTA ───────────────────────────────────────── */}
        <div>
          {hasPinned ? (
            // Confirmed state — shows address + edit button
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                  <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Delivery pin set
                  </p>
                  <p className="text-sm text-foreground truncate">
                    {shipping.deliveryAddress || `${shipping.deliveryLat!.toFixed(5)}, ${shipping.deliveryLng!.toFixed(5)}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMapOpen(true)}
                className="ml-3 shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          ) : isAuthenticated ? (
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="w-full flex items-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-[var(--brand)] hover:bg-[var(--brand)]/5 transition-colors px-4 py-3.5 text-left group"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)]/10 group-hover:bg-[var(--brand)]/15 transition-colors">
                <MapPin className="h-4.5 w-4.5 text-[var(--brand)]" />
              </div>
              <div>
                <p className="text-sm font-medium">Pin your delivery location</p>
                <p className="text-xs text-muted-foreground">Helps the driver find you faster — like Bolt or Glovo</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground group-hover:text-[var(--brand)] transition-colors shrink-0" />
            </button>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              <div className="mb-3">
                <p className="font-semibold text-foreground">Delivery pin is available only for signed-in users</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Please sign in to unlock the map-based delivery pin feature and keep your address details synced with your account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => (window.location.href = getLoginUrl("/checkout"))}
                className="w-full rounded-full border border-border bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand)]/90 transition"
              >
                Sign in to unlock delivery pin
              </button>
            </div>
          )}
        </div>

        {/* ── Save address ───────────────────────────────────────────── */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={shipping.saveAddress}
            onChange={(e) => onChange({ saveAddress: e.target.checked })}
            className="rounded border-input"
          />
          <span className="text-sm text-muted-foreground">
            Save this address for future orders
          </span>
        </label>

        <Button
          type="submit"
          className="w-full bg-[var(--brand)] text-white hover:opacity-90 gap-2 mt-2"
        >
          Continue to Review <ChevronRight className="w-4 h-4" />
        </Button>
      </form>

      {/* ── Full-screen delivery map — rendered outside the form ──────── */}
      {isAuthenticated && (
        <DeliveryMapModal
          open={mapOpen}
          initial={
            hasPinned
              ? {
                  lat: shipping.deliveryLat!,
                  lng: shipping.deliveryLng!,
                  address: shipping.deliveryAddress ?? "",
                }
              : null
          }
          onConfirm={(pin) => {
            onChange({
              deliveryLat: pin.lat,
              deliveryLng: pin.lng,
              deliveryAddress: pin.address,
              address: pin.address,
              city: pin.city ?? shipping.city,
              county: pin.county ?? shipping.county,
              postalCode: pin.postalCode ?? shipping.postalCode,
              country: pin.country ?? shipping.country,
            });
          }}
          onClose={() => setMapOpen(false)}
        />
      )}
    </>
  );
}