"use client";

import { FC } from 'react';
import { CreditCard } from 'lucide-react';
import { VirtualCard } from '@/types/nextbit-wallet/cards.types';
import { FlipCard3D } from './FlipCard3D';
import { useCardFreeze } from '@/hooks/nextbit-wallet/useCardFreeze';
import { useCopyToClipboard } from '@/hooks/nextbit-wallet/useCopyToClipboard';

interface VirtualCardSectionProps {
  virtualCard: VirtualCard;
  cardholderName: string;
  onStatusChange: () => void;
}

export const VirtualCardSection: FC<VirtualCardSectionProps> = ({ 
  virtualCard, 
  cardholderName, 
  onStatusChange 
}) => {
  const { copyToClipboard } = useCopyToClipboard();
  const { toggling, toggleFreeze } = useCardFreeze({ 
    virtualCard, 
    onStatusChange: () => onStatusChange() 
  });

  return (
    <div className="mb-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-purple-600" />
        Your Active Virtual Card
      </h2>
      <div className="bg-gradient-to-br from-gray-950 via-blue-950/80 to-purple-950/70 rounded-3xl p-8 flex flex-col items-center gap-4 shadow-2xl border border-purple-900/40">
        <FlipCard3D
          card={virtualCard}
          balance={virtualCard.balance}
          cardholderName={cardholderName}
          onToggleFreeze={toggleFreeze}
          onCopy={copyToClipboard}
          toggling={toggling}
        />
      </div>
    </div>
  );
};