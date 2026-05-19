import { useState, useEffect, useCallback } from "react";
import { Banner } from "@/types/content.types";

export function useBannerReorder(banners: Banner[] | null, onReorder: (ids: number[]) => Promise<void>) {
  const [orderedBanners, setOrderedBanners] = useState<Banner[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (banners) {
      setOrderedBanners([...banners].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
    }
  }, [banners]);

  const handleDragStart = useCallback((_e: React.DragEvent, index: number) => {
    setTimeout(() => setDraggedIndex(index), 0);
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    const next = [...orderedBanners];
    const [item] = next.splice(draggedIndex, 1);
    next.splice(index, 0, item);
    setDraggedIndex(index);
    setOrderedBanners(next);
  }, [draggedIndex, orderedBanners]);

  const handleDragEnd = useCallback(async () => {
    setDraggedIndex(null);
    await onReorder(orderedBanners.map((b) => b.id));
  }, [orderedBanners, onReorder]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  return {
    orderedBanners,
    draggedIndex,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleDragOver,
  };
}