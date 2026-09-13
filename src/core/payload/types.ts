import type { PricingTierCode } from "@/core/pricing/pricingTiers";

/** Contrat de sortie unique — prêt panier / devis, quel que soit le configurateur. */
export type StockStatus = "ok" | "partial" | "unknown";

export type ConfigPayload = {
  configuratorId: string;
  clientTariffCode: PricingTierCode;
  nomenclature: Array<{ ref: string; label: string; qty: number }>;
  options: Record<string, string | number | boolean>;
  dimensions?: Record<string, number>;
  pricing: {
    currency: "EUR";
    total: number;
    breakdown?: Array<{ label: string; amount: number }>;
  };
  stockStatus: StockStatus;
  createdAt: string;
};
