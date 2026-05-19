// hooks/useRequestMessages.ts
import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface RepairMessage {
  id: number;
  job_id: number;
  from_role: "technician" | "customer";
  from_user_id: number;
  text: string;
  sent_at: string;
}

export function useRequestMessages(requestId: number, userId: number) {
  const [messages, setMessages] = useState<RepairMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/repairs/requests/${requestId}/messages?user_id=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch messages");
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [requestId, userId]);

  const sendMessage = async (text: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/repairs/requests/${requestId}/messages?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const newMessage = await response.json();
      setMessages((prev) => [...prev, newMessage]);
      return true;
    } catch (error) {
      console.error(error);
      toast.error("Failed to send message");
      return false;
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    refresh: fetchMessages,
  };
}
