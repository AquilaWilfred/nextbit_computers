"use client";

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, RefreshCw, Copy } from "lucide-react";

interface InviteLinkCardProps {
  inviteLink: string | null;
  generating: boolean;
  onGenerate: () => void;
  onCopy: () => void;
  onRegenerate: () => void;
}

export const InviteLinkCard = memo(function InviteLinkCard({
  inviteLink,
  generating,
  onGenerate,
  onCopy,
  onRegenerate,
}: InviteLinkCardProps) {
  return (
    <Card className="border border-border p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-[var(--brand)]" />
        <h3 className="font-semibold text-sm">Share Invite Link</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Generate a one-time link the store can use to self-onboard without an email.
      </p>

      {inviteLink ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
            <span className="text-xs text-muted-foreground truncate flex-1">{inviteLink}</span>
            <button onClick={onCopy} aria-label="Copy link">
              <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={onRegenerate} disabled={generating}>
            <RefreshCw className="w-3 h-3" /> Regenerate
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={onGenerate} disabled={generating}>
          {generating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
          Generate Link
        </Button>
      )}
    </Card>
  );
});