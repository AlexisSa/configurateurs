import { getSkuTierPriceHT } from "./pricingMatrix";
import type { PricingTierCode } from "./pricingTiers";

/** Point d’entrée unique pour les configurateurs : prix HT d’un SKU au tarif client. */
export function getUnitPriceHT(sku: string, tier: PricingTierCode): number | null {
  return getSkuTierPriceHT(sku, tier);
}

export function sumLinePricesHT(
  lines: Array<{ sku: string; qty: number }>,
  tier: PricingTierCode,
): { total: number; missingSkus: string[] } {
  let total = 0;
  const missingSkus: string[] = [];

  for (const line of lines) {
    const unit = getUnitPriceHT(line.sku, tier);
    if (unit == null) {
      missingSkus.push(line.sku);
      continue;
    }
    total += unit * line.qty;
  }

  return { total, missingSkus };
}
