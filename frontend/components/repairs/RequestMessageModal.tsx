// components/repairs/RequestMessageModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, User, Wrench, Clock, DollarSign } from "lucide-react";
import { RepairRequest } from "@/types/repairs.types";
import { toast } from "sonner";

interface Message {
  id: number;
  job_id: number;
  from_role: "technician" | "customer";
  from_user_id: number;
  text: string;
  sent_at: string;
}

interface RequestMessageModalProps {
  request: RepairRequest;
  userId: number;
  onClose: () => void;
}

export function RequestMessageModal({ request, userId, onClose }: RequestMessageModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages for this request
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/repairs/requests/${request.id}/messages?user_id=${userId}`);
        if (!response.ok) {
          // No active job yet
          setMessages([]);
          setLoading(false);
          return;
        }
        const data = await response.json();
        setMessages(data);
        
        // Store job_id if available
        if (data.length > 0 && data[0].job_id) {
          setJobId(data[0].job_id);
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
        toast.error("Could not load messages");
      } finally {
        setLoading(false);
      }
    };

    if (request.id) {
      fetchMessages();
    }
  }, [request.id, userId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    if (!jobId) {
      toast.error("No active job yet. Wait for technician to accept your request.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/repairs/requests/${request.id}/messages?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newMessage.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const newMsg = await response.json();
      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Could not send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${formatTime(dateStr)}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${formatTime(dateStr)}`;
    } else {
      return `${date.toLocaleDateString()} at ${formatTime(dateStr)}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{request.device}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={request.status === "in_progress" ? "default" : "secondary"}>
                  {request.status === "in_progress" ? "In Progress" : request.status}
                </Badge>
                {request.progressPercent > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {request.progressPercent}% complete
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {request.issue}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </CardHeader>

        {/* Quote section - if quotes received */}
        {request.status === "quoted" && request.lowestQuote && (
          <div className="p-4 border-b bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Quote Received!</p>
                <p className="text-2xl font-bold text-blue-900">
                  KES {request.lowestQuote.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {request.quotesReceived} quote{request.quotesReceived !== 1 ? "s" : ""} received
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">View Details</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  Accept Quote
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.from_role === "customer" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 ${
                    msg.from_role === "customer"
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.from_role === "technician" ? (
                      <>
                        <Wrench className="h-3 w-3" />
                        <span className="text-xs font-medium">Technician</span>
                      </>
                    ) : (
                      <>
                        <User className="h-3 w-3" />
                        <span className="text-xs font-medium">You</span>
                      </>
                    )}
                    <span className={`text-xs ${msg.from_role === "customer" ? "text-emerald-200" : "text-muted-foreground"}`}>
                      {formatDate(msg.sent_at)}
                    </span>
                  </div>
                  <p className="text-sm break-words">{msg.text}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              disabled={sending || !jobId}
            />
            <Button onClick={sendMessage} disabled={sending || !newMessage.trim() || !jobId}>
              {sending ? "..." : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {!jobId && request.status !== "in_progress" && (
            <p className="text-xs text-muted-foreground mt-2">
              Messages will be available once a technician accepts your request.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}