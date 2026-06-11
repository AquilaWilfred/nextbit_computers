import { useEffect } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAIChat } from "@/hooks/ai/useAIChat";
import { AIChatHeader } from "./AIChatHeader";
import { AIChatMessage } from "./AIChatMessage";
import { AIChatInput } from "./AIChatInput";
import { AIChatSuggestions } from "./AIChatSuggestions";
import { CUSTOMER_SUGGESTED_PROMPTS } from "@/constants/navbar/navbar.constants";

interface AIChatProps {
  isAuthenticated: boolean;
  cartContext: any[];
  storeName: string;
}

export function AIChat({ isAuthenticated, cartContext, storeName }: AIChatProps) {
  const {
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
  } = useAIChat(isAuthenticated, cartContext);

  const renderMessageContent = (content: string): React.ReactNode => {
    const parts = content.split(/\[([^\]]+)\]\(([^)]+)\)/g);
    const elements: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i += 3) {
      const boldParts = parts[i].split(/(\*\*.*?\*\*)/g);
      boldParts.forEach((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          elements.push(<strong key={`b-${i}-${j}`}>{part.slice(2, -2)}</strong>);
        } else if (part) {
          part.split("\n").forEach((line, k, arr) => {
            elements.push(<span key={`t-${i}-${j}-${k}`}>{line}</span>);
            if (k < arr.length - 1) elements.push(<span key={`br-${i}-${j}-${k}`} className="block h-1.5" />);
          });
        }
      });
      if (i + 1 < parts.length) {
        elements.push(
          <Link
            key={`lnk-${i}`}
            href={parts[i + 2]}
            onClick={() => { setIsOpen(false); window.speechSynthesis?.cancel(); }}
            className="text-[var(--brand)] hover:underline font-semibold transition-colors"
          >
            {parts[i + 1]}
          </Link>
        );
      }
    }
    return elements;
  };

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Trigger button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen((p) => !p)}
        className="hidden md:flex"
        aria-label="Toggle AI Assistant"
      >
        <Sparkles className="w-4 h-4 text-[var(--brand)]" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[99] bg-black/20 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Slide-in panel */}
          <div className="fixed top-0 right-0 h-full w-[420px] xl:w-[480px] z-[100] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <AIChatHeader
              storeName="Bit" // storeName={storeName}
              isDragging={false}
              onDragStart={() => {}}
              onDragMove={() => {}}
              onDragEnd={() => {}}
              onNewChat={newChat}
              onClose={() => setIsOpen(false)}
            />

            <div
              className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gradient-to-b from-background/50 to-background"
              ref={scrollRef}
            >
              {messages.map((msg, i) => (
                <AIChatMessage
                  key={i}
                  message={msg}
                  isStreaming={streamingIndex === i}
                  onStreamComplete={() => setStreamingIndex(null)}
                  onProductClick={() => setIsOpen(false)}
                  renderMessageContent={renderMessageContent}
                />
              ))}

              {messages.length > 0 &&
                messages[messages.length - 1].role === "assistant" &&
                !isPending && (
                  <AIChatSuggestions
                    suggestions={
                      dynamicSuggestions.length > 0
                        ? dynamicSuggestions
                        : CUSTOMER_SUGGESTED_PROMPTS
                    }
                    onSelect={sendMessage}
                  />
                )}

              {isPending && (
                <div className="flex justify-start animate-in fade-in duration-300 flex-shrink-0">
                  <div className="bg-muted rounded-2xl rounded-tl-md p-3 flex items-center gap-2 h-11 px-4 shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" />
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:150ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>

            <AIChatInput
              value={input}
              onChange={setInput}
              onSubmit={sendMessage}
              isPending={isPending}
            />
          </div>
        </>
      )}
    </>
  );
}