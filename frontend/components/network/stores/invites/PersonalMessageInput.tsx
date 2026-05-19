"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, RefreshCw } from "lucide-react";
import { InviteForm } from "@/types/network/stores/invite.types";

interface PersonalMessageInputProps {
  message: string;
  onMessageChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  isSending: boolean;
}

export const PersonalMessageInput = memo(function PersonalMessageInput({
  message,
  onMessageChange,
  onSend,
  isSending,
}: PersonalMessageInputProps) {
  return (
    <Card className="border border-border p-5 space-y-3">
      <h3 className="font-semibold text-sm">
        Personal Message{" "}
        <span className="text-xs font-normal text-muted-foreground">(optional)</span>
      </h3>
      <textarea
        value={message}
        onChange={onMessageChange}
        rows={3}
        placeholder="Add a personal note to the invitation email…"
        className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
      />
      <Button onClick={onSend} disabled={isSending} className="gap-2 w-full sm:w-auto">
        {isSending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        {isSending ? "Sending…" : "Send Invitation"}
      </Button>
    </Card>
  );
});