"use client";

/**
 * AdminSettings — refactored settings page.
 *
 * Responsibilities of THIS file:
 *  1. Declare one useSettings() hook per section
 *  2. Wire save callbacks that show toasts
 *  3. Render <Tabs> + lazy-loaded tab panels
 *  4. Handle the backup download side-effect
 *
 * What this file does NOT do:
 *  - Manage form field state (delegated to hooks)
 *  - Contain any form markup (delegated to tab components)
 *  - Know anything about REST or WebSocket details (delegated to useSettings)
 */

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import Head from "next/head";
import { useCallback } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FieldSkeleton } from "./primitives";
import {
  useSettings,
} from "../../../../hooks/settings/useSettings";
import {
  GENERAL_DEFAULTS,
  APPEARANCE_DEFAULTS,
  PAYMENT_DEFAULTS,
  SHIPPING_DEFAULTS,
  EMAIL_DEFAULTS,
  SECURITY_DEFAULTS,
  SOCIAL_DEFAULTS,
  BACKUP_DEFAULTS,
} from "./types";

// ─── Lazy-load each heavy tab panel ───────────────────────────────────────────
// This keeps the initial JS bundle small. Each panel is only downloaded when
// the user first opens that tab.

const GeneralTab   = dynamic(() => import("./tabs").then(m => m.GeneralTab),   { loading: () => <FieldSkeleton rows={6} />, ssr: false });
const AppearanceTab = dynamic(() => import("./tabs").then(m => m.AppearanceTab), { loading: () => <FieldSkeleton rows={5} />, ssr: false });
const PaymentTab   = dynamic(() => import("./tabs").then(m => m.PaymentTab),   { loading: () => <FieldSkeleton rows={4} />, ssr: false });
const ShippingTab  = dynamic(() => import("./tabs").then(m => m.ShippingTab),  { loading: () => <FieldSkeleton rows={3} />, ssr: false });
const EmailTab     = dynamic(() => import("./tabs").then(m => m.EmailTab),     { loading: () => <FieldSkeleton rows={5} />, ssr: false });
const SecurityTab  = dynamic(() => import("./tabs").then(m => m.SecurityTab),  { loading: () => <FieldSkeleton rows={4} />, ssr: false });
const SocialTab    = dynamic(() => import("./tabs").then(m => m.SocialTab),    { loading: () => <FieldSkeleton rows={6} />, ssr: false });
const BackupTab    = dynamic(() => import("./tabs").then(m => m.BackupTab),    { loading: () => <FieldSkeleton rows={2} />, ssr: false });

// ─── Tab config — add new tabs here, zero other changes needed ─────────────────

const TABS = [
  { value: "general",    label: "General" },
  { value: "appearance", label: "Appearance" },
  { value: "payment",    label: "Payment" },
  { value: "shipping",   label: "Shipping" },
  { value: "email",      label: "Email" },
  { value: "security",   label: "Security" },
  { value: "social",     label: "Social" },
  { value: "backup",     label: "Backup" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") ?? "general";
  const activeTab = TABS.find(t => t.value === rawTab) ? rawTab : "general";
  // Each section gets its own isolated state slice + REST+WS sync
  const general    = useSettings("general",    GENERAL_DEFAULTS);
  const appearance = useSettings("appearance", APPEARANCE_DEFAULTS);
  const payment    = useSettings("payment",    PAYMENT_DEFAULTS);
  const shipping   = useSettings("shipping",   SHIPPING_DEFAULTS);
  const email      = useSettings("email",      EMAIL_DEFAULTS);
  const security   = useSettings("security",   SECURITY_DEFAULTS);
  const social     = useSettings("social",     SOCIAL_DEFAULTS);
  const backup     = useSettings("backup",     BACKUP_DEFAULTS);

  // ── Save wrapper — adds toast feedback ────────────────────────────────────
  const makeSave = useCallback(
    (hook: ReturnType<typeof useSettings>) =>
      async (label: string): Promise<boolean> => {
        const ok = await hook.save(label);
        if (ok) {
          toast.success(`${label} settings saved`);
        } else if (hook.error) {
          toast.error(`Failed to save ${label} settings: ${hook.error}`);
        }
        return ok;
      },
    []
  );

  // ── Backup download ────────────────────────────────────────────────────────
  const handleDownloadBackup = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/export-database");
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = general.data.storeName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") || "store";
      a.download = `${safeName}-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (err: any) {
      toast.error(`Backup failed: ${err.message}`);
    }
  }, [general.data.storeName]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/*
        SEO / accessibility metadata.
        Admin pages are typically noindex, but we still want good
        <title> and a meaningful <main> landmark for screen readers.
      */}
      <Head>
        <title>Settings — {general.data.storeName} Admin</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Configure store settings, appearance, payments, and more." />
      </Head>

      <div>
        <div className="space-y-6">

          {/* Page header */}
          <header>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your store settings and preferences
            </p>
          </header>

          {/* Settings tabs */}
          <Tabs value={activeTab} onValueChange={(value) => {
            // Update URL without full page reload
            const url = new URL(window.location.href);
            url.searchParams.set('tab', value);
            window.history.replaceState({}, '', url.toString());
            // Note: activeTab will update via searchParams on re-render
          }} className="w-full">
            {/* Tab navigation — keyboard accessible via shadcn primitives */}
            <TabsList
              className="grid w-full grid-cols-4 lg:grid-cols-8"
              aria-label="Settings sections"
            >
              {TABS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ── General ─────────────────────────────────────────────── */}
            <TabsContent value="general">
              <GeneralTab
                data={general.data}
                update={general.update}
                save={makeSave(general)}
                isSaving={general.isSaving}
                isDirty={general.isDirty}
                isLoading={general.isLoading}
              />
            </TabsContent>

            {/* ── Appearance ──────────────────────────────────────────── */}
            <TabsContent value="appearance">
              <AppearanceTab
                data={appearance.data}
                update={appearance.update}
                save={makeSave(appearance)}
                isSaving={appearance.isSaving}
                isDirty={appearance.isDirty}
                isLoading={appearance.isLoading}
              />
            </TabsContent>

            {/* ── Payment ─────────────────────────────────────────────── */}
            <TabsContent value="payment">
              <PaymentTab
                data={payment.data}
                update={payment.update}
                save={makeSave(payment)}
                isSaving={payment.isSaving}
                isDirty={payment.isDirty}
                isLoading={payment.isLoading}
              />
            </TabsContent>

            {/* ── Shipping ────────────────────────────────────────────── */}
            <TabsContent value="shipping">
              <ShippingTab
                data={shipping.data}
                update={shipping.update}
                save={makeSave(shipping)}
                isSaving={shipping.isSaving}
                isDirty={shipping.isDirty}
                isLoading={shipping.isLoading}
              />
            </TabsContent>

            {/* ── Email ───────────────────────────────────────────────── */}
            <TabsContent value="email">
              <EmailTab
                data={email.data}
                update={email.update}
                save={makeSave(email)}
                isSaving={email.isSaving}
                isDirty={email.isDirty}
                isLoading={email.isLoading}
              />
            </TabsContent>

            {/* ── Security ────────────────────────────────────────────── */}
            <TabsContent value="security">
              <SecurityTab
                data={security.data}
                update={security.update}
                save={makeSave(security)}
                isSaving={security.isSaving}
                isDirty={security.isDirty}
                isLoading={security.isLoading}
              />
            </TabsContent>

            {/* ── Social ──────────────────────────────────────────────── */}
            <TabsContent value="social">
              <SocialTab
                data={social.data}
                update={social.update}
                save={makeSave(social)}
                isSaving={social.isSaving}
                isDirty={social.isDirty}
                isLoading={social.isLoading}
              />
            </TabsContent>

            {/* ── Backup ──────────────────────────────────────────────── */}
            <TabsContent value="backup">
              <BackupTab
                data={backup.data}
                update={backup.update}
                save={makeSave(backup)}
                isSaving={backup.isSaving}
                isDirty={backup.isDirty}
                isLoading={backup.isLoading}
                onDownload={handleDownloadBackup}
              />
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </>
  );
}