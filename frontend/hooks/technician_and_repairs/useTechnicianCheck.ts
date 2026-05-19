// hooks/useTechnicianCheck.ts
import { useState, useEffect } from "react";

export function useTechnicianCheck(user: any) {
  const [showApplication, setShowApplication] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | undefined>(undefined);
  const [pendingUserEmail, setPendingUserEmail] = useState("");

  useEffect(() => {
    const checkTechnicianStatus = async () => {
      if (user?.id) {
        try {
          const response = await fetch(`/api/technician/profile?user_id=${user.id}`);
          if (response.status === 404) {
            setPendingUserId(user.id);
            setPendingUserEmail(user.email || "");
            setShowApplication(true);
          }
        } catch (error) {
          console.error("Failed to check technician status", error);
        }
      }
    };
    
    if (user && !showApplication) {
      checkTechnicianStatus();
    }
  }, [user]);

  return { showApplication, setShowApplication, pendingUserId, pendingUserEmail };
}