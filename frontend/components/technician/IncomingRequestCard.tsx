// components/technician/IncomingRequestCard.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, User, Wrench, Camera, ChevronDown, XCircle, Receipt } from "lucide-react";
import { IncomingRequest, ServiceMode, PartsPreference } from "@/types/technician.types";
import { UrgencyBadge } from "./UrgencyBadge";
import { timeAgo, timeUntil } from "@/lib/utils/technician.utils";

interface IncomingRequestCardProps {
  req: IncomingRequest;
  onQuote: (req: IncomingRequest) => void;
  onDecline: (id: string) => void;
}

const modeLabel: Record<ServiceMode, string> = {
  drop_off: "Drop-off",
  home_visit: "Home visit",
  either: "Either",
};

const partsLabel: Record<PartsPreference, string> = {
  oem_only: "OEM only",
  oem_or_aftermarket: "OEM or aftermarket",
  cheapest: "Cheapest option",
  tech_choice: "Tech's recommendation",
};

export function IncomingRequestCard({ req, onQuote, onDecline }: IncomingRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const expires = timeUntil(req.expiresAt);
  const expiring = new Date(req.expiresAt).getTime() - Date.now() < 3 * 3600000;

  return (
    <Card className={`border ${expiring ? "border-red-200 bg-red-50/30" : ""}`}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm">{req.brand}</span>
              <UrgencyBadge urgency={req.urgency} />
              {expiring && (
                <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {expires}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{req.issue}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold text-emerald-700">≤ KES {req.budget.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">budget</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.location} · {req.distanceKm} km</span>
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{req.customerName}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(req.postedAt)}</span>
          <span className="flex items-center gap-1"><Wrench className="h-3 w-3" />{modeLabel[req.serviceMode]}</span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-3 hover:text-foreground transition-colors"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide details" : "Parts preference & full details"}
        </button>

        {expanded && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-1.5 text-xs">
            <div><span className="text-muted-foreground">Parts preference:</span> <span className="font-medium">{partsLabel[req.partsPreference]}</span></div>
            <div><span className="text-muted-foreground">Service mode:</span> <span className="font-medium">{modeLabel[req.serviceMode]}</span></div>
            <div><span className="text-muted-foreground">Customer phone:</span> <span className="font-medium">{req.customerPhone}</span></div>
            {(req.photoUrls?.length ?? 0) > 0 && (
              <div className="flex gap-2 mt-2">
                {(req.photoUrls ?? []).map((_, i) => (
                  <div key={i} className="w-16 h-16 rounded-md bg-muted border flex items-center justify-center">
                    <Camera className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => onDecline(req.id)}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" /> Decline
          </Button>
          <Button size="sm" className="flex-1" onClick={() => onQuote(req)}>
            <Receipt className="h-3.5 w-3.5 mr-1.5" /> Send quote
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}