// components/nextbit-wallet/admin/ActionButton.tsx

"use client";

import { FC, ReactNode } from "react";

interface ActionButtonProps {
  onClick: () => void;
  color?: "green" | "red" | "blue" | "gray";
  disabled?: boolean;
  children: ReactNode;
}

export const ActionButton: FC<ActionButtonProps> = ({
  onClick,
  color = "gray",
  disabled = false,
  children,
}) => {
  const colorMap = {
    green: "bg-green-50 text-green-700 hover:bg-green-100",
    red: "bg-red-50 text-red-700 hover:bg-red-100",
    blue: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    gray: "bg-gray-50 text-gray-700 hover:bg-gray-100",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${colorMap[color]} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
};