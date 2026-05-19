// hooks/useRepairRequests.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { RepairRequest, RequestFormState } from "@/types/repairs.types";
import { toast } from "sonner";
import { useWebSocket } from "./useWebSocket";

export function useRepairRequests(userId: number) {
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use WebSocket for real-time updates
  const { isConnected, lastMessage } = useWebSocket(userId);

  const fetchRequests = useCallback(async (showLoading = true) => {
    if (!userId) return;
    
    if (showLoading) setLoading(true);
    
    try {
      const response = await fetch(`/api/repairs/requests?user_id=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch requests");
      const data = await response.json();
      setRequests(data);
      return data;
    } catch (error) {
      console.error("Failed to load repair requests", error);
      return [];
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Listen for WebSocket messages and refresh data
  useEffect(() => {
    if (lastMessage) {
      const eventsToRefresh = ['quote_received', 'status_update', 'new_message'];
      if (eventsToRefresh.includes(lastMessage.event)) {
        console.log(`Refreshing requests due to ${lastMessage.event} event`);
        fetchRequests(false); // Silent refresh
      }
    }
  }, [lastMessage, fetchRequests]);

  // Periodic polling as a fallback for missed WebSocket messages
  useEffect(() => {
  // Poll every 5 seconds to check for new quotes
  const intervalId = setInterval(() => {
    console.log('🔄 Checking for new quotes...');
    fetchRequests(false);
  }, 5000);
  
  return () => clearInterval(intervalId);
}, [fetchRequests]);

  const createRequest = async (data: RequestFormState & { photoUrls?: string[] }): Promise<boolean> => {
    try {
      const payload = {
        device: data.deviceType,
        brand: data.brand,
        issue: data.issue,
        urgency: data.urgency,
        budget: parseFloat(data.budget) || 0,
        location: data.location,
        serviceMode: data.serviceMode,
        partsPreference: data.partsPreference,
        customer_id: userId,
        photoUrls: data.photoUrls ?? [],
      };

      const response = await fetch(`/api/repairs/requests?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to submit repair request");

      const newRequest = await response.json();
      setRequests((prev) => [newRequest, ...prev]);
      toast.success("Request posted! You'll receive quotes shortly.");
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit request. Please try again.");
      return false;
    }
  };

  const refresh = useCallback(() => {
    fetchRequests(true);
  }, [fetchRequests]);

  return {
    requests,
    loading,
    createRequest,
    refresh,
    isConnected, // Show connection status in UI
  };
}