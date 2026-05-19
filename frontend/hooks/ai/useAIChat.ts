// hooks/useAIChat.ts
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // CHANGED: string instead of Date
  type?: "text" | "suggestion" | "error";
}

// Helper function to get consistent timestamp
function getFormattedTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper to create a new message
function createMessage(
  id: string,
  role: "user" | "assistant",
  content: string,
  type?: "text" | "suggestion" | "error"
): Message {
  return {
    id,
    role,
    content,
    timestamp: getFormattedTimestamp(),
    type,
  };
}

export function useAIChat() {
  const [messages, setMessages] = useState<Message[]>([
    createMessage(
      "1",
      "assistant",
      "Hello! I'm your NextBit AI assistant. I can help you with product recommendations, order tracking, technical support, and more. How can I assist you today?",
      "text"
    ),
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messageIdRef = useRef(2);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage = createMessage(
      (messageIdRef.current++).toString(),
      "user",
      content.trim(),
      "text"
    );

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          context: messages.slice(-5),
        }),
      });

      if (!response.ok) throw new Error("Failed to get AI response");

      const data = await response.json();

      const aiMessage = createMessage(
        (messageIdRef.current++).toString(),
        "assistant",
        data.response,
        "text"
      );

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage = createMessage(
        (messageIdRef.current++).toString(),
        "assistant",
        "I'm sorry, I'm having trouble connecting right now. Please try again later or contact our support team.",
        "error"
      );
      setMessages(prev => [...prev, errorMessage]);
      toast.error("Failed to send message");
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const clearChat = useCallback(() => {
    messageIdRef.current = 2;
    setMessages([
      createMessage(
        "1",
        "assistant",
        "Hello! I'm your NextBit AI assistant. How can I help you today?",
        "text"
      ),
    ]);
  }, []);

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);

  return {
    messages,
    isLoading,
    isMinimized,
    sendMessage,
    clearChat,
    toggleMinimize,
    setIsMinimized,
  };
}