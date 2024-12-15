import { SellerTier } from "@prisma/client";

export const SELLER_TIER_RATES: Record<SellerTier, number> = {
  SEED: 0.07,
  SPROUT: 0.1,
  GROWTH: 0.15,
  BLOOM: 0.2,
  EVERGREEN: 0.25,
  EARTH_GUARDIAN: 0.3,
};

export function getSellerTierRate(tier: SellerTier): number {
  return SELLER_TIER_RATES[tier] ?? SELLER_TIER_RATES.SEED;
}

export function calculateSellerTier(totalSales: number): SellerTier {
  if (totalSales >= 50000) return "EARTH_GUARDIAN";
  if (totalSales >= 25000) return "EVERGREEN";
  if (totalSales >= 10000) return "BLOOM";
  if (totalSales >= 5000) return "GROWTH";
  if (totalSales >= 1000) return "SPROUT";
  return "SEED";
}

export function createEmptyProfitByTier(): Record<SellerTier, number> {
  return {
    SEED: 0,
    SPROUT: 0,
    GROWTH: 0,
    BLOOM: 0,
    EVERGREEN: 0,
    EARTH_GUARDIAN: 0,
  };
}
