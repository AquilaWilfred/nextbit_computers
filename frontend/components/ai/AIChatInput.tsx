import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/navbar/useVoiceRecognition";

interface AIChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string) => void;
  isPending: boolean;
}

export function AIChatInput({ value, onChange, onSubmit, isPending }: AIChatInputProps) {
  const { isListening, toggleListening } = useVoiceRecognition((text) => {
    onChange(text);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isPending) return;
    onSubmit(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!value.trim() || isPending) return;
      onSubmit(value);
    }
  };

  return (
    <div className="px-4 py-4 border-t border-border/50 bg-background/80 backdrop-blur-sm flex-shrink-0">
      <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
        <div className="relative flex-1">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Chat input"
            placeholder={isListening ? "Listening..." : "Ask about our laptops..."}
            rows={3}
            className="w-full resize-none pl-3.5 pr-9 py-3 text-sm rounded-xl border border-input/60 bg-background hover:border-input focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/50 focus:border-[var(--brand)] transition-all placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={toggleListening}
            className={`absolute right-2.5 top-3 transition-colors p-1 rounded hover:bg-muted/50 ${
              isListening ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Voice Search"
          >
            <Mic className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground/50">
            Press Enter to send, Shift+Enter for new line
          </p>
          <Button
            type="submit"
            size="sm"
            className="bg-[var(--brand)] text-white hover:opacity-90 h-9 px-5 rounded-lg font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!value.trim() || isPending}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}