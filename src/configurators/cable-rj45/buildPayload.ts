import type { ConfigPayload, StockStatus } from "@/core/payload/types";
import { sumLinePricesHT } from "@/core/pricing/pricing";
import type { PricingTierCode } from "@/core/pricing/pricingTiers";
import type { CableProduct } from "./catalog";

/** Adapte l’état interne câble RJ45 vers le contrat ConfigPayload partagé. */
export function buildCableRj45Payload(input: {
  product: CableProduct;
  quantity: number;
  pricingTierCode: PricingTierCode;
  stockStatus: StockStatus;
}): ConfigPayload {
  const { product, pricingTierCode, stockStatus } = input;
  const qty = Math.max(1, Math.floor(input.quantity) || 1);
  const { total } = sumLinePricesHT(
    [{ sku: product.sku, qty }],
    pricingTierCode,
  );

  const options: ConfigPayload["options"] = {
    sku: product.sku,
  };
  if (product.category) options.category = product.category;
  if (product.color) options.color = product.color;
  if (product.shielding) options.shielding = product.shielding;
  if (product.sheath) options.sheath = product.sheath;
  if (product.productType) options.productType = product.productType;
  if (product.pairCount) options.pairCount = product.pairCount;

  return {
    configuratorId: "cable-rj45",
    clientTariffCode: pricingTierCode,
    nomenclature: [
      {
        ref: product.sku,
        label: product.label,
        qty,
      },
    ],
    options,
    pricing: {
      currency: "EUR",
      total,
      breakdown: [{ label: `${product.sku} × ${qty}`, amount: total }],
    },
    stockStatus,
    createdAt: new Date().toISOString(),
  };
}
