// components/listings/StatusFilters.tsx
"use client";

import { FC, useMemo, useCallback, memo } from 'react';

interface StatusFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  counts: {
    total: number;
    pending: number;
    active: number;
    sold: number;
    rejected: number;
  };
}

export const StatusFilters: FC<StatusFiltersProps> = ({
  activeFilter,
  onFilterChange,
  counts,
}) => {
  const filters = useMemo(() => [
    { 
      id: 'all', 
      label: 'All Listings', 
      count: counts.total, 
      color: 'blue' as const 
    },
    { 
      // Keep this matching your backend data structure key
      id: 'pending_verification', 
      label: 'Pending', 
      count: counts.pending, 
      color: 'yellow' as const 
    },
    { 
      id: 'listed', 
      label: 'Live', 
      count: counts.active, 
      color: 'blue' as const 
    },
    { 
      id: 'sold', 
      label: 'Sold', 
      count: counts.sold, 
      color: 'green' as const 
    },
  ], [counts]);

  const handleFilterClick = useCallback((filterId: string) => {
    onFilterChange(filterId);
  }, [onFilterChange]);

  return (
    <div className="clear-both w-full flex flex-wrap gap-4 mt-8 mb-6 relative z-10">
      {filters.map((filter) => {
        // FIX: Evaluates true whether your state hook uses 'pending' or 'pending_verification'
        const isActive = 
          activeFilter === filter.id || 
          (filter.id === 'pending_verification' && activeFilter === 'pending');
        
        const baseButtonClass = "h-11 px-5 rounded-2xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2.5 whitespace-nowrap border cursor-pointer";
        
        // High-contrast configurations for active states using vibrant amber-yellow
        const activeStyles: Record<string, string> = {
          blue: 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20',
          yellow: 'bg-amber-400 text-amber-950 border-amber-400 shadow-md shadow-amber-400/40',
          green: 'bg-green-600 text-white border-green-600 shadow-md shadow-green-500/20',
        };
        
        const inactiveButtonClass = "bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 border-gray-200 hover:border-gray-300";

        const badgeClass = `px-2.5 py-0.5 rounded-full text-xs font-bold min-w-[22px] text-center transition-colors ${
          isActive 
            ? filter.color === 'yellow' 
              ? 'bg-amber-950/15 text-amber-950' 
              : 'bg-white/20 text-white' 
            : 'bg-gray-200 text-gray-800 group-hover:bg-gray-300'
        }`;

        return (
          <button
            key={filter.id}
            onClick={() => handleFilterClick(filter.id)}
            className={`group ${baseButtonClass} ${isActive ? activeStyles[filter.color] : inactiveButtonClass}`}
          >
            <span>{filter.label}</span>
            <span className={badgeClass}>
              {filter.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default memo(StatusFilters);