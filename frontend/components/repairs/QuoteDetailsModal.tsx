// components/repairs/QuoteDetailsModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

interface QuoteLineItem {
  id: number;
  description: string;
  amount: number;
}

interface QuoteDetails {
  job_id: number;
  technician_name: string;
  total: number;
  line_items: QuoteLineItem[];
  warranty_days: number;
  notes: string;
  status: string;
}

interface QuoteDetailsModalProps {
  requestId: number | string;
  userId: number;
  onClose: () => void;
  onAccept: () => void;
}

export function QuoteDetailsModal({ requestId, userId, onClose, onAccept }: QuoteDetailsModalProps) {
  const [quote, setQuote] = useState<QuoteDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const response = await fetch(`/api/repairs/requests/${requestId}/quote?user_id=${userId}`);
        if (!response.ok) throw new Error("Failed to fetch quote");
        const data = await response.json();
        setQuote(data);
      } catch (error) {
        console.error("Failed to load quote:", error);
        toast.error("Could not load quote details");
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [requestId, userId]);

  const handleAccept = async () => {
    try {
      const response = await fetch(`/api/repairs/requests/${requestId}/accept-quote?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to accept quote");
      toast.success("Quote accepted! Technician will start working on your device.");
      onAccept();
      onClose();
    } catch (error) {
      console.error("Failed to accept quote:", error);
      toast.error("Could not accept quote. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-md p-8">
          <div className="text-center">Loading quote details...</div>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-xl">Quote from {quote.technician_name}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warranty badge */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-sm font-medium text-emerald-800">{quote.warranty_days}-day warranty</p>
              <p className="text-xs text-emerald-600">Parts and labour covered</p>
            </div>
          </div>

          {/* Line items */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-right px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quote.line_items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-right">KES {item.amount.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="border-t bg-muted/30">
                  <td className="px-3 py-2 font-semibold">Total</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-600">
                    KES {quote.total.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {quote.notes && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Technician's notes:</p>
              <p className="text-sm">{quote.notes}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <XCircle className="h-4 w-4 mr-2" />
              Decline
            </Button>
            <Button className="flex-1" onClick={handleAccept}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Accept Quote
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Payment is held in escrow and released only after you confirm completion
          </p>
        </CardContent>
      </Card>
    </div>
  );
}