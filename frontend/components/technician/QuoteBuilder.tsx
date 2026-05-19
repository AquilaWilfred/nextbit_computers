// components/technician/QuoteBuilder.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, Trash2, XCircle, Receipt } from "lucide-react";
import { IncomingRequest, QuoteLineItem } from "@/types/technician.types";

interface QuoteBuilderProps {
  request: IncomingRequest;
  onSubmit: (lines: QuoteLineItem[], notes: string, warrantyDays: number) => void;
  onDecline: () => void;
  onClose: () => void;
}

export function QuoteBuilder({ request, onSubmit, onDecline, onClose }: QuoteBuilderProps) {
  const [lines, setLines] = useState<QuoteLineItem[]>([
    { id: "l1", description: "Labour — diagnosis & repair", amount: 0 },
    { id: "l2", description: "Parts", amount: 0 },
  ]);
  const [notes, setNotes] = useState("");
  const [warrantyDays, setWarrantyDays] = useState(30);

  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const overBudget = total > request.budget;

  const addLine = () =>
    setLines((prev) => [...prev, { id: `l${Date.now()}`, description: "", amount: 0 }]);

  const removeLine = (id: string) =>
    setLines((prev) => prev.filter((l) => l.id !== id));

  const updateLine = (id: string, key: keyof QuoteLineItem, val: string | number) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [key]: val } : l)));

  return (
    <div className="space-y-4">
      {overBudget && (
        <div className="flex gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 text-xs border border-amber-200">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Your quote (KES {total.toLocaleString()}) exceeds the customer's budget of KES {request.budget.toLocaleString()}.
          </span>
        </div>
      )}

      <div className="space-y-2">
        {lines.map((line) => (
          <div key={line.id} className="flex gap-2 items-center">
            <Input
              placeholder="Description"
              value={line.description}
              onChange={(e) => updateLine(line.id, "description", e.target.value)}
              className="flex-1 text-sm"
            />
            <div className="relative w-32">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">KES</span>
              <Input
                type="number"
                placeholder="0"
                value={line.amount || ""}
                onChange={(e) => updateLine(line.id, "amount", parseFloat(e.target.value) || 0)}
                className="pl-9 text-sm"
              />
            </div>
            <Button size="icon" variant="ghost" onClick={() => removeLine(line.id)} className="h-8 w-8 flex-shrink-0">
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addLine} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add line item
      </Button>

      <div className="flex items-center justify-between py-2 border-t">
        <span className="text-sm font-semibold">Total</span>
        <span className={`text-lg font-bold ${overBudget ? "text-amber-600" : "text-foreground"}`}>
          KES {total.toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Warranty</Label>
          <Select value={String(warrantyDays)} onValueChange={(v) => setWarrantyDays(Number(v))}>
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes to customer</Label>
        <Textarea
          placeholder="e.g. 'I'll need to inspect the board before confirming the parts cost.'"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1 text-red-600 border-red-200 hover:bg-red-50" onClick={onDecline}>
          <XCircle className="h-4 w-4 mr-1.5" /> Decline
        </Button>
        <Button className="flex-[2]" onClick={() => onSubmit(lines, notes, warrantyDays)} disabled={total === 0}>
          <Receipt className="h-4 w-4 mr-1.5" /> Send quote
        </Button>
      </div>

      <Button variant="ghost" size="sm" onClick={onClose} className="w-full">
        Cancel
      </Button>
    </div>
  );
}