// components/technician/MessagePanel.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActiveJob, Message } from "@/types/technician.types";
import { timeAgo } from "@/lib/utils/technician.utils";

interface MessagePanelProps {
  job: ActiveJob;
  messages: Message[];
  onSend: (jobId: string, text: string) => void;
  onClose: () => void;
}

export function MessagePanel({ job, messages, onSend, onClose }: MessagePanelProps) {
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const jobMessages = messages.filter((m) => m.jobId === job.id);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [jobMessages]);

  const handleSend = () => {
    if (text.trim()) {
      onSend(job.id, text.trim());
      setText("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{job.customerName}</CardTitle>
              <p className="text-xs text-muted-foreground">{job.brand} · {job.issue.slice(0, 50)}…</p>
            </div>
            <Button size="sm" variant="ghost" onClick={onClose}>✕</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-3 mb-4">
            {jobMessages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-8">No messages yet</div>
            )}
            {jobMessages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "technician" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                    m.from === "technician"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-muted rounded-bl-sm"
                  }`}
                >
                  <p>{m.text}</p>
                  <p className={`text-xs mt-0.5 ${m.from === "technician" ? "text-emerald-100" : "text-muted-foreground"}`}>
                    {timeAgo(m.sentAt)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}