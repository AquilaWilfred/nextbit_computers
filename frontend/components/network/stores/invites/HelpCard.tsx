"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ONBOARDING_STEPS } from "@/constants/network/stores/invite.constants";

export const HelpCard = memo(function HelpCard() {
  return (
    <Card className="border border-border p-5 space-y-3">
      <h3 className="font-semibold text-sm">What happens next?</h3>
      <ol className="space-y-2.5">
        {ONBOARDING_STEPS.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
            <span className="shrink-0 w-4 h-4 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] text-[10px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-4 py-3 mt-2">
        <Badge className="bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/20 text-[10px] shrink-0">
          Note
        </Badge>
        <span>
          Invited stores start in <strong>Pending</strong> status and cannot share inventory until approved by a Global Admin.
        </span>
      </div>
    </Card>
  );
});