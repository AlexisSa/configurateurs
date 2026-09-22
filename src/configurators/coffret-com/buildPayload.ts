import type { ConfigPayload, StockStatus } from "@/core/payload/types";
import type { PricingTierCode } from "@/core/pricing/pricingTiers";
import type { SkuPriceEntry } from "@/core/pricing/fetchSkuPrices";
import {
  pickSkuTierPrice,
  sumSkuLinePricesHT,
} from "@/core/pricing/fetchSkuPrices";
import type { BomLine } from "./bomBuilder";
import type { ConfigState } from "./configState";
import { buildLogicalRef } from "./logicalRef";

/** Adapte BOM + prix DB vers ConfigPayload (totaux × coffretCount). */
export function buildCoffretComPayload(input: {
  state: ConfigState;
  bom: BomLine[];
  pricingTierCode: PricingTierCode;
  stockStatus: StockStatus;
  priceEntries: Map<string, SkuPriceEntry>;
}): ConfigPayload {
  const { state, bom, pricingTierCode, stockStatus, priceEntries } = input;
  const count = Math.max(1, state.coffretCount || 1);
  const unit = sumSkuLinePricesHT(
    bom.map((line) => ({ sku: line.sku, qty: line.quantity })),
    priceEntries,
    pricingTierCode,
  );

  const breakdown = bom.map((line) => {
    const price = pickSkuTierPrice(priceEntries, line.sku, pricingTierCode);
    const amount = price == null ? 0 : price * line.quantity * count;
    return {
      label:
        count > 1
          ? `${count}× ${line.sku} × ${line.quantity}`
          : `${line.sku} × ${line.quantity}`,
      amount,
    };
  });

  const configRef = buildLogicalRef(state);

  return {
    configuratorId: "coffret-com",
    clientTariffCode: pricingTierCode,
    nomenclature: bom.map((line) => ({
      ref: line.sku,
      label: line.label,
      qty: line.quantity * count,
    })),
    options: {
      gammeId: state.gammeId,
      materiau: state.materiau,
      coffretCount: count,
      ...(configRef ? { configRef } : {}),
      ...state.options,
      ...(unit.missingSkus.length > 0
        ? { missingPriceSkus: unit.missingSkus.join(",") }
        : {}),
    },
    pricing: {
      currency: "EUR",
      total: unit.total * count,
      breakdown,
    },
    stockStatus,
    createdAt: new Date().toISOString(),
  };
}
