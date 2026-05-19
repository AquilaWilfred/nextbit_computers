// hooks/useCarousel.ts
import { useState, useEffect, useCallback } from "react";
import { Banner } from "@/types/home.types";

export function useCarousel({ items, autoAdvance = true, interval = 2000 }: { 
  items: Banner[] | undefined; 
  autoAdvance?: boolean;
  interval?: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const total = items?.length ?? 0;

  const next = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    if (total <= 1) return;
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-advance
  useEffect(() => {
    if (!autoAdvance || total <= 1 || isHovered) return;
    const t = setInterval(next, interval);
    return () => clearInterval(t);
  }, [autoAdvance, total, isHovered, interval, next]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const diff = touchStart - touchEnd;
    if (diff > 50) next();
    else if (diff < -50) prev();
    setTouchStart(null);
    setTouchEnd(null);
  };

  return {
    activeIndex,
    setActiveIndex,
    isHovered,
    setIsHovered,
    next,
    prev,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}