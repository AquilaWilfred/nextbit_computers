// components/TechnicianCard.tsx
"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "./StarRating";
import { MapPin, Clock, MessageCircle, Star, User, ShieldCheck, Receipt, CheckCircle2, ChevronDown } from "lucide-react";
import { Technician, Review } from "@/types/repairs.types";

interface TechnicianCardProps {
  tech: Technician;
  reviews: Review[];
  onContact: (tech: Technician) => void;
  onViewReviews: (tech: Technician) => void;
}

export function TechnicianCard({ tech, reviews, onContact, onViewReviews }: TechnicianCardProps) {
  const [expanded, setExpanded] = useState(false);
  const techReviews = reviews.filter((r) => r.technicianId === tech.id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-5">
        <div className="flex gap-3 items-start mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 relative"
            style={{ background: tech.avatarColor, color: tech.avatarTextColor }}
          >
            {tech.initials}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${tech.available ? "bg-emerald-500" : "bg-red-400"}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm">{tech.name}</span>
              {tech.verified && (
                <span className="flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  <CheckCircle2 className="h-3 w-3" /> Verified
                </span>
              )}
              {tech.iprsVerified && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">IPRS ✓</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{tech.location}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{tech.responseTime}</span>
              <span>·</span>
              <span>{tech.distanceKm} km away</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <StarRating rating={tech.rating} />
              <span className="text-sm font-medium">{tech.rating}</span>
              <span className="text-xs text-muted-foreground">({tech.reviewCount} reviews)</span>
            </div>
          </div>
          <Badge variant={tech.available ? "default" : "secondary"} className="shrink-0">
            {tech.available ? "Available" : "Busy"}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {tech.specialties.map((s) => (
            <span key={s} className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground">
              {s}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
            <div className="text-sm font-semibold">KES {tech.minPrice.toLocaleString()}+</div>
            <div className="text-xs text-muted-foreground">Starting from</div>
          </div>
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
            <div className="text-sm font-semibold">{tech.jobsCompleted}</div>
            <div className="text-xs text-muted-foreground">Jobs done</div>
          </div>
          <div className="bg-muted/50 rounded-lg px-3 py-2 text-center">
            <div className="text-sm font-semibold">{tech.warrantyDays}d</div>
            <div className="text-xs text-muted-foreground">Warranty</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
          {tech.insured && (
            <span className="flex items-center gap-1 text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" /> Insured repairs
            </span>
          )}
          <span className="flex items-center gap-1"><Receipt className="h-3.5 w-3.5" /> Itemised quotes</span>
          <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp updates</span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-3 hover:text-foreground transition-colors"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Hide details" : "Bio & recent reviews"}
        </button>

        {expanded && (
          <div className="mb-4 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">{tech.bio}</p>
            {techReviews.length > 0 && (
              <div className="border-t pt-3 space-y-3">
                {techReviews.slice(0, 2).map((rev) => (
                  <div key={rev.id}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium">{rev.reviewerName}</span>
                      <span className="text-xs text-muted-foreground">{rev.date}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">{rev.device}</div>
                    <StarRating rating={rev.rating} size="sm" />
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button className="flex-1" disabled={!tech.available} onClick={() => onContact(tech)}>
            <MessageCircle className="h-4 w-4 mr-1.5" />
            {tech.available ? "Request quote" : "Not available"}
          </Button>
          <Button variant="outline" size="icon" onClick={() => onViewReviews(tech)}>
            <Star className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}