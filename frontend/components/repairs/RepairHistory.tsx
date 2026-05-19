// components/RepairHistory.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { Clock, User, DollarSign, ShieldCheck, RefreshCw } from "lucide-react";
import { CompletedRepair } from "@/types/repairs.types";

interface RepairHistoryProps {
  history: CompletedRepair[];
  totalSpent: number;
  averageRating: string;
  activeWarranties: number;
}

export function RepairHistory({ history, totalSpent, averageRating, activeWarranties }: RepairHistoryProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Total spent: <span className="font-semibold text-foreground">KES {totalSpent.toLocaleString()}</span>
        </span>
        <select className="text-sm border rounded-md px-2 py-1 bg-background">
          <option>Last 6 months</option>
          <option>This year</option>
          <option>All time</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 rounded-lg px-3 py-3 text-center">
          <div className="text-lg font-semibold">{history.length}</div>
          <div className="text-xs text-muted-foreground">Repairs done</div>
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-3 text-center">
          <div className="text-lg font-semibold">{averageRating}★</div>
          <div className="text-xs text-muted-foreground">Avg rating given</div>
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-3 text-center">
          <div className="text-lg font-semibold">{activeWarranties}</div>
          <div className="text-xs text-muted-foreground">Active warranties</div>
        </div>
      </div>

      <div className="space-y-3">
        {history.map((h) => (
          <Card key={h.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="font-semibold text-sm">{h.device}</div>
                  <div className="text-sm text-muted-foreground">{h.issue}</div>
                </div>
                <Badge variant="secondary">Completed</Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{h.completedDate}</span>
                <span className="flex items-center gap-1"><User className="h-3 w-3" />{h.technician}</span>
                <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />KES {h.cost.toLocaleString()}</span>
                <span className={`flex items-center gap-1 ${h.warrantyActive ? "text-emerald-700" : ""}`}>
                  <ShieldCheck className="h-3 w-3" />
                  Warranty: {h.warrantyExpiry} {h.warrantyActive ? "✓" : "(expired)"}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <StarRating rating={h.userRating} />
                <Button size="sm" variant="outline">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Book again
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}