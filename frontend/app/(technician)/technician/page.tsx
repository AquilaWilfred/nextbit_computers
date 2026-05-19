"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/auth/useAuth";
import TechnicianLayout from "@/components/admin/TechnicianLayout";
import { useTechnicianData } from "@/hooks/technician_and_repairs/useTechnicianData";
import { useTechnicianActions } from "@/hooks/technician_and_repairs/useTechnicianActions";
import { useTechnicianMessages } from "@/hooks/technician_and_repairs/useTechnicianMessages";
import { DashboardTab } from "@/components/technician/DashboardTab";
import { RequestsTab } from "@/components/technician/RequestsTab";
import { JobsTab } from "@/components/technician/JobsTab";
import { EarningsTab } from "@/components/technician/EarningsTab";
import { ProfileTab } from "@/components/technician/ProfileTab";
import { MessagePanel } from "@/components/technician/MessagePanel";
import { ActiveTab, QuoteLineItem, IncomingRequest } from "@/types/technician.types";

export default function TechnicianPortalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const getTabFromUrl = (): ActiveTab => {
    const tab = searchParams?.get("tab") as ActiveTab;
    return tab || "dashboard";
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>(getTabFromUrl);

  useEffect(() => {
    setActiveTab(getTabFromUrl());
  }, [searchParams]);

  const {
    profile,
    incoming,
    jobs,
    completed,
    earnings,
    loading,
    error,
    refresh,
    refreshing,
    setOptimistic,
  } = useTechnicianData();

  const actions = useTechnicianActions(refresh, setOptimistic);
  const messages = useTechnicianMessages();

  const handleQuote = async (
    req: IncomingRequest,
    lines: QuoteLineItem[],
    notes: string,
    warrantyDays: number
  ) => {
    const success = await actions.sendQuote(req.id, lines, notes, warrantyDays);
    if (success) {
      refresh();
      router.push("/technician?tab=jobs");
    }
  };

  const handleAvailabilityToggle = async () => {
    await actions.updateAvailability(!profile?.available);
  };

  // ✅ FIX: Show loading while fetching OR if we have error but no profile yet
  if (loading || (!profile && !error)) {
    return (
      <TechnicianLayout>
        <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-emerald-600 border-t-transparent mb-4" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </TechnicianLayout>
    );
  }

  if (error && !profile) {
    return (
      <TechnicianLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-red-600 text-lg font-semibold mb-2">Error Loading Dashboard</div>
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </TechnicianLayout>
    );
  }

  // ✅ Add this: If still no profile after loading, show not found
  if (!profile) {
    return (
      <TechnicianLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-2">No Technician Profile Found</h2>
          <p className="text-muted-foreground mb-6">
            You don't have a technician profile. Please contact support.
          </p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Refresh
          </button>
        </div>
      </TechnicianLayout>
    );
  }

  const safeEarnings = earnings || {
    this_month: 0,
    last_month: 0,
    all_time: 0,
    pending: 0,
    jobs_this_month: 0,
    avg_job_value: 0,
    completion_rate: 0,
  };

  return (
    <TechnicianLayout>
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Manual refresh button */}
        <div className="fixed top-16 right-4 z-50">
          <button
            onClick={refresh}
            className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {activeTab === "dashboard" && (
          <DashboardTab
            profile={profile}
            incoming={incoming}
            jobs={jobs}
            earnings={safeEarnings}
            isAutoRefreshing={refreshing}
            onNavigate={(tab) => router.push(tab === "dashboard" ? "/technician" : `/technician?tab=${tab}`)}
            onAvailabilityToggle={handleAvailabilityToggle}
            onRefresh={refresh}
          />
        )}

        {activeTab === "requests" && (
          <RequestsTab
            incoming={incoming}
            onQuote={handleQuote}
            onDecline={actions.declineRequest}
            isAutoRefreshing={refreshing}
          />
        )}

        {activeTab === "jobs" && (
          <JobsTab
            jobs={jobs}
            completed={completed}
            onStatusUpdate={actions.updateJobStatus}
            onMessage={messages.openMessagePanel}
            isAutoRefreshing={refreshing}
          />
        )}

        {activeTab === "earnings" && (
          <EarningsTab earnings={safeEarnings} completed={completed} />
        )}

        {activeTab === "profile" && (
          <ProfileTab profile={profile} onSave={actions.saveProfile} />
        )}

        {messages.messagingJob && (
          <MessagePanel
            job={messages.messagingJob}
            messages={messages.messages}
            onSend={messages.sendMessage}
            onClose={messages.closeMessagePanel}
          />
        )}
      </div>
    </TechnicianLayout>
  );
}