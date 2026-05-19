// components/technician/DashboardTab.tsx
"use client";

import { Bell, ChevronRight, Star, AlertTriangle, ToggleRight, ToggleLeft, TrendingUp, DollarSign, Wrench, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "./StatCard";
import { JobProgressBar } from "./JobProgressBar";
import { TechnicianProfile, IncomingRequest, ActiveJob, Earnings, ActiveTab } from "@/types/technician.types";
import { STATUS_META } from "@/constants/technician.constants";

interface DashboardTabProps {
  profile: TechnicianProfile;
  incoming: IncomingRequest[];
  jobs: ActiveJob[];
  earnings: Earnings | null;  // ← Allow null
  isAutoRefreshing?: boolean;  // ← Add this prop
  onNavigate: (tab: ActiveTab) => void;
  onAvailabilityToggle: () => void;
  onRefresh?: () => void;  // ← Add this prop (optional)
}

export function DashboardTab({
  profile,
  incoming,
  jobs,
  earnings,
  isAutoRefreshing = false,  // ← Default to false
  onNavigate,
  onAvailabilityToggle,
  onRefresh,  // ← Add to props
}: DashboardTabProps) {
  // if (!profile) {
  //   return (
  //     <div className="flex flex-col items-center justify-center py-16 text-center">
  //       <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-600 border-t-transparent mb-4" />
  //       <p className="text-muted-foreground">Loading technician profile...</p>
  //     </div>
  //   );
  // }

  // Add default earnings object if null
  const safeEarnings = earnings || {
    this_month: 0,
    last_month: 0,
    all_time: 0,
    pending: 0,
    jobs_this_month: 0,
    avg_job_value: 0,
    completion_rate: 0,
  };

  const quoteSentCount = jobs.filter((job) => job.status === "quote_sent").length;
  const quoteAcceptedCount = jobs.filter((job) => job.status === "quote_accepted").length;
  const inRepairCount = jobs.filter((job) => ["diagnosed", "parts_ordered", "in_repair", "ready"].includes(job.status)).length;

  return (
    <div className="space-y-6">
      {/* Welcome with refresh indicator */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Good morning, {profile.name?.split(" ")[0] || "Technician"} 👋</h2>
            {isAutoRefreshing && (
              <div className="flex items-center gap-1 text-xs text-blue-600 animate-pulse">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Syncing...</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Here's what needs your attention today.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Manual refresh button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4 text-gray-500" />
            </button>
          )}
          <button
            onClick={onAvailabilityToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              profile.available
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-gray-100 text-gray-500 border-gray-200"
            }`}
          >
            {profile.available ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
            {profile.available ? "Available" : "Unavailable"}
          </button>
        </div>
      </div>

      {/* Quick stats with subtle update effect */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard 
          label="This month" 
          value={`KES ${safeEarnings.this_month.toLocaleString()}`} 
          sub={`${safeEarnings.jobs_this_month} jobs`} 
          icon={<TrendingUp className="h-4 w-4" />} 
          highlight 
          isUpdating={isAutoRefreshing}
        />
        <StatCard 
          label="In escrow" 
          value={`KES ${safeEarnings.pending.toLocaleString()}`} 
          sub="Not yet released" 
          icon={<DollarSign className="h-4 w-4" />} 
          isUpdating={isAutoRefreshing}
        />
        <StatCard 
          label="Last month" 
          value={`KES ${safeEarnings.last_month.toLocaleString()}`} 
          icon={<TrendingUp className="h-4 w-4" />} 
          isUpdating={isAutoRefreshing}
        />
        <StatCard 
          label="Avg job value" 
          value={`KES ${safeEarnings.avg_job_value.toLocaleString()}`} 
          sub={`${safeEarnings.completion_rate}% completion rate`} 
          icon={<Wrench className="h-4 w-4" />} 
          isUpdating={isAutoRefreshing}
        />
      </div>

      {/* Incoming requests alert - no changes needed here */}
      {incoming.length > 0 && (
        <div
          className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => onNavigate("requests")}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <Bell className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-sm font-semibold text-blue-800">
                {incoming.length} new repair request{incoming.length > 1 ? "s" : ""}
              </div>
              <div className="text-xs text-blue-600">
                Closest: {incoming[0]?.location} · {incoming[0]?.distanceKm} km
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-blue-600" />
        </div>
      )}

      {/* Active jobs */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="p-4 rounded-xl border bg-background relative">
          {isAutoRefreshing && (
            <div className="absolute top-2 right-2">
              <div className="animate-pulse h-1.5 w-1.5 rounded-full bg-blue-500"></div>
            </div>
          )}
          <div className="text-xs uppercase text-muted-foreground">Quotes pending</div>
          <div className="mt-2 text-2xl font-semibold">{quoteSentCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">Sent and waiting customer response</div>
        </div>
        <div className="p-4 rounded-xl border bg-background relative">
          {isAutoRefreshing && (
            <div className="absolute top-2 right-2">
              <div className="animate-pulse h-1.5 w-1.5 rounded-full bg-blue-500"></div>
            </div>
          )}
          <div className="text-xs uppercase text-muted-foreground">Quotes accepted</div>
          <div className="mt-2 text-2xl font-semibold">{quoteAcceptedCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">Accepted by customers</div>
        </div>
        <div className="p-4 rounded-xl border bg-background relative">
          {isAutoRefreshing && (
            <div className="absolute top-2 right-2">
              <div className="animate-pulse h-1.5 w-1.5 rounded-full bg-blue-500"></div>
            </div>
          )}
          <div className="text-xs uppercase text-muted-foreground">Repairs in progress</div>
          <div className="mt-2 text-2xl font-semibold">{inRepairCount}</div>
          <div className="mt-1 text-xs text-muted-foreground">Work currently underway</div>
        </div>
      </div>

      {jobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Active jobs</h3>
            <button className="text-xs text-emerald-600 font-medium" onClick={() => onNavigate("jobs")}>
              See all →
            </button>
          </div>
          <div className="space-y-3">
            {jobs.slice(0, 2).map((job) => (
              <div key={job.id} className="p-3 rounded-lg border bg-background">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{job.brand}</span>
                  <span className={`text-xs font-medium ${STATUS_META[job.status]?.color || "text-gray-500"}`}>
                    {STATUS_META[job.status]?.label || job.status}
                  </span>
                </div>
                <JobProgressBar status={job.status} />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{job.customerName}</span>
                  <span>KES {job.quotedAmount?.toLocaleString() || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Profile completeness */}
      {!profile.iprsVerified && (
        <div
          className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200 cursor-pointer"
          onClick={() => onNavigate("profile")}
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <div className="text-sm font-semibold text-amber-800">Complete your verification</div>
              <div className="text-xs text-amber-600">Upload your ID to get the IPRS badge</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-amber-600" />
        </div>
      )}

      {/* Rating summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-700">{profile.rating || 0}</div>
              <div className="flex justify-center mt-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={`h-3.5 w-3.5 ${i <= Math.floor(profile.rating || 0) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`} />
                ))}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{profile.reviewCount || 0} reviews</div>
            </div>
            <div className="flex-1 space-y-1">
              {[5, 4, 3, 2, 1].map((star) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs w-3">{star}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: star === 5 ? "78%" : star === 4 ? "16%" : "3%" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}