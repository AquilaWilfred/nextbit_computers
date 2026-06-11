// components/nextbit-wallet/admin/CardsTable.tsx

"use client";

import { FC } from "react";
import { CardRecord } from "@/types/nextbit-wallet/admin.cards.types";
import { StatusBadge } from "./StatusBadge";
import { ActionButton } from "./ActionButton";

interface CardsTableProps {
  cards: CardRecord[];
  onToggleFreeze: (cardId: string, currentStatus: string) => void;
  onCancelCard: (cardId: string) => void;
  isActionLoading: (cardId: string, action: string) => boolean;
}

const formatCurrency = (value: number) => value.toLocaleString();

export const CardsTable: FC<CardsTableProps> = ({
  cards,
  onToggleFreeze,
  onCancelCard,
  isActionLoading,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Card Holder</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Card Number</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Spent</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Issued</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {cards.map((card) => (
            <tr key={card.id} className={`hover:bg-gray-50/50 ${card.fraudFlag ? "bg-red-50/40" : ""}`}>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="font-semibold text-gray-900 text-sm">{card.holderName}</div>
                <div className="text-xs text-gray-400">{card.holderEmail}</div>
                {card.fraudFlag && <span className="text-xs text-red-600 font-semibold">⚠ Fraud flag</span>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap"><span className="font-mono text-xs">{card.cardNumber}</span></td>
              <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={card.cardType} /></td>
              <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={card.status} /></td>
              <td className="px-4 py-3 whitespace-nowrap font-semibold">KES {formatCurrency(card.balance)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-500">KES {formatCurrency(card.totalSpent)}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs">{new Date(card.issuedAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 whitespace-nowrap text-gray-400 text-xs">{new Date(card.expiresAt).toLocaleDateString()}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex gap-1.5">
                  <ActionButton
                    color={card.status === "frozen" ? "green" : "blue"}
                    onClick={() => onToggleFreeze(card.id, card.status)}
                    disabled={isActionLoading(card.id, "freeze")}
                  >
                    {card.status === "frozen" ? "Unfreeze" : "Freeze"}
                  </ActionButton>
                  <ActionButton
                    color="red"
                    onClick={() => onCancelCard(card.id)}
                    disabled={isActionLoading(card.id, "cancel")}
                  >
                    Cancel
                  </ActionButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};