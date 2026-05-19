// hooks/useTechnicianMessages.ts
import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { Message, ActiveJob } from "@/types/technician.types";
import { proxyClient } from "@/lib/api-client";

export function useTechnicianMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagingJob, setMessagingJob] = useState<ActiveJob | null>(null);

  const loadMessages = useCallback(async (jobId: string) => {
    try {
      const uid = user?.id ?? undefined;
      // Use proxyClient so cookies (HttpOnly session) are forwarded via Next.js proxy
      const path = `/api/technician/jobs/${jobId}/messages${uid ? `?user_id=${uid}` : ""}`;
      const data = await proxyClient.get<Message[]>(path);
      setMessages(data || []);
    } catch (err) {
      console.error("Failed to load messages", err);
      setMessages([]);
    }
  }, [user?.id]);

  const sendMessage = useCallback(async (jobId: string, text: string) => {
    try {
      const uid = user?.id ?? undefined;
      const path = `/api/technician/jobs/${jobId}/messages${uid ? `?user_id=${uid}` : ""}`;
      const newMessage = await proxyClient.post<Message>(path, { text });
      setMessages(prev => [...prev, newMessage]);
      toast.success("Message sent");
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Failed to send message");
      return false;
    }
  }, [user?.id]);

  const openMessagePanel = useCallback(async (job: ActiveJob) => {
    setMessagingJob(job);
    await loadMessages(job.id);
  }, [loadMessages]);

  const closeMessagePanel = useCallback(() => {
    setMessagingJob(null);
    setMessages([]);
  }, []);

  return {
    messages,
    messagingJob,
    openMessagePanel,
    closeMessagePanel,
    sendMessage,
  };
}