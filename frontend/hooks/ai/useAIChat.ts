import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { aiService } from "@/lib/services/navbar/ai.service";
import { AiHistoryEntry, ChatMessage } from "@/types/navbar/navbar.types";
import { CUSTOMER_SUGGESTED_PROMPTS } from "@/constants/navbar/navbar.constants";

export function useAIChat(isAuthenticated: boolean, cartContext: any[]) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Load saved state
  useEffect(() => {
    try {
      setIsOpen(sessionStorage.getItem("store_ai_open") === "true");
      const saved = sessionStorage.getItem("store_ai_messages");
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);

  // Load history
  useEffect(() => {
    if (!isAuthenticated || !isOpen) return;
    aiService.getHistory().then((history: AiHistoryEntry[]) => {
      if (history?.length && messages.length <= 1) {
        setMessages(history.map((h) => ({
          role: (h.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: h.message,
        })).reverse());
      }
    }).catch(() => {});
  }, [isAuthenticated, isOpen]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (streamingIndex !== null) {
      const interval = setInterval(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }, 100);
      return () => clearInterval(interval);
    }
  }, [streamingIndex]);

  // Persist state
  useEffect(() => {
    try { sessionStorage.setItem("store_ai_open", String(isOpen)); } catch {}
  }, [isOpen]);

  useEffect(() => {
    try { sessionStorage.setItem("store_ai_messages", JSON.stringify(messages)); } catch {}
  }, [messages]);

  type AiChatResponse = {
    reply: string;
    products?: any[];
    suggestions?: string[];
  };

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim() || isPending) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user" as const, content: userMessage },
    ];
    setMessages(newMessages);
    setInput("");
    setDynamicSuggestions([]);
    setIsPending(true);

    try {
      const data = await aiService.sendMessage(
        userMessage,
        newMessages.slice(1),
        cartContext,
        user?.id,
        user?.email
      ) as AiChatResponse;

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: data.reply,
          products: data.products,
        },
      ]);
      setStreamingIndex(newMessages.length);
    } catch (err: any) {
      const isQuota = err.message?.includes("quota") || err.message?.includes("429");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant" as const,
          content: isQuota
            ? "The AI is currently unavailable due to high traffic. Please try again later."
            : "Sorry, I ran into a network error. Please try again.",
        },
      ]);
    } finally {
      setIsPending(false);
    }
  }, [messages, isPending, cartContext, user]);

  const newChat = () => {
    const displayName = user?.name ? `, ${user.name}` : " there";
    setMessages([{ role: "assistant" as const, content: `Hi${displayName}! I'm Bit, NextBit's shopping assistant. What are you looking for today?` }]);
    setInput("");
    if (isAuthenticated) aiService.clearHistory().catch(() => {});
  };

  return {
    isOpen,
    setIsOpen,
    messages,
    input,
    setInput,
    isPending,
    dynamicSuggestions,
    streamingIndex,
    scrollRef,
    sendMessage,
    newChat,
    setStreamingIndex,
  };
}