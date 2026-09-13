import pricingTiersConfig from "./pricingTiers.json";

/** Codes tarifaires Xeilom / Oxatis (du moins au plus avantageux). */
export type PricingTierCode = "S" | "M" | "B" | "A" | "Z";

const TIER_CODES = new Set<PricingTierCode>(["S", "M", "B", "A", "Z"]);

const categoryToTier = new Map(
  pricingTiersConfig.tiers.map((tier) => [String(tier.categoryId), tier.code as PricingTierCode]),
);

export function isPricingTierCode(value: unknown): value is PricingTierCode {
  return typeof value === "string" && TIER_CODES.has(value as PricingTierCode);
}

/**
 * Résout un catid Oxatis (ou un code déjà connu) vers S–Z.
 * Visiteur non connecté / inconnu → tarif S (public).
 */
export function resolvePricingTierCode(
  categoryIdOrTier?: string | number | null,
): PricingTierCode {
  if (categoryIdOrTier == null || categoryIdOrTier === "") {
    return pricingTiersConfig.defaultTier as PricingTierCode;
  }

  const raw = String(categoryIdOrTier).trim().toUpperCase();
  if (isPricingTierCode(raw)) {
    return raw;
  }

  return categoryToTier.get(String(categoryIdOrTier).trim()) ?? (pricingTiersConfig.defaultTier as PricingTierCode);
}

export function getPricingTierLabel(code: PricingTierCode): string {
  const tier = pricingTiersConfig.tiers.find((entry) => entry.code === code);
  return tier?.label ?? code;
}
