"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Wifi, WifiOff } from "lucide-react";

interface CustomersHeaderProps {
  wsConnected: boolean;
  isCampaignPending: boolean;
  onTriggerCampaign: () => void;
}

export const CustomersHeader = memo(function CustomersHeader({
  wsConnected,
  isCampaignPending,
  onTriggerCampaign,
}: CustomersHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold">Customers Management</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2">
          View and manage customer accounts
          {wsConnected ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Wifi className="w-3 h-3" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <WifiOff className="w-3 h-3" /> Polling
            </span>
          )}
        </p>
      </div>
      <Button
        onClick={onTriggerCampaign}
        disabled={isCampaignPending}
        className="bg-pink-600 hover:bg-pink-700 text-white gap-2 shadow-sm"
        aria-label="Run AI email marketing campaign"
      >
        {isCampaignPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        Run AI Email Campaign
      </Button>
    </div>
  );
});