// components/technician/RequestsTab.tsx
"use client";

import { useState } from "react";
import { Bell, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IncomingRequest, QuoteLineItem } from "@/types/technician.types";
import { IncomingRequestCard } from "./IncomingRequestCard";
import { QuoteBuilder } from "./QuoteBuilder";

interface RequestsTabProps {
  incoming: IncomingRequest[];
  onQuote: (req: IncomingRequest, lines: QuoteLineItem[], notes: string, warrantyDays: number) => Promise<void>;
  onDecline: (reqId: string) => Promise<boolean>;
  isAutoRefreshing?: boolean;  // Add this
}

export function RequestsTab({ incoming, onQuote, onDecline, isAutoRefreshing = false }: RequestsTabProps) {
  const [quotingRequest, setQuotingRequest] = useState<IncomingRequest | null>(null);
  const [sortBy, setSortBy] = useState<string>("nearest");

  const sortedRequests = [...incoming].sort((a, b) => {
    switch (sortBy) {
      case "nearest": return a.distanceKm - b.distanceKm;
      case "urgent": return a.urgency === "high" ? -1 : a.urgency === "medium" ? -1 : 1;
      case "budget": return b.budget - a.budget;
      case "newest": return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
      default: return 0;
    }
  });

  const handleQuoteSubmit = async (lines: QuoteLineItem[], notes: string, warrantyDays: number) => {
    if (quotingRequest) {
      await onQuote(quotingRequest, lines, notes, warrantyDays);
      setQuotingRequest(null);
    }
  };

  const handleDecline = async (reqId: string) => {
    await onDecline(reqId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">{incoming.length} incoming request{incoming.length !== 1 ? "s" : ""}</h2>
          {isAutoRefreshing && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Syncing...</span>
            </div>
          )}
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="nearest">Nearest first</SelectItem>
            <SelectItem value="urgent">Most urgent</SelectItem>
            <SelectItem value="budget">Highest budget</SelectItem>
            <SelectItem value="newest">Most recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {incoming.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No incoming requests right now.</p>
          <p className="text-xs mt-1">Make sure you're set to Available.</p>
        </div>
      ) : (
        sortedRequests.map((req) => (
          <IncomingRequestCard
            key={req.id}
            req={req}
            onQuote={() => setQuotingRequest(req)}
            onDecline={handleDecline}
          />
        ))
      )}

      {/* Quote Modal */}
      {quotingRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
          <div className="bg-background rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">Build your quote</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {quotingRequest.brand} · Budget: KES {quotingRequest.budget.toLocaleString()}
                  </p>
                </div>
                <button onClick={() => setQuotingRequest(null)} className="text-muted-foreground">✕</button>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground mt-2">
                {quotingRequest.issue}
              </div>
            </div>
            <div className="p-6">
              <QuoteBuilder
                request={quotingRequest}
                onSubmit={handleQuoteSubmit}
                onDecline={() => {
                  handleDecline(quotingRequest.id);
                  setQuotingRequest(null);
                }}
                onClose={() => setQuotingRequest(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}