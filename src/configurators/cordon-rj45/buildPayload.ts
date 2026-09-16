import type { ConfigPayload, StockStatus } from "@/core/payload/types";
import { pickTierPrice } from "@/core/pricing/priceLevels";
import type { PricingTierCode } from "@/core/pricing/pricingTiers";
import { parseLengthMeters, type Rj45Product } from "./catalog";

/** Adapte l’état interne cordon RJ45 vers le contrat ConfigPayload partagé. */
export function buildCordonRj45Payload(input: {
  product: Rj45Product;
  quantity: number;
  pricingTierCode: PricingTierCode;
  stockStatus: StockStatus;
}): ConfigPayload {
  const { product, pricingTierCode, stockStatus } = input;
  const qty = Math.max(1, Math.floor(input.quantity) || 1);
  const unit = pickTierPrice(product.prices, pricingTierCode);
  const total = unit == null ? 0 : unit * qty;

  const lengthM = parseLengthMeters(product.length);
  const options: ConfigPayload["options"] = {
    sku: product.sku,
    cordonType: product.cordonType,
  };
  if (product.oxatisId != null) options.oxatisId = product.oxatisId;
  if (product.category) options.category = product.category;
  if (product.color) options.color = product.color;
  if (product.length) options.length = product.length;
  if (product.shielding) options.shielding = product.shielding;

  return {
    configuratorId: "cordon-rj45",
    clientTariffCode: pricingTierCode,
    nomenclature: [
      {
        ref: product.sku,
        label: product.label,
        qty,
      },
    ],
    options,
    dimensions:
      lengthM == null
        ? undefined
        : { lengthMm: Math.round(lengthM * 1000) },
    pricing: {
      currency: "EUR",
      total,
      breakdown:
        unit == null
          ? undefined
          : [{ label: `${product.sku} × ${qty}`, amount: total }],
    },
    stockStatus,
    createdAt: new Date().toISOString(),
  };
}
