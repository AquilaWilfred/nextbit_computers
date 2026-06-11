// components/nextbit-wallet/admin/OverviewRecentActivity.tsx

"use client";

import { FC } from "react";
import { Transaction, Application } from "@/types/nextbit-wallet/admin.cards.types";
import { StatusBadge } from "./StatusBadge";
import { ActionButton } from "./ActionButton";

interface OverviewRecentActivityProps {
  transactions: Transaction[];
  applications: Application[];
  onApproveApplication: (appId: string) => void;
  onRejectApplication: (appId: string) => void;
  isApplicationLoading: (appId: string) => boolean;
}

const formatCurrency = (value: number) => value.toLocaleString();

export const OverviewRecentActivity: FC<OverviewRecentActivityProps> = ({
  transactions,
  applications,
  onApproveApplication,
  onRejectApplication,
  isApplicationLoading,
}) => {
  const pendingApps = applications.filter(a => a.status === "pending").slice(0, 6);
  const recentTx = transactions.slice(0, 6);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" strokeWidth="1.7"/>
          </svg>
          <span>Recent Transactions</span>
        </h3>
        <div className="space-y-2">
          {recentTx.map((tx) => (
            <div key={tx.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-semibold text-gray-800">{tx.merchant}</div>
                <div className="text-xs text-gray-400">{tx.holderName} · ••{tx.cardLastFour}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${tx.amount > 0 ? "text-green-600" : "text-gray-800"}`}>
                  {tx.amount > 0 ? "+" : ""}{formatCurrency(tx.amount)} KES
                </div>
                <StatusBadge status={tx.status} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Applications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="1.7"/>
            <polyline points="12 6 12 12 16 14" strokeWidth="1.7"/>
          </svg>
          <span>Pending Applications</span>
        </h3>
        <div className="space-y-2">
          {pendingApps.map((app) => (
            <div key={app.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-sm font-semibold text-gray-800">{app.holderName}</div>
                <div className="text-xs text-gray-400">{app.cardType}</div>
              </div>
              <div className="flex gap-1.5">
                <ActionButton
                  color="green"
                  onClick={() => onApproveApplication(app.id)}
                  disabled={isApplicationLoading(app.id)}
                >
                  Approve
                </ActionButton>
                <ActionButton
                  color="red"
                  onClick={() => onRejectApplication(app.id)}
                  disabled={isApplicationLoading(app.id)}
                >
                  Reject
                </ActionButton>
              </div>
            </div>
          ))}
          {pendingApps.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No pending applications</p>
          )}
        </div>
      </div>
    </div>
  );
};