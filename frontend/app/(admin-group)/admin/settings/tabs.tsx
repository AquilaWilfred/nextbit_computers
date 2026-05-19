"use client";

/**
 * Settings tab panels — one component per section.
 *
 * Each panel:
 *  - Receives only its own slice of state + update/save helpers
 *  - Is wrapped in React.memo so re-renders are isolated
 *  - Has no knowledge of sibling tabs
 */

import React, { memo, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

import {
  SaveButton,
  SectionHeader,
  FieldLabel,
  ColorField,
  ImageUploadZone,
  FieldSkeleton,
} from "./primitives";

import {
  GeneralSettings,
  AppearanceSettings,
  PaymentSettings,
  ShippingSettings,
  EmailSettings,
  SecuritySettings,
  SocialSettings,
  BackupSettings,
  LogoTextEntry,
  ICON_OPTIONS,
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
  clampWords,
} from "./types";

import { useFileUpload } from "../../../../hooks/settings/useSettings";

// ─── Common panel props pattern ────────────────────────────────────────────────

interface PanelProps<T> {
  data: T;
  update: (patch: Partial<T>) => void;
  save: (label: string) => Promise<boolean>;
  isSaving: boolean;
  isDirty: boolean;
  isLoading: boolean;
}

// ─── General Tab ──────────────────────────────────────────────────────────────

export const GeneralTab = memo(function GeneralTab({
  data,
  update,
  save,
  isSaving,
  isDirty,
  isLoading,
}: PanelProps<GeneralSettings>) {
  const { upload, uploading } = useFileUpload();

  const handleHeroUpload = useCallback(
    async (file: File) => {
      try {
        const url = await upload(file);
        if (url) update({ heroImage: url });
        return url;
      } catch (e: any) {
        toast.error(e.message);
        return null;
      }
    },
    [upload, update]
  );

  if (isLoading) return <FieldSkeleton rows={6} />;

  return (
    <Card className="p-6 space-y-6" aria-label="General settings">
      <h3 className="text-lg font-semibold">General Settings</h3>

      {/* Store identity */}
      <div className="space-y-4">
        <div>
          <FieldLabel htmlFor="storeName">Store Name</FieldLabel>
          <Input
            id="storeName"
            value={data.storeName}
            onChange={(e) => update({ storeName: e.target.value })}
            placeholder="My Store"
          />
        </div>

        <div>
          <FieldLabel htmlFor="storeDescription">Store Description</FieldLabel>
          <Textarea
            id="storeDescription"
            value={data.storeDescription}
            onChange={(e) => update({ storeDescription: e.target.value })}
            placeholder="Premium Computer & Laptop Store"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="contactEmail">Contact Email</FieldLabel>
            <Input
              id="contactEmail"
              type="email"
              value={data.contactEmail}
              onChange={(e) => update({ contactEmail: e.target.value })}
              placeholder="support@company.com"
            />
          </div>
          <div>
            <FieldLabel htmlFor="phone">Phone</FieldLabel>
            <Input
              id="phone"
              type="tel"
              value={data.phone}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="address">Address</FieldLabel>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => update({ address: e.target.value })}
            placeholder="123 Main St, City, Country"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Currency */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Currency</FieldLabel>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch("https://ipapi.co/json/");
                    const d = await res.json();
                    if (d.currency) {
                      update({ currency: d.currency });
                      toast.success(`Currency detected: ${d.currency}`);
                    } else throw new Error();
                  } catch {
                    toast.error("Could not detect currency");
                  }
                }}
                className="text-xs text-[var(--brand)] hover:underline focus-visible:underline"
              >
                Detect Auto
              </button>
            </div>
            <Select
              value={data.currency}
              onValueChange={(v) => update({ currency: v })}
            >
              <SelectTrigger aria-label="Currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {!CURRENCY_OPTIONS.some((c) => c.value === data.currency) &&
                  data.currency && (
                    <SelectItem value={data.currency}>{data.currency}</SelectItem>
                  )}
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timezone */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Timezone</FieldLabel>
              <button
                type="button"
                onClick={() => {
                  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
                  update({ timezone: tz });
                  toast.success(`Timezone detected: ${tz}`);
                }}
                className="text-xs text-[var(--brand)] hover:underline focus-visible:underline"
              >
                Detect Auto
              </button>
            </div>
            <Select
              value={data.timezone}
              onValueChange={(v) => update({ timezone: v })}
            >
              <SelectTrigger aria-label="Timezone">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {!TIMEZONE_OPTIONS.some((t) => t.value === data.timezone) &&
                  data.timezone && (
                    <SelectItem value={data.timezone}>{data.timezone}</SelectItem>
                  )}
                {TIMEZONE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Homepage content */}
      <SectionHeader title="Homepage Content" />
      <div className="space-y-4">
        <ImageUploadZone
          id="heroImage"
          label="Hero Image"
          value={data.heroImage}
          onChange={(url) => update({ heroImage: url })}
          onUpload={handleHeroUpload}
          uploading={uploading}
          previewClassName="w-full max-w-sm h-auto object-cover rounded-md border border-border"
        />

        <div>
          <FieldLabel htmlFor="heroBadge">Hero Badge</FieldLabel>
          <Input
            id="heroBadge"
            list="hero-badge-suggestions"
            value={data.heroBadge}
            onChange={(e) => update({ heroBadge: e.target.value })}
            placeholder="New Arrivals 2025"
          />
          <datalist id="hero-badge-suggestions">
            {[
              "New Arrivals 2025",
              "Flash Sale Today",
              "Spring Collection 2026",
              "Limited Edition",
              "Bestsellers",
              "Clearance Event",
            ].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>

        <div>
          <FieldLabel htmlFor="heroTitle">Hero Title</FieldLabel>
          <Input
            id="heroTitle"
            value={data.heroTitle}
            onChange={(e) => update({ heroTitle: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="heroDescription">Hero Description</FieldLabel>
          <Textarea
            id="heroDescription"
            value={data.heroDescription}
            onChange={(e) => update({ heroDescription: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="ctaTitle">CTA Title</FieldLabel>
          <Input
            id="ctaTitle"
            value={data.ctaTitle}
            onChange={(e) => update({ ctaTitle: e.target.value })}
          />
        </div>

        <div>
          <FieldLabel htmlFor="ctaDescription">CTA Description</FieldLabel>
          <Textarea
            id="ctaDescription"
            value={data.ctaDescription}
            onChange={(e) => update({ ctaDescription: e.target.value })}
          />
        </div>
      </div>

      {/* Stats */}
      <SectionHeader
        title="Homepage Statistics"
        description="Leave empty to use live database metrics."
      />
      <div className="grid grid-cols-3 gap-4">
        {(
          [
            { key: "statsProductCount", label: "Products", placeholder: "500" },
            { key: "statsCustomerCount", label: "Customers", placeholder: "1000" },
            { key: "statsAvgRating", label: "Avg. Rating", placeholder: "4.9" },
          ] as const
        ).map(({ key, label, placeholder }) => (
          <div key={key}>
            <FieldLabel htmlFor={key}>{label}</FieldLabel>
            <Input
              id={key}
              value={(data as any)[key]}
              placeholder={placeholder}
              onChange={(e) => update({ [key]: e.target.value } as any)}
            />
          </div>
        ))}
      </div>

      {/* Features */}
      <SectionHeader
        title="Store Features (Hero Bar)"
        description="Customize the 4 highlights displayed under the main banner."
      />
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        role="list"
        aria-label="Store features"
      >
        {data.features?.map((feat, idx) => (
          <fieldset
            key={idx}
            className="p-4 border border-border rounded-lg space-y-3 bg-secondary/30"
            aria-label={`Feature ${idx + 1}`}
          >
            <legend className="text-sm font-semibold px-1">Feature {idx + 1}</legend>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor={`feat-icon-${idx}`}>Icon</label>
              <Select
                value={feat.icon}
                onValueChange={(v) => {
                  const next = [...data.features];
                  next[idx] = { ...next[idx], icon: v };
                  update({ features: next });
                }}
              >
                <SelectTrigger id={`feat-icon-${idx}`} className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(["title", "desc", "content"] as const).map((field) => (
              <div key={field} className="space-y-1">
                <label
                  className="text-xs text-muted-foreground capitalize"
                  htmlFor={`feat-${field}-${idx}`}
                >
                  {field === "desc" ? "Description" : field === "content" ? "Detailed Content" : "Title"}
                </label>
                {field === "content" ? (
                  <Textarea
                    id={`feat-${field}-${idx}`}
                    value={feat[field] || ""}
                    rows={3}
                    className="bg-background"
                    onChange={(e) => {
                      const next = [...data.features];
                      next[idx] = { ...next[idx], [field]: e.target.value };
                      update({ features: next });
                    }}
                  />
                ) : (
                  <Input
                    id={`feat-${field}-${idx}`}
                    value={feat[field]}
                    className="bg-background"
                    onChange={(e) => {
                      const next = [...data.features];
                      next[idx] = { ...next[idx], [field]: e.target.value };
                      update({ features: next });
                    }}
                  />
                )}
              </div>
            ))}
          </fieldset>
        ))}
      </div>

      {/* Floating badges */}
      <SectionHeader
        title="Hero Floating Badges"
        description="Customize the floating badges overlaid on the hero image."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            { key: "floatingBadge1" as const, label: "Bottom Left Badge" },
            { key: "floatingBadge2" as const, label: "Top Right Badge" },
          ]
        ).map(({ key, label }) => {
          const badge = data[key];
          return (
            <fieldset
              key={key}
              className="p-4 border border-border rounded-lg space-y-3 bg-secondary/30"
            >
              <legend className="text-sm font-semibold px-1">{label}</legend>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`${key}-icon`}>Icon</label>
                <Select
                  value={badge?.icon}
                  onValueChange={(v) => update({ [key]: { ...badge, icon: v } } as any)}
                >
                  <SelectTrigger id={`${key}-icon`} className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(["title", "desc"] as const).map((field) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs text-muted-foreground capitalize" htmlFor={`${key}-${field}`}>
                    {field === "desc" ? "Description" : "Title"}
                  </label>
                  <Input
                    id={`${key}-${field}`}
                    value={badge?.[field] ?? ""}
                    className="bg-background"
                    onChange={(e) =>
                      update({ [key]: { ...badge, [field]: e.target.value } } as any)
                    }
                  />
                </div>
              ))}
            </fieldset>
          );
        })}
      </div>

      {/* Opening hours */}
      <SectionHeader
        title="Opening Hours"
        description="Displayed in your store's map & contact section."
      />
      <div className="space-y-3" role="list" aria-label="Opening hours">
        {data.openingHours?.map((hour, idx) => (
          <div key={idx} className="flex items-center gap-3" role="listitem">
            <Input
              aria-label={`Day label ${idx + 1}`}
              placeholder="Mon – Fri"
              value={hour.label}
              className="w-1/3"
              onChange={(e) => {
                const next = [...data.openingHours];
                next[idx] = { ...next[idx], label: e.target.value };
                update({ openingHours: next });
              }}
            />
            <Input
              aria-label={`Hours for row ${idx + 1}`}
              placeholder="9:00 AM – 8:00 PM"
              value={hour.value}
              className="flex-1"
              onChange={(e) => {
                const next = [...data.openingHours];
                next[idx] = { ...next[idx], value: e.target.value };
                update({ openingHours: next });
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove hours row ${idx + 1}`}
              className="text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() =>
                update({ openingHours: data.openingHours.filter((_, i) => i !== idx) })
              }
            >
              <X size={16} aria-hidden="true" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 mt-1"
          onClick={() =>
            update({
              openingHours: [...(data.openingHours || []), { label: "", value: "" }],
            })
          }
        >
          <Plus size={16} aria-hidden="true" /> Add Row
        </Button>
      </div>

      <SaveButton
        onClick={() => save("General")}
        isSaving={isSaving}
        isDirty={isDirty}
      />
    </Card>
  );
});

// ─── Appearance Tab ───────────────────────────────────────────────────────────

export const AppearanceTab = memo(function AppearanceTab({
  data,
  update,
  save,
  isSaving,
  isDirty,
  isLoading,
}: PanelProps<AppearanceSettings>) {
  const { upload, uploading } = useFileUpload();

  const handleUpload = useCallback(
    (key: "logoUrl" | "faviconUrl") =>
      async (file: File) => {
        try {
          const url = await upload(file);
          if (url) update({ [key]: url } as any);
          return url;
        } catch (e: any) {
          toast.error(e.message);
          return null;
        }
      },
    [upload, update]
  );

  const logoTextItems: LogoTextEntry[] = data.logoTextItems || [];

  const addLogoText = useCallback(() => {
    if (logoTextItems.length >= 3) return;
    update({
      logoTextItems: [
        ...logoTextItems,
        {
          text: "",
          bold: false,
          italic: false,
          underline: false,
          font: "Inter",
          color: "#111827",
          position: "default",
        },
      ],
    });
  }, [logoTextItems, update]);

  const updateLogoText = useCallback(
    (idx: number, patch: Partial<LogoTextEntry>) => {
      const next = [...logoTextItems] as LogoTextEntry[];
      next[idx] = { ...next[idx], ...patch };
      update({ logoTextItems: next });
    },
    [logoTextItems, update]
  );

  const removeLogoText = useCallback(
    (idx: number) => {
      update({ logoTextItems: logoTextItems.filter((_, i) => i !== idx) });
    },
    [logoTextItems, update]
  );

  if (isLoading) return <FieldSkeleton rows={5} />;

  return (
    <Card className="p-6 space-y-6" aria-label="Appearance settings">
      <h3 className="text-lg font-semibold">Appearance Settings</h3>

      {/* Brand colors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ColorField
          id="primaryColor"
          label="Primary Color"
          value={data.primaryColor}
          onChange={(v) => update({ primaryColor: v })}
        />
        <ColorField
          id="secondaryColor"
          label="Secondary Color"
          value={data.secondaryColor}
          onChange={(v) => update({ secondaryColor: v })}
        />
        <ColorField
          id="promoBannerColor"
          label="Promo Banner Color"
          value={data.promoBannerColor || "#3b82f6"}
          onChange={(v) => update({ promoBannerColor: v })}
        />
      </div>

      {/* Theme preview */}
      <div>
        <FieldLabel>Live Theme Preview</FieldLabel>
        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
          aria-label="Theme color preview"
        >
          {/* Light preview */}
          <div
            className="border border-border rounded-xl overflow-hidden shadow-sm flex flex-col bg-white text-zinc-900 pointer-events-none select-none"
            aria-hidden="true"
          >
            <div
              className="h-6 w-full flex items-center justify-center text-[10px] font-bold text-white tracking-widest"
              style={{ backgroundColor: data.promoBannerColor }}
            >
              PROMO BANNER
            </div>
            <div className="p-5 flex-1">
              <div className="flex items-center justify-between mb-5">
                <div className="font-black tracking-tight text-lg">STORE</div>
                <div className="flex gap-3 text-[10px] text-zinc-500 font-bold uppercase">
                  <span>Shop</span><span>About</span>
                </div>
              </div>
              <h4 className="text-xl font-bold mb-1">Light Mode</h4>
              <p className="text-xs text-zinc-500 mb-5">Preview of brand colors on light backgrounds.</p>
              <div className="flex gap-2">
                <div className="px-4 py-2 rounded-md text-[11px] font-semibold text-white" style={{ backgroundColor: data.primaryColor }}>Primary</div>
                <div className="px-4 py-2 rounded-md text-[11px] font-semibold text-white" style={{ backgroundColor: data.secondaryColor }}>Secondary</div>
              </div>
            </div>
          </div>
          {/* Dark preview */}
          <div
            className="border border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col bg-zinc-950 text-zinc-50 pointer-events-none select-none"
            aria-hidden="true"
          >
            <div
              className="h-6 w-full flex items-center justify-center text-[10px] font-bold text-white tracking-widest"
              style={{ backgroundColor: data.promoBannerColor }}
            >
              PROMO BANNER
            </div>
            <div className="p-5 flex-1">
              <div className="flex items-center justify-between mb-5">
                <div className="font-black tracking-tight text-lg text-white">STORE</div>
                <div className="flex gap-3 text-[10px] text-zinc-400 font-bold uppercase">
                  <span>Shop</span><span>About</span>
                </div>
              </div>
              <h4 className="text-xl font-bold mb-1 text-white">Dark Mode</h4>
              <p className="text-xs text-zinc-400 mb-5">Preview of brand colors on dark backgrounds.</p>
              <div className="flex gap-2">
                <div className="px-4 py-2 rounded-md text-[11px] font-semibold text-white" style={{ backgroundColor: data.primaryColor }}>Primary</div>
                <div className="px-4 py-2 rounded-md text-[11px] font-semibold text-white" style={{ backgroundColor: data.secondaryColor }}>Secondary</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logo */}
      <ImageUploadZone
        id="logo"
        label="Logo"
        value={data.logoUrl}
        onChange={(url) => update({ logoUrl: url })}
        onUpload={handleUpload("logoUrl")}
        uploading={uploading}
        hint="PNG, JPG, SVG up to 2MB"
      />

      {/* Logo text entries */}
      <div className="border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <FieldLabel>Logo Text Entries</FieldLabel>
            <p className="text-xs text-muted-foreground">Add up to 3 styled words or phrases.</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addLogoText}
            disabled={logoTextItems.length >= 3}
            aria-disabled={logoTextItems.length >= 3}
          >
            Add Text
          </Button>
        </div>

        {logoTextItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed border-border rounded-xl">
            No text entries yet. Click Add Text to begin.
          </p>
        ) : (
          <div className="space-y-4">
            {logoTextItems.map((item, idx) => (
              <fieldset
                key={idx}
                className="border border-border rounded-xl p-3 space-y-3"
                aria-label={`Logo text entry ${idx + 1}`}
              >
                <legend className="sr-only">Logo text {idx + 1}</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor={`lt-text-${idx}`}>Text</FieldLabel>
                    <Input
                      id={`lt-text-${idx}`}
                      value={item.text}
                      placeholder={`Text ${idx + 1}`}
                      onChange={(e) => updateLogoText(idx, { text: e.target.value })}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor={`lt-color-${idx}`}>Color</FieldLabel>
                    <Input
                      id={`lt-color-${idx}`}
                      type="color"
                      value={item.color || "#111827"}
                      onChange={(e) => updateLogoText(idx, { color: e.target.value })}
                      className="w-full h-11 p-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FieldLabel htmlFor={`lt-font-${idx}`}>Font</FieldLabel>
                    <Select
                      value={item.font || "Inter"}
                      onValueChange={(v) => updateLogoText(idx, { font: v })}
                    >
                      <SelectTrigger id={`lt-font-${idx}`} className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Inter", "Poppins", "Montserrat", "Roboto", "Lato"].map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel htmlFor={`lt-pos-${idx}`}>Position</FieldLabel>
                    <Select
                      value={item.position || "default"}
                      onValueChange={(v) => updateLogoText(idx, { position: v as any })}
                    >
                      <SelectTrigger id={`lt-pos-${idx}`} className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Use global side</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["bold", "italic", "underline"] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={item[style]}
                      aria-label={`Toggle ${style}`}
                      className={`rounded-md border px-2.5 py-1 text-sm font-semibold transition-colors ${
                        item[style]
                          ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                      onClick={() => updateLogoText(idx, { [style]: !item[style] } as any)}
                    >
                      {style === "bold" ? "B" : style === "italic" ? "I" : "U"}
                    </button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeLogoText(idx)}
                    aria-label={`Remove logo text ${idx + 1}`}
                  >
                    Remove
                  </Button>
                </div>
              </fieldset>
            ))}
          </div>
        )}
      </div>

      {/* Logo sizing & crop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="logoWidth">Logo Width (px)</FieldLabel>
          <Input
            id="logoWidth"
            type="number"
            min={40}
            value={data.logoWidth || 120}
            onChange={(e) => update({ logoWidth: Number(e.target.value) })}
          />
        </div>
        <div>
          <FieldLabel htmlFor="logoHeight">Logo Height (px)</FieldLabel>
          <Input
            id="logoHeight"
            type="number"
            min={24}
            value={data.logoHeight || 56}
            onChange={(e) => update({ logoHeight: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="logoCropMode">Logo Crop Mode</FieldLabel>
          <Select
            value={data.logoCropMode || "none"}
            onValueChange={(v) => update({ logoCropMode: v })}
          >
            <SelectTrigger id="logoCropMode" className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["none", "cover", "crop-left", "crop-right", "crop-top", "crop-bottom"].map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel htmlFor="logoCropAmount">
            Crop Amount: {data.logoCropAmount ?? 0}%
          </FieldLabel>
          <input
            id="logoCropAmount"
            type="range"
            min={0}
            max={50}
            value={data.logoCropAmount ?? 0}
            onChange={(e) => update({ logoCropAmount: Number(e.target.value) })}
            className="w-full mt-2"
            aria-valuenow={data.logoCropAmount ?? 0}
            aria-valuemin={0}
            aria-valuemax={50}
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="logoOpacity">
          Logo Transparency: {Math.round((data.logoOpacity ?? 1) * 100)}%
        </FieldLabel>
        <input
          id="logoOpacity"
          type="range"
          min={0}
          max={100}
          value={Math.round((data.logoOpacity ?? 1) * 100)}
          onChange={(e) => update({ logoOpacity: Number(e.target.value) / 100 })}
          className="w-full mt-2"
          aria-label="Logo opacity"
        />
      </div>

      <div>
        <FieldLabel htmlFor="footerAdText">Footer Promo Text</FieldLabel>
        <Input
          id="footerAdText"
          value={data.footerAdText || ""}
          onChange={(e) => update({ footerAdText: clampWords(e.target.value, 15) })}
          placeholder="AI-powered deals and recommendations"
          maxLength={120}
        />
        <p className="text-xs text-muted-foreground mt-1">Limited to 15 words.</p>
      </div>

      {/* Favicon */}
      <ImageUploadZone
        id="favicon"
        label="Favicon"
        value={data.faviconUrl}
        onChange={(url) => update({ faviconUrl: url })}
        onUpload={handleUpload("faviconUrl")}
        uploading={uploading}
        accept="image/x-icon,image/png,image/svg+xml"
        hint=".ico, .png, .svg up to 2MB"
        previewClassName="h-12 w-12 object-contain"
      />

      {/* Theme preferences */}
      <SectionHeader title="Theme Preferences" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(
          [
            { key: "userTheme" as const, label: "Storefront Theme", desc: "Default theme for your customers." },
            { key: "adminTheme" as const, label: "Admin Panel Theme", desc: "Default theme for the admin dashboard." },
          ]
        ).map(({ key, label, desc }) => (
          <div key={key}>
            <FieldLabel htmlFor={key}>{label}</FieldLabel>
            <Select
              value={data[key] || "light"}
              onValueChange={(v) => update({ [key]: v } as any)}
            >
              <SelectTrigger id={key} className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System (Auto)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">{desc}</p>
          </div>
        ))}
      </div>

      <SaveButton onClick={() => save("Appearance")} isSaving={isSaving} isDirty={isDirty} />
    </Card>
  );
});

// ─── Payment Tab ───────────────────────────────────────────────────────────────

export const PaymentTab = memo(function PaymentTab({
  data,
  update,
  save,
  isSaving,
  isDirty,
  isLoading,
}: PanelProps<PaymentSettings>) {
  if (isLoading) return <FieldSkeleton rows={4} />;

  return (
    <Card className="p-6 space-y-6" aria-label="Payment settings">
      <h3 className="text-lg font-semibold">Payment Gateway Credentials</h3>

      {/* M-Pesa */}
      <fieldset className="space-y-3">
        <legend className="font-medium text-sm mb-2">M-Pesa</legend>
        <div className="grid grid-cols-2 gap-4">
          {(
            [
              { key: "mpesaKey", label: "Consumer Key" },
              { key: "mpesaSecret", label: "Consumer Secret" },
            ] as const
          ).map(({ key, label }) => (
            <div key={key}>
              <FieldLabel htmlFor={key}>{label}</FieldLabel>
              <Input
                id={key}
                type="password"
                placeholder={label}
                value={(data as any)[key]}
                onChange={(e) => update({ [key]: e.target.value } as any)}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="mpesaShortcode">Business Shortcode</FieldLabel>
            <Input
              id="mpesaShortcode"
              placeholder="e.g. 174379"
              value={data.mpesaShortcode}
              onChange={(e) => update({ mpesaShortcode: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel htmlFor="mpesaEnv">Environment</FieldLabel>
            <Select
              value={data.mpesaEnv || "sandbox"}
              onValueChange={(v) => update({ mpesaEnv: v })}
            >
              <SelectTrigger id="mpesaEnv" className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                <SelectItem value="production">Production (Live)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="mpesaPasskey">STK Passkey</FieldLabel>
          <Input
            id="mpesaPasskey"
            type="password"
            placeholder="STK Push Passkey"
            value={data.mpesaPasskey}
            onChange={(e) => update({ mpesaPasskey: e.target.value })}
            autoComplete="off"
          />
        </div>
      </fieldset>

      {/* PayPal */}
      <fieldset className="border-t border-border pt-6 space-y-3">
        <legend className="font-medium text-sm mb-2">PayPal</legend>
        {(
          [
            { key: "paypalClientId" as const, label: "Client ID" },
            { key: "paypalSecret" as const, label: "Secret" },
          ]
        ).map(({ key, label }) => (
          <div key={key}>
            <FieldLabel htmlFor={key}>{label}</FieldLabel>
            <Input
              id={key}
              type="password"
              placeholder={`PayPal ${label}`}
              value={data[key]}
              onChange={(e) => update({ [key]: e.target.value })}
              autoComplete="off"
            />
          </div>
        ))}
      </fieldset>

      {/* Stripe */}
      <fieldset className="border-t border-border pt-6 space-y-3">
        <legend className="font-medium text-sm mb-2">Stripe</legend>
        {(
          [
            { key: "stripePublishable" as const, label: "Publishable Key" },
            { key: "stripeSecret" as const, label: "Secret Key" },
          ]
        ).map(({ key, label }) => (
          <div key={key}>
            <FieldLabel htmlFor={key}>{label}</FieldLabel>
            <Input
              id={key}
              type="password"
              placeholder={`Stripe ${label}`}
              value={data[key]}
              onChange={(e) => update({ [key]: e.target.value })}
              autoComplete="off"
            />
          </div>
        ))}
      </fieldset>

      {/* COD */}
      <div className="border-t border-border pt-6 flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
        <div>
          <label htmlFor="codEnabled" className="font-medium text-sm cursor-pointer">
            Cash on Delivery (COD)
          </label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Allow customers to pay in cash upon receiving their order.
          </p>
        </div>
        <Switch
          id="codEnabled"
          checked={data.codEnabled}
          onCheckedChange={(v) => update({ codEnabled: v })}
          aria-label="Enable Cash on Delivery"
        />
      </div>

      <SaveButton onClick={() => save("Payment")} isSaving={isSaving} isDirty={isDirty} label="Save Credentials" />
    </Card>
  );
});

// ─── Shipping Tab ──────────────────────────────────────────────────────────────

export const ShippingTab = memo(function ShippingTab({
  data,
  update,
  save,
  isSaving,
  isDirty,
  isLoading,
}: PanelProps<ShippingSettings>) {
  if (isLoading) return <FieldSkeleton rows={3} />;

  const fields = [
    { key: "standardFee" as const, label: "Standard Shipping Fee", placeholder: "10.00" },
    { key: "expressDelivery" as const, label: "Express Delivery Fee", placeholder: "25.00" },
    { key: "freeShippingThreshold" as const, label: "Free Shipping Threshold", placeholder: "100.00" },
  ];

  return (
    <Card className="p-6 space-y-4" aria-label="Shipping settings">
      <h3 className="text-lg font-semibold">Shipping Settings</h3>
      {fields.map(({ key, label, placeholder }) => (
        <div key={key}>
          <FieldLabel htmlFor={key}>{label}</FieldLabel>
          <Input
            id={key}
            type="number"
            step="0.01"
            min="0"
            value={data[key]}
            placeholder={placeholder}
            onChange={(e) => update({ [key]: e.target.value })}
          />
        </div>
      ))}
      <SaveButton onClick={() => save("Shipping")} isSaving={isSaving} isDirty={isDirty} />
    </Card>
  );
});

// ─── Email Tab ─────────────────────────────────────────────────────────────────

export const EmailTab = memo(function EmailTab({
  data,
  update,
  save,
  isSaving,
  isDirty,
  isLoading,
}: PanelProps<EmailSettings>) {
  if (isLoading) return <FieldSkeleton rows={5} />;

  return (
    <Card className="p-6 space-y-4" aria-label="Email settings">
      <h3 className="text-lg font-semibold">Email Settings</h3>

      <div>
        <FieldLabel htmlFor="smtpHost">SMTP Host</FieldLabel>
        <Input
          id="smtpHost"
          value={data.smtpHost}
          onChange={(e) => update({ smtpHost: e.target.value })}
          placeholder="smtp.gmail.com"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel htmlFor="smtpPort">SMTP Port</FieldLabel>
          <Input
            id="smtpPort"
            value={data.smtpPort}
            onChange={(e) => update({ smtpPort: e.target.value })}
            placeholder="587"
          />
        </div>
        <div>
          <FieldLabel htmlFor="smtpUser">SMTP User</FieldLabel>
          <Input
            id="smtpUser"
            type="email"
            value={data.smtpUser}
            onChange={(e) => update({ smtpUser: e.target.value })}
            placeholder="user@example.com"
          />
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="smtpPassword">SMTP Password</FieldLabel>
        <Input
          id="smtpPassword"
          type="password"
          value={data.smtpPassword}
          onChange={(e) => update({ smtpPassword: e.target.value })}
          autoComplete="current-password"
        />
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        {/* Order confirmation */}
        <div className="flex items-center justify-between">
          <label htmlFor="orderConfirmation" className="text-sm font-medium cursor-pointer">
            Order Confirmation Emails
          </label>
          <Switch
            id="orderConfirmation"
            checked={data.orderConfirmation}
            onCheckedChange={(v) => update({ orderConfirmation: v })}
          />
        </div>
        {data.orderConfirmation && (
          <div className="pl-4 border-l-2 border-border space-y-2">
            <FieldLabel htmlFor="orderConfirmationMessage">Custom Message</FieldLabel>
            <Textarea
              id="orderConfirmationMessage"
              value={data.orderConfirmationMessage}
              rows={2}
              onChange={(e) => update({ orderConfirmationMessage: e.target.value })}
            />
          </div>
        )}

        {/* Shipping notification */}
        <div className="flex items-center justify-between">
          <label htmlFor="shippingNotification" className="text-sm font-medium cursor-pointer">
            Shipping Notification Emails
          </label>
          <Switch
            id="shippingNotification"
            checked={data.shippingNotification}
            onCheckedChange={(v) => update({ shippingNotification: v })}
          />
        </div>
        {data.shippingNotification && (
          <div className="pl-4 border-l-2 border-border space-y-2">
            <FieldLabel htmlFor="shippingNotificationMessage">Custom Message</FieldLabel>
            <Textarea
              id="shippingNotificationMessage"
              value={data.shippingNotificationMessage}
              rows={2}
              onChange={(e) => update({ shippingNotificationMessage: e.target.value })}
            />
          </div>
        )}

        {/* Abandoned cart */}
        <div className="flex items-center justify-between">
          <label htmlFor="abandonedCartReminder" className="text-sm font-medium cursor-pointer">
            Abandoned Checkout Reminders (after 24h)
          </label>
          <Switch
            id="abandonedCartReminder"
            checked={data.abandonedCartReminder}
            onCheckedChange={(v) => update({ abandonedCartReminder: v })}
          />
        </div>
      </div>

      {/* Email appearance */}
      <SectionHeader title="Email Appearance" />
      <div className="flex items-center justify-between">
        <label htmlFor="productImageWidth" className="text-sm font-medium">
          Product Image Width (px)
        </label>
        <Input
          id="productImageWidth"
          type="number"
          value={data.productImageWidth || "40"}
          onChange={(e) => update({ productImageWidth: e.target.value })}
          className="w-24 h-9"
          min="20"
          max="200"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ColorField
          id="emailBg"
          label="Email Background Color"
          value={data.emailBackgroundColor || "#ffffff"}
          onChange={(v) => update({ emailBackgroundColor: v })}
        />
        <ColorField
          id="emailBtn"
          label="Email Button Color"
          value={data.emailButtonColor || "#3b82f6"}
          onChange={(v) => update({ emailButtonColor: v })}
        />
      </div>

      <SaveButton onClick={() => save("Email")} isSaving={isSaving} isDirty={isDirty} />
    </Card>
  );
});

// ─── Security Tab ──────────────────────────────────────────────────────────────

export const SecurityTab = memo(function SecurityTab({
  data,
  update,
  save,
  isSaving,
  isDirty,
  isLoading,
}: PanelProps<SecuritySettings>) {
  if (isLoading) return <FieldSkeleton rows={4} />;

  return (
    <Card className="p-6 space-y-4" aria-label="Security settings">
      <h3 className="text-lg font-semibold">Security Settings</h3>

      <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
        <label htmlFor="twoFactorAuth" className="text-sm font-medium cursor-pointer">
          Two-Factor Authentication
        </label>
        <Switch
          id="twoFactorAuth"
          checked={data.twoFactorAuth}
          onCheckedChange={(v) => update({ twoFactorAuth: v })}
        />
      </div>

      <div>
        <FieldLabel htmlFor="loginAttemptLimit">Login Attempt Limit</FieldLabel>
        <Input
          id="loginAttemptLimit"
          type="number"
          min={1}
          max={20}
          value={data.loginAttemptLimit}
          onChange={(e) => update({ loginAttemptLimit: e.target.value })}
          placeholder="5"
        />
      </div>

      <div className="flex items-center justify-between p-4 bg-secondary rounded-lg">
        <label htmlFor="captchaEnabled" className="text-sm font-medium cursor-pointer">
          Enable CAPTCHA
        </label>
        <Switch
          id="captchaEnabled"
          checked={data.captchaEnabled}
          onCheckedChange={(v) => update({ captchaEnabled: v })}
        />
      </div>

      {/* OAuth providers */}
      {(
        [
          {
            title: "Google OAuth Login",
            fields: [
              { key: "googleClientId" as const, label: "Client ID", type: "text" },
              { key: "googleClientSecret" as const, label: "Client Secret", type: "password" },
            ],
          },
          {
            title: "Facebook OAuth Login",
            fields: [
              { key: "facebookAppId" as const, label: "App ID", type: "text" },
              { key: "facebookAppSecret" as const, label: "App Secret", type: "password" },
            ],
          },
        ]
      ).map(({ title, fields }) => (
        <fieldset key={title} className="border-t border-border pt-6 space-y-3">
          <legend className="font-medium text-sm">{title}</legend>
          {fields.map(({ key, label, type }) => (
            <div key={key}>
              <FieldLabel htmlFor={key}>{label}</FieldLabel>
              <Input
                id={key}
                type={type}
                placeholder={label}
                value={data[key] || ""}
                onChange={(e) => update({ [key]: e.target.value })}
                autoComplete="off"
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Leave blank to use .env fallbacks or disable this provider.
          </p>
        </fieldset>
      ))}

      <SaveButton onClick={() => save("Security")} isSaving={isSaving} isDirty={isDirty} />
    </Card>
  );
});

// ─── Social Tab ────────────────────────────────────────────────────────────────

export const SocialTab = memo(function SocialTab({
  data,
  update,
  save,
  isSaving,
  isDirty,
  isLoading,
}: PanelProps<SocialSettings>) {
  if (isLoading) return <FieldSkeleton rows={6} />;

  return (
    <Card className="p-6 space-y-4" aria-label="Social media settings">
      <h3 className="text-lg font-semibold">Social Media Links</h3>
      {(Object.keys(data) as (keyof SocialSettings)[]).map((key) => (
        <div key={key}>
          <FieldLabel htmlFor={`social-${key}`}>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </FieldLabel>
          <Input
            id={`social-${key}`}
            type="url"
            value={data[key]}
            onChange={(e) => update({ [key]: e.target.value } as any)}
            placeholder={`https://${key}.com/yourstore`}
          />
        </div>
      ))}
      <SaveButton onClick={() => save("Social")} isSaving={isSaving} isDirty={isDirty} />
    </Card>
  );
});

// ─── Backup Tab ────────────────────────────────────────────────────────────────

export const BackupTab = memo(function BackupTab({
  data,
  update,
  save,
  isSaving,
  isDirty,
  isLoading,
  onDownload,
}: PanelProps<BackupSettings> & { onDownload: () => Promise<void> }) {
  if (isLoading) return <FieldSkeleton rows={2} />;

  return (
    <Card className="p-6 space-y-4" aria-label="Backup settings">
      <h3 className="text-lg font-semibold">Backup & System</h3>
      <p className="text-sm text-muted-foreground">Create and manage database backups.</p>

      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={onDownload}
          aria-label="Download manual backup"
        >
          Download Latest Backup
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <FieldLabel htmlFor="backupSchedule">Auto Backup Schedule</FieldLabel>
        <Select
          value={data.schedule}
          onValueChange={(v) => {
            update({ schedule: v as BackupSettings["schedule"] });
            save("Backup");
          }}
        >
          <SelectTrigger id="backupSchedule" className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
});