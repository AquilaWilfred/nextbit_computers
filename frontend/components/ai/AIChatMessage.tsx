import Link from "next/link";
import { Package } from "lucide-react";
import { formatPrice } from "@/lib/cart";
import { ChatMessage } from "@/types/navbar/navbar.types";
import { TypewriterText } from "../navbar/TypewriterText";

interface AIChatMessageProps {
  message: ChatMessage;
  isStreaming: boolean;
  onStreamComplete: () => void;
  onProductClick: () => void;
  renderMessageContent: (content: string) => React.ReactNode;
}

export function AIChatMessage({ message, isStreaming, onStreamComplete, onProductClick, renderMessageContent }: AIChatMessageProps) {
  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300 flex-shrink-0`}>
      <div
        className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 break-words whitespace-normal ${
          message.role === "user"
            ? "rounded-2xl rounded-tr-md bg-[var(--brand)] text-white shadow-md"
            : "rounded-2xl rounded-tl-md bg-muted text-foreground shadow-sm"
        }`}
      >
        <div className={`text-sm leading-relaxed whitespace-pre-line ${message.role === "user" ? "font-medium" : "font-normal"}`}>
          {message.role === "assistant" ? (
            <>
              {isStreaming ? (
                <TypewriterText text={message.content} onComplete={onStreamComplete} renderContent={renderMessageContent} />
              ) : (
                renderMessageContent(message.content)
              )}
              {message.products && message.products.length > 0 && !isStreaming && (
                <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-3 animate-in fade-in duration-500">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recommended</p>
                  <div className="flex overflow-x-auto gap-3 pb-2 snap-x [&::-webkit-scrollbar]:hidden">
                    {message.products.map((p: any) => (
                      <Link
                        key={p.id}
                        href={`/products/${p.slug}`}
                        onClick={onProductClick}
                        className="flex-shrink-0 w-36 bg-background rounded-xl p-2.5 snap-start shadow-sm border border-border/50 hover:border-[var(--brand)] hover:shadow-md transition-all group"
                      >
                        <div className="w-full h-24 bg-muted/50 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <Package className="w-6 h-6 text-muted-foreground/50" />
                          )}
                        </div>
                        <p className="text-[11px] font-semibold truncate" title={p.name}>{p.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{p.brand || "Standard"}</p>
                        <p className="text-[12px] font-bold text-[var(--brand)] mt-1">{formatPrice(p.price)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            message.content
          )}
        </div>
      </div>
    </div>
  );
}