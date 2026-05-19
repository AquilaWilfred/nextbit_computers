import { useState, useCallback } from "react";
import { toast } from "sonner";

export function usePasswordReset() {
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);

  const resetPassword = useCallback(async (email: string) => {
    setResettingEmail(email);
    try {
      const res = await fetch("/api/auth/reset-password-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message ?? "Error");
      }
      toast.success("Password reset link sent!");
      return true;
    } catch (err: any) {
      toast.error(err.message);
      return false;
    } finally {
      setResettingEmail(null);
    }
  }, []);

  return { resettingEmail, resetPassword };
}