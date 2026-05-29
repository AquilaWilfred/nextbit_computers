// components/listings/HowItWorks.tsx
"use client";

import { FC } from 'react';
import { HOW_IT_WORKS_STEPS } from '@/constants/listings/listings.constants';

export const HowItWorks: FC = () => {
  return (
    /* 1. Wrapped in an isolated block with a solid bottom margin (mb-10) 
         to force physical separation from the filter buttons below.
    */
    <div className="w-full block clear-both mt-8 mb-10">
      {/* 2. Changed grid mapping to use 'sm:grid-cols-2 lg:grid-cols-4' 
           so it handles compact desktop and laptop displays beautifully without snapping to 1 column too early.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 border-b border-gray-100 pb-8">
        {HOW_IT_WORKS_STEPS.map((item) => (
          <div key={item.step} className="border-l-2 border-blue-500 pl-3.5 py-1 flex flex-col justify-center">
            <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <span className="text-base select-none">{item.icon}</span> 
              <span>{item.title}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1 leading-relaxed">
              {item.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;