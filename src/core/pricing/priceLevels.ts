import type { PricingTierCode } from "./pricingTiers";

/**
 * Oxatis PriceN → `product_prices.level` → code app S–Z.
 * Tarif 1 (level 1) non utilisé côté client ; level 7 souvent = prix barré / liste.
 */
export const TIER_TO_PRICE_LEVEL: Record<PricingTierCode, number> = {
  S: 2,
  M: 3,
  B: 4,
  A: 5,
  Z: 6,
};

export function priceLevelForTier(tier: PricingTierCode): number {
  return TIER_TO_PRICE_LEVEL[tier];
}

export type TierPriceMap = Partial<Record<PricingTierCode, number>>;

/** Convertit les lignes `product_prices` (level) en map S–Z. */
export function tierPricesFromLevels(
  rows: Array<{ level: number; price_ht: number | null }>,
): TierPriceMap {
  const byLevel = new Map<number, number>();
  for (const row of rows) {
    const value = normalizePriceHt(row.price_ht);
    if (value == null) continue;
    byLevel.set(row.level, value);
  }

  const result: TierPriceMap = {};
  for (const [tier, level] of Object.entries(TIER_TO_PRICE_LEVEL) as Array<
    [PricingTierCode, number]
  >) {
    const price = byLevel.get(level);
    if (price != null) result[tier] = price;
  }
  return result;
}

export function normalizePriceHt(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function pickTierPrice(
  prices: TierPriceMap | null | undefined,
  tier: PricingTierCode,
): number | null {
  if (!prices) return null;
  return prices[tier] ?? null;
}
