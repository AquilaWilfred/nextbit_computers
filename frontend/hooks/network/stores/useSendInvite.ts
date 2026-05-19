import { useState, useCallback } from "react";
import { toast } from "sonner";
import { InviteForm } from "@/types/network/stores/invite.types";

export function useSendInvite() {
  const [sending, setSending] = useState(false);

  const sendInvite = useCallback(async (formData: InviteForm): Promise<boolean> => {
    if (!formData.storeName || !formData.email) {
      toast.error("Store name and email are required");
      return false;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/network/stores/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) throw new Error();
      
      toast.success(`Invitation sent to ${formData.email}`);
      return true;
    } catch {
      toast.error("Failed to send invitation");
      return false;
    } finally {
      setSending(false);
    }
  }, []);

  return { sending, sendInvite };
}