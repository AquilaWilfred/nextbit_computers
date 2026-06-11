// components/nextbit-wallet/admin/CardTypeBreakdown.tsx

"use client";

import { FC } from "react";
import { CardRecord, CardType } from "@/types/nextbit-wallet/admin.cards.types";
import { CARD_TYPE_LABELS, CARD_TYPE_COLORS } from "@/constants/nextbit-wallet/admin.cards.constants";

interface CardTypeBreakdownProps {
  cards: CardRecord[];
}

export const CardTypeBreakdown: FC<CardTypeBreakdownProps> = ({ cards }) => {
  const cardTypes: CardType[] = ["e_nextbit", "visa_cyber", "visa_black"];
  
  const getCardTypeData = (cardType: CardType) => {
    const subset = cards.filter(c => c.cardType === cardType);
    const active = subset.filter(c => c.status === "active").length;
    const volume = subset.reduce((sum, c) => sum + c.totalSpent, 0);
    return { subset, active, volume };
  };

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {cardTypes.map((cardType) => {
        const { subset, active, volume } = getCardTypeData(cardType);
        return (
          <div key={cardType} className={`bg-gradient-to-br ${CARD_TYPE_COLORS[cardType]} rounded-2xl p-5 text-white`}>
            <div className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">
              {CARD_TYPE_LABELS[cardType]}
            </div>
            <div className="text-3xl font-bold mb-3">
              {subset.length} <span className="text-base font-normal opacity-70">cards</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white/15 rounded-xl px-3 py-2">
                <div className="opacity-70 text-xs">Active</div>
                <div className="font-bold">{active}</div>
              </div>
              <div className="bg-white/15 rounded-xl px-3 py-2">
                <div className="opacity-70 text-xs">Volume</div>
                <div className="font-bold">KES {(volume / 1000).toFixed(0)}K</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};