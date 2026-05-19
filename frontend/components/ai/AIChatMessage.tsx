// components/ai/AIChatMessage.tsx
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";
import { Message } from "@/hooks/ai/useAIChat";

interface AIChatMessageProps {
  message: Message;
}

export function AIChatMessage({ message }: AIChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.type === "error";

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-blue-100">
            <Bot className="h-4 w-4 text-blue-600" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 ${
          isUser
            ? "bg-blue-600 text-white"
            : isError
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <p className="text-xs opacity-70 mt-1">
          {message.timestamp} {/* Direct rendering - already a string */}
        </p>
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-gray-100">
            <User className="h-4 w-4 text-gray-600" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}