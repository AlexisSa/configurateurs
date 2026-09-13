import type { ConfigPayload } from "@/core/payload/types";
import { sumLinePricesHT } from "@/core/pricing/pricing";
import type { PricingTierCode } from "@/core/pricing/pricingTiers";
import type { StockStatus } from "@/core/payload/types";

export type StubState = {
  label: string;
  quantity: number;
  widthMm: number;
};

const DEMO_SKU = "DEMO-SKU";

/** Adapte l’état interne du stub vers le contrat ConfigPayload partagé. */
export function buildStubPayload(input: {
  state: StubState;
  pricingTierCode: PricingTierCode;
  stockStatus: StockStatus;
}): ConfigPayload {
  const { state, pricingTierCode, stockStatus } = input;
  const qty = Math.max(1, Math.floor(state.quantity) || 1);
  const { total } = sumLinePricesHT([{ sku: DEMO_SKU, qty }], pricingTierCode);

  return {
    configuratorId: "stub",
    clientTariffCode: pricingTierCode,
    nomenclature: [
      {
        ref: DEMO_SKU,
        label: state.label.trim() || "Article démo",
        qty,
      },
    ],
    options: {
      label: state.label,
    },
    dimensions: {
      widthMm: state.widthMm,
    },
    pricing: {
      currency: "EUR",
      total,
      breakdown: [{ label: `${DEMO_SKU} × ${qty}`, amount: total }],
    },
    stockStatus,
    createdAt: new Date().toISOString(),
  };
}

export { DEMO_SKU };
