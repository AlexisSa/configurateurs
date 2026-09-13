"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useEmbedContext } from "@/core/embed/useEmbedContext";
import { useEmbedResize } from "@/core/embed/useEmbedResize";
import type { PricingTierCode } from "@/core/pricing/pricingTiers";
import { getPricingTierLabel } from "@/core/pricing/pricingTiers";

export type ClientContextValue = {
  /** Code tarifaire appliqué (lecture seule pour les configurateurs). */
  pricingTierCode: PricingTierCode;
  categoryId: string | null;
  isEmbed: boolean;
  tariffLabel: string;
};

const ClientContext = createContext<ClientContextValue | null>(null);

export function ClientProvider({ children }: { children: ReactNode }) {
  const { pricingTierCode, categoryId, isEmbed } = useEmbedContext();
  useEmbedResize(isEmbed);

  const value = useMemo<ClientContextValue>(
    () => ({
      pricingTierCode,
      categoryId,
      isEmbed,
      tariffLabel: getPricingTierLabel(pricingTierCode),
    }),
    [pricingTierCode, categoryId, isEmbed],
  );

  return (
    <ClientContext.Provider value={value}>{children}</ClientContext.Provider>
  );
}

/** Contexte client global — lecture seule (tarif Oxatis / embed). */
export function useClientContext(): ClientContextValue {
  const ctx = useContext(ClientContext);
  if (!ctx) {
    throw new Error("useClientContext doit être utilisé sous <ClientProvider>");
  }
  return ctx;
}
