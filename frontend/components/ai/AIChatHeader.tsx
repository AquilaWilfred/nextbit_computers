import { Button } from "@/components/ui/button";
import { Sparkles, RotateCcw, Volume2, VolumeX, X } from "lucide-react";

interface AIChatHeaderProps {
  storeName: string;
  isDragging: boolean;
  onDragStart: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onDragEnd: (e: React.PointerEvent<HTMLDivElement>) => void;
  onNewChat: () => void;
  onClose: () => void;
  onMuteToggle?: () => void;
  isMuted?: boolean;
}

export function AIChatHeader({ 
  storeName, 
  isDragging, 
  onDragStart, 
  onDragMove, 
  onDragEnd, 
  onNewChat, 
  onClose,
  onMuteToggle,
  isMuted = true
}: AIChatHeaderProps) {
  return (
    <div
      className={`px-5 py-4 border-b border-border/50 bg-gradient-to-r from-[var(--brand)]/8 to-[var(--brand)]/4 flex items-center justify-between select-none touch-none flex-shrink-0 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={onDragStart}
      onPointerMove={onDragMove}
      onPointerUp={onDragEnd}
      onPointerCancel={onDragEnd}
    >
      <div className="flex items-center gap-2.5 pointer-events-none">
        <div className="w-8 h-8 rounded-lg bg-[var(--brand)]/20 text-[var(--brand)] flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-foreground text-[0.95rem]">{storeName}</h3>
          <p className="text-[0.7rem] text-muted-foreground font-medium">NextBit's Shopping Assistant</p>
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-[var(--brand)]/10 text-muted-foreground" onClick={onNewChat} aria-label="New Chat">
          <RotateCcw className="w-3 h-3" />
        </Button>
        {onMuteToggle && (
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 rounded-lg hover:bg-[var(--brand)]/10 text-muted-foreground"
            onClick={onMuteToggle}
            aria-label="Toggle Voice"
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </Button>
        )}
        <Button
          variant="ghost" size="icon"
          className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
          onClick={onClose}
          aria-label="Close chat"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}