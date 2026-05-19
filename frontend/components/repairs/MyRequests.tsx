// components/MyRequests.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { RequestMessageModal } from "./RequestMessageModal";
import { QuoteDetailsModal } from "./QuoteDetailsModal"; 
import { MapPin, Clock, DollarSign, User, MessageCircle, ClipboardList } from "lucide-react";
import { RepairRequest, Urgency } from "@/types/repairs.types";

const URGENCY_LABEL: Record<Urgency, string> = { low: "Flexible", medium: "Standard", high: "Urgent" };

interface MyRequestsProps {
  requests: RepairRequest[];
  userId: number;
  onNew: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function MyRequests({ requests, userId, onNew, onRefresh, loading }: MyRequestsProps) {
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [selectedQuoteRequest, setSelectedQuoteRequest] = useState<RepairRequest | null>(null);

  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs">
          <span className="font-medium">🔒 Escrow protection:</span>
          <span>Your payment is held in escrow and only released after you confirm the repair is complete.</span>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Active requests</h3>
          <Button size="sm" variant="outline" onClick={onNew}>
            + New request
          </Button>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No active requests. Post one to get quotes from nearby technicians.</p>
            <Button className="mt-4" onClick={onNew}>Post repair request</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <div className="font-semibold text-sm">{req.device}</div>
                      <div className="text-sm text-muted-foreground">{req.issue}</div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.location}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{URGENCY_LABEL[req.urgency]}</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />Budget: KES {req.budget.toLocaleString()}</span>
                    {req.assignedTech && (
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{req.assignedTech}</span>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${req.progressPercent}%` }} />
                    </div>
                  </div>
                  {req.status === "quoted" && req.lowestQuote && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <span className="text-xs text-muted-foreground">{req.quotesReceived} quotes received</span>
                        <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-emerald-700">From KES {req.lowestQuote.toLocaleString()}</span>
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setSelectedQuoteRequest(req)}
                        >
                            View quotes →
                        </Button>
                        </div>
                    </div>
                 )}
                  {req.status === "in_progress" && (
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <span className="text-xs text-emerald-700 font-medium">Technician is working on it</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedRequest(req)}
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1" /> Message
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedRequest && (
        <RequestMessageModal 
          request={selectedRequest} 
          userId={userId}
          onClose={() => setSelectedRequest(null)} 
        />
      )}
      {selectedQuoteRequest && (
        <QuoteDetailsModal 
          requestId={selectedQuoteRequest.id} 
          userId={userId}
          onClose={() => setSelectedQuoteRequest(null)} 
          onAccept={() => {
            setSelectedQuoteRequest(null);
            // Refresh the list of requests or update the specific request
          }} 
        />
      )}
    </>
  );
}