"use client";

import { FC } from 'react';

export const CardsHero: FC = () => {
  return (
    <div className="mb-10">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-blue-900 text-xs font-semibold px-3 py-1 rounded-full">
              Powered by NextBit - Flutterwave Association
            </span>
            <span className="bg-cyan-100 text-cyan-800 text-xs font-semibold px-3 py-1 rounded-full">
              Secure &amp; Global
            </span>
            <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
              ✨ Premium Benefits
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-purple-600 bg-clip-text text-transparent">
            NextBit Wallet
          </h1>
          <p className="text-gray-700 max-w-2xl mt-3 text-lg">
            Experience the future of finance with our premium Visa card suite.
            From everyday spending to global luxury, choose the card that fits your lifestyle.
          </p>
        </div>
      </div>
    </div>
  );
};