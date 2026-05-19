// components/technician/EarningsTab.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote, Plus, ArrowUpRight, Star, Lock, TrendingUp, BarChart3, Zap, RefreshCw } from "lucide-react";
import { StatCard } from "./StatCard";
import { Earnings, CompletedJob } from "@/types/technician.types";
import { PAYOUT_STATUS_META } from "@/constants/technician.constants";

interface EarningsTabProps {
  earnings: Earnings;
  completed: CompletedJob[];
  isAutoRefreshing?: boolean;  // Add this
}

export function EarningsTab({ earnings, completed, isAutoRefreshing = false }: EarningsTabProps) {
  return (
    <div className="space-y-6">
      {/* Auto-refresh indicator */}
      {isAutoRefreshing && (
        <div className="flex items-center justify-center gap-2 text-xs text-blue-600 bg-blue-50 py-2 rounded-lg">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Earnings data syncing...</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          label="This month" 
          value={`KES ${earnings.this_month.toLocaleString()}`} 
          sub={`${earnings.jobs_this_month} jobs`} 
          icon={<TrendingUp className="h-4 w-4" />} 
          highlight 
          isUpdating={isAutoRefreshing}
        />
        <StatCard 
          label="In escrow" 
          value={`KES ${earnings.pending.toLocaleString()}`} 
          sub="Pending release" 
          icon={<Lock className="h-4 w-4" />} 
          isUpdating={isAutoRefreshing}
        />
        <StatCard 
          label="Last month" 
          value={`KES ${earnings.last_month.toLocaleString()}`} 
          icon={<BarChart3 className="h-4 w-4" />} 
          isUpdating={isAutoRefreshing}
        />
        <StatCard 
          label="Avg job value" 
          value={`KES ${earnings.avg_job_value.toLocaleString()}`} 
          sub={`${earnings.completion_rate}% completion rate`} 
          icon={<Zap className="h-4 w-4" />} 
          isUpdating={isAutoRefreshing}
        />
      </div>

      {/* Payout account */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4" /> Payout account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div>
              <div className="font-medium">M-Pesa · 0712 345 6xx</div>
              <div className="text-xs text-muted-foreground">Payouts every Friday</div>
            </div>
            <Button size="sm" variant="outline">Edit</Button>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add payout method
          </Button>
        </CardContent>
      </Card>

      {/* Recent payouts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Recent jobs</h3>
          <Button variant="ghost" size="sm" className="text-xs gap-1">
            Download CSV <ArrowUpRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="space-y-2">
          {completed.map((job) => (
            <div key={job.id} className="flex items-center justify-between py-3 border-b last:border-0">
              <div>
                <div className="text-sm font-medium">{job.device} · {job.issue.slice(0, 35)}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span>{job.customerName}</span>
                  <span>·</span>
                  <span>{job.completedAt}</span>
                  {job.customerRating && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-amber-600">
                        <Star className="h-3 w-3 fill-amber-400" />{job.customerRating}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">KES {job.amount.toLocaleString()}</div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${PAYOUT_STATUS_META[job.payoutStatus].className}`}>
                  {PAYOUT_STATUS_META[job.payoutStatus].label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}