// components/listings/TradeInHeader.tsx
"use client";

import { FC } from 'react';

interface TradeInHeaderProps {
  onListDevice: () => void;
}

export const TradeInHeader: FC<TradeInHeaderProps> = ({ onListDevice }) => {
  return (
    <div className="mb-8 border-b border-gray-200 pb-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold">
              Trade-In Program
            </span>
            <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full">
              📱 Working Devices Only
            </span>
            <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full">
              ✨ Earn Platform Credit
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Sell Your Device</h1>
          <p className="text-gray-500 max-w-2xl mt-2">
            List your working device for sale on NextBit Marketplace. Get verified, listed, 
            and earn platform credit when it sells.
          </p>
        </div>
        
        <button
          onClick={onListDevice}
          className="bg-blue-700 hover:bg-blue-800 text-red-700 hover:text-blue-800 px-6 py-3 rounded-xl text-sm font-semibold shadow-md transition-all flex items-center gap-2"
        >
          <span>📱</span> + List Your Device
        </button>
      </div>
    </div>
  );
};