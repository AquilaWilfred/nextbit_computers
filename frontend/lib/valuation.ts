import { Score } from "@/types/probe";

export function estimateValue(score: Score, basePrice: number = 50000): { kes: number; usd: number } {
  // Simple valuation based on score percentage
  const multiplier = score.pct / 100;
  const kes = Math.round(basePrice * multiplier);
  const usd = Math.round(kes / 130); // Approx exchange rate
  return { kes, usd };
}