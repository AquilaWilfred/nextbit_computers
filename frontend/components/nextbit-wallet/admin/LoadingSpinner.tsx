// components/nextbit-wallet/admin/LoadingSpinner.tsx

"use client";

import { FC } from "react";

export const LoadingSpinner: FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3" />
        <p className="text-sm text-gray-500 tracking-wide">Loading admin dashboard…</p>
      </div>
    </div>
  );
};