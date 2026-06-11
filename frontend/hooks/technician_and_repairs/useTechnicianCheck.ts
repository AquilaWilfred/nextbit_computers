// hooks/useTechnicianCheck.ts
import { useState, useEffect } from "react";
import { proxyClient } from "@/lib/api-client";

export function useTechnicianCheck(user: any) {
  const [showApplication, setShowApplication] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | undefined>(undefined);
  const [pendingUserEmail, setPendingUserEmail] = useState("");

  useEffect(() => {
    const checkTechnicianStatus = async () => {
      if (user?.id) {
        try {
          const response = await proxyClient.get<any>(`/api/technician/profile?user_id=${user.id}`);
          if (!response) {
            setPendingUserId(user.id);
            setPendingUserEmail(user.email || "");
            setShowApplication(true);
          }
        } catch (error: any) {
          if (error.message?.includes("404")) {
            setPendingUserId(user.id);
            setPendingUserEmail(user.email || "");
            setShowApplication(true);
          } else {
            console.error("Failed to check technician status", error);
          }
        }
      }
    };
    
    if (user && !showApplication) {
      checkTechnicianStatus();
    }
  }, [user]);

  return { showApplication, setShowApplication, pendingUserId, pendingUserEmail };
}