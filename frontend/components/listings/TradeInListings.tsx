// components/listings/TradeInListings.tsx
"use client";

import { FC, useState, useCallback } from 'react';
import { TradeInRequest } from '@/types/listings/listings.types';
import { TradeInCard } from './TradeInCard';
import { EmptyState } from './EmptyState';

interface TradeInListingsProps {
  listings: TradeInRequest[];
}

export const TradeInListings: FC<TradeInListingsProps> = ({ listings: initialListings }) => {
  const [listings, setListings] = useState(initialListings);

  const handleListingDeleted = useCallback((listingId: number) => {
    setListings(prev => prev.filter(listing => listing.id !== listingId));
  }, []);

  if (listings.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      {listings.map((listing) => (
        <TradeInCard 
          key={listing.id} 
          listing={listing} 
          onDeleted={handleListingDeleted}
        />
      ))}
    </div>
  );
};