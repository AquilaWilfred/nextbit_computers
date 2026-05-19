// hooks/useTechnicianActions.ts
import { useCallback } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { JobStatus, QuoteLineItem, TechnicianProfile } from "@/types/technician.types";
import { proxyClient } from "@/lib/api-client";

type OptimisticUpdater = (updater: (prev: any) => any) => void;

export function useTechnicianActions(
  onRefresh: () => void,
  setOptimistic: OptimisticUpdater  // passed from useTechnicianData
) {
  const { user } = useAuth();
  const uid = user?.id;

  // ─── Availability ───────────────────────────────────────────────
  const updateAvailability = useCallback(async (available: boolean): Promise<boolean> => {
    // 1. Optimistic — UI updates instantly
    setOptimistic((prev) => ({
      ...prev,
      profile: prev.profile ? { ...prev.profile, available } : prev.profile,
    }));

    try {
      await proxyClient.patch(`/api/technician/availability?user_id=${uid}&available=${available}`);
      toast.success(available ? "You're now available" : "You're now unavailable");
      onRefresh(); // background sync — no await, UI already updated
      return true;
    } catch (err) {
      // 2. Rollback — revert the optimistic update
      setOptimistic((prev) => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, available: !available } : prev.profile,
      }));
      console.error(err);
      toast.error("Failed to update availability");
      return false;
    }
  }, [uid, onRefresh, setOptimistic]);

  // ─── Decline request ─────────────────────────────────────────────
  const declineRequest = useCallback(async (reqId: string): Promise<boolean> => {
    // Optimistic — remove from incoming list instantly
    setOptimistic((prev) => ({
      ...prev,
      incoming: prev.incoming.filter((r: any) => r.id !== reqId),
    }));

    try {
      await proxyClient.post(`/api/technician/requests/${reqId}/decline?user_id=${uid}`);
      toast.info("Request declined");
      onRefresh(); // background sync
      return true;
    } catch (err) {
      // Rollback — full refresh to restore the removed item
      onRefresh();
      console.error(err);
      toast.error("Failed to decline request");
      return false;
    }
  }, [uid, onRefresh, setOptimistic]);

  // ─── Send quote ──────────────────────────────────────────────────
  const sendQuote = useCallback(async (
    requestId: string,
    lines: QuoteLineItem[],
    notes: string,
    warrantyDays: number
  ): Promise<boolean> => {
    const total = lines.reduce((s, l) => s + l.amount, 0);

    // Optimistic — mark request as "quote_sent" immediately
    setOptimistic((prev) => ({
      ...prev,
      incoming: prev.incoming.map((r: any) =>
        r.id === requestId ? { ...r, status: "quote_sent" } : r
      ),
    }));

    try {
      await proxyClient.post(`/api/technician/quotes?user_id=${uid}`, {
        request_id: requestId,
        line_items: lines,
        notes,
        warranty_days: warrantyDays,
      });
      toast.success(`Quote of KES ${total.toLocaleString()} sent`);
      onRefresh();
      return true;
    } catch (err) {
      // Rollback
      setOptimistic((prev) => ({
        ...prev,
        incoming: prev.incoming.map((r: any) =>
          r.id === requestId ? { ...r, status: "pending" } : r
        ),
      }));
      console.error(err);
      toast.error("Failed to send quote");
      return false;
    }
  }, [uid, onRefresh, setOptimistic]);

  // ─── Update job status ───────────────────────────────────────────
  const updateJobStatus = useCallback(async (
    jobId: string,
    newStatus: JobStatus
  ): Promise<boolean> => {
    // Snapshot previous status for rollback
    let previousStatus: JobStatus | null = null;

    setOptimistic((prev) => {
      const job = prev.jobs?.find((j: any) => j.id === jobId);
      previousStatus = job?.status ?? null;
      return {
        ...prev,
        jobs: prev.jobs?.map((j: any) =>
          j.id === jobId ? { ...j, status: newStatus } : j
        ),
      };
    });

    try {
      await proxyClient.patch(`/api/technician/jobs/${jobId}/status?user_id=${uid}`, { status: newStatus });
      toast.success("Job status updated");
      onRefresh();
      return true;
    } catch (err) {
      // Rollback to previous status
      if (previousStatus) {
        setOptimistic((prev) => ({
          ...prev,
          jobs: prev.jobs?.map((j: any) =>
            j.id === jobId ? { ...j, status: previousStatus } : j
          ),
        }));
      }
      console.error(err);
      toast.error("Failed to update job status");
      return false;
    }
  }, [uid, onRefresh, setOptimistic]);

  // ─── Save profile ────────────────────────────────────────────────
  // No optimistic update here — profile saves are deliberate,
  // user expects a confirmation before the UI reflects changes
  const saveProfile = useCallback(async (profile: TechnicianProfile): Promise<boolean> => {
    try {
      await proxyClient.put(`/api/technician/profile?user_id=${uid}`, {
        location:       profile.location,
        bio:            profile.bio,
        specialties:    profile.specialties,
        min_price:      profile.minPrice,
        warranty_days:  profile.warrantyDays,
        service_radius: profile.serviceRadius,
      });

      // Optimistic applied AFTER success for profile — safer UX
      setOptimistic((prev) => {
        const profileBase = prev?.profile ?? null;
        return {
          ...prev,
          profile: profileBase ? { ...profileBase, ...profile } : profile,
        };
      });

      toast.success("Profile saved");
      onRefresh();
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to save profile");
      return false;
    }
  }, [uid, onRefresh, setOptimistic]);

  return {
    updateAvailability,
    declineRequest,
    sendQuote,
    updateJobStatus,
    saveProfile,
  };
}