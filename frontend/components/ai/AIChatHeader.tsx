// components/ai/AIChatHeader.tsx
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, RefreshCw, Minimize2 } from "lucide-react";

interface AIChatHeaderProps {
  onClear: () => void;
  onMinimize: () => void;
}

export function AIChatHeader({ onClear, onMinimize }: AIChatHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-blue-100">
            <Bot className="h-4 w-4 text-blue-600" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-semibold text-sm">NextBit AI Assistant</h3>
          <p className="text-xs text-gray-500">Online</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-8 w-8 p-0"
          title="Clear chat"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMinimize}
          className="h-8 w-8 p-0"
          title="Minimize"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}