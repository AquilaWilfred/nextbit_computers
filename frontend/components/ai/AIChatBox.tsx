// components/ai/AIChatBox.tsx
"use client";

import { useState, useRef, useEffect } from "react";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useAIChat } from "@/hooks/ai/useAIChat";
import { AIChatHeader } from "./AIChatHeader";
import { AIChatMessage } from "./AIChatMessage";
import { AIChatInput } from "./AIChatInput";
import { AIChatSuggestedQuestions } from "./AIChatSuggestedQuestions";
import { Loader2 } from "lucide-react";

interface AIChatBoxProps {
  className?: string;
  compact?: boolean;
}

export default function AIChatBox({ className = "", compact = false }: AIChatBoxProps) {
  const {
    messages,
    isLoading,
    isMinimized,
    sendMessage,
    clearChat,
    toggleMinimize,
    setIsMinimized,
  } = useAIChat();

  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue);
    setInputValue("");
  };

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
    // Optional: auto-send after a short delay
    setTimeout(() => {
      sendMessage(question);
      setInputValue("");
    }, 100);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Minimized state
  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={toggleMinimize}
          className="rounded-full h-12 w-12 shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 w-96 h-[500px] shadow-xl z-50 flex flex-col ${className}`}>
      <AIChatHeader onClear={clearChat} onMinimize={toggleMinimize} />

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <AIChatMessage key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="bg-gray-100 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {messages.length === 1 && !isLoading && (
        <AIChatSuggestedQuestions onSelect={handleSuggestedQuestion} />
      )}

      <AIChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        isLoading={isLoading}
      />
    </Card>
  );
}