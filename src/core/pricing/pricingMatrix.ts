import pricingMatrix from "./pricingMatrix.json";
import type { PricingTierCode } from "./pricingTiers";

type SkuPrices = Partial<Record<PricingTierCode, number | null>>;

/**
 * Prix HT unitaire pour un SKU et un tarif.
 * `null` = tarif non disponible pour ce produit.
 */
export function getSkuTierPriceHT(
  sku: string,
  tier: PricingTierCode,
): number | null {
  const prices = (pricingMatrix.skus as Record<string, SkuPrices>)[sku];
  if (!prices) return null;
  const value = prices[tier];
  return typeof value === "number" ? value : null;
}

export function listKnownSkus(): string[] {
  return Object.keys(pricingMatrix.skus);
}
