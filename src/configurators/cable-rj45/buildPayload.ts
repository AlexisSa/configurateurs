import type { ConfigPayload, StockStatus } from "@/core/payload/types";
import { pickTierPrice } from "@/core/pricing/priceLevels";
import type { PricingTierCode } from "@/core/pricing/pricingTiers";
import type { CableProduct } from "./catalog";

export function buildCableRj45Payload(input: {
  product: CableProduct;
  quantity: number;
  pricingTierCode: PricingTierCode;
  stockStatus: StockStatus;
}): ConfigPayload {
  const { product, pricingTierCode, stockStatus } = input;
  const qty = Math.max(1, Math.floor(input.quantity) || 1);
  const unit = pickTierPrice(product.prices, pricingTierCode);
  const total = unit == null ? 0 : unit * qty;

  const options: ConfigPayload["options"] = {
    sku: product.sku,
  };
  if (product.oxatisId != null) options.oxatisId = product.oxatisId;
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
      breakdown:
        unit == null
          ? undefined
          : [{ label: `${product.sku} × ${qty}`, amount: total }],
    },
    stockStatus,
    createdAt: new Date().toISOString(),
  };
}
