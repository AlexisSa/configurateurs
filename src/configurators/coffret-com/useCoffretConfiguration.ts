"use client";

import { useEffect, useMemo, useState } from "react";
import type { PricingTierCode } from "@/core/pricing/pricingTiers";
import {
  fetchSkuPriceEntries,
  pickSkuTierPrice,
  sumSkuLinePricesHT,
  type SkuPriceEntry,
} from "@/core/pricing/fetchSkuPrices";
import {
  getGamme,
  getOptionGroup,
  listGammes,
  listSegments,
  catalog,
} from "./catalog";
import { buildBom, type BomLine } from "./bomBuilder";
import {
  evaluateCompatibility,
  sanitizeOptions,
  type CompatibilityResult,
} from "./compatibility";
import { isConfigurationReady } from "./configurationReadiness";
import {
  clampCoffretCount,
  createDefaultConfigState,
  isConfigurationComplete,
  type ConfigState,
} from "./configState";
import { buildLogicalRef, isDefaultOptionValue } from "./logicalRef";
import { configDraftFromLogicalRef } from "./applyLogicalRef";
import { fetchProductImagesBySkus } from "./fetchProductImages";

export type PricedBomLine = BomLine & {
  unitPriceHT: number | null;
  lineTotalHT: number | null;
};

/**
 * État de configuration coffret + dérivés (compat, BOM, prix DB, réf. logique).
 */
export function useCoffretConfiguration(pricingTierCode: PricingTierCode) {
  const segments = useMemo(() => listSegments(), []);
  const gammes = useMemo(() => listGammes(), []);
  const [state, setState] = useState<ConfigState>(() =>
    createDefaultConfigState(),
  );

  const compatibility: CompatibilityResult = useMemo(
    () => evaluateCompatibility(state),
    [state],
  );

  const complete = useMemo(() => isConfigurationComplete(state), [state]);
  const ready = useMemo(() => isConfigurationReady(state), [state]);

  const bom = useMemo(() => buildBom(state), [state]);

  const [priceEntries, setPriceEntries] = useState<
    Map<string, SkuPriceEntry>
  >(() => new Map());
  const [pricesStatus, setPricesStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  const bomSkusKey = bom.map((l) => l.sku).join("|");

  useEffect(() => {
    if (bom.length === 0) {
      setPriceEntries(new Map());
      setPricesStatus("idle");
      return;
    }
    let cancelled = false;
    setPricesStatus("loading");
    fetchSkuPriceEntries(bom.map((l) => l.sku)).then((map) => {
      if (cancelled) return;
      setPriceEntries(map);
      setPricesStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [bomSkusKey]); // eslint-disable-line react-hooks/exhaustive-deps -- clé SKU

  const pricedBom: PricedBomLine[] = useMemo(() => {
    return bom.map((line) => {
      const unitPriceHT = pickSkuTierPrice(
        priceEntries,
        line.sku,
        pricingTierCode,
      );
      return {
        ...line,
        unitPriceHT,
        lineTotalHT:
          unitPriceHT == null ? null : unitPriceHT * line.quantity,
      };
    });
  }, [bom, priceEntries, pricingTierCode]);

  const unitPricing = useMemo(() => {
    if (bom.length === 0) return { total: 0, missingSkus: [] as string[] };
    return sumSkuLinePricesHT(
      bom.map((line) => ({ sku: line.sku, qty: line.quantity })),
      priceEntries,
      pricingTierCode,
    );
  }, [bom, priceEntries, pricingTierCode]);

  const orderTotal = unitPricing.total * state.coffretCount;

  const configRef = useMemo(() => buildLogicalRef(state), [state]);

  const [imageBySku, setImageBySku] = useState<Map<string, string>>(
    () => new Map(),
  );

  useEffect(() => {
    const skus = new Set<string>();
    for (const gamme of listGammes()) {
      if (gamme.imageSku) skus.add(gamme.imageSku);
    }
    for (const option of catalog.options) {
      if (option.sku) skus.add(option.sku);
    }
    for (const component of Object.values(catalog.components)) {
      if (component.sku) skus.add(component.sku);
    }
    let cancelled = false;
    fetchProductImagesBySkus([...skus]).then((map) => {
      if (!cancelled) setImageBySku(map);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function setGammeId(gammeId: string) {
    const gamme = getGamme(gammeId);
    setState((prev) =>
      sanitizeOptions({
        ...createDefaultConfigState(gamme),
        coffretCount: clampCoffretCount(prev.coffretCount),
      }),
    );
  }

  function setMateriau(materiau: string) {
    setState((prev) => sanitizeOptions({ ...prev, materiau }));
  }

  function setCoffretCount(count: number) {
    setState((prev) => ({
      ...prev,
      coffretCount: clampCoffretCount(count),
    }));
  }

  function setOptionValue(groupId: string, value: string) {
    setState((prev) => {
      const group = getOptionGroup(groupId);
      let nextValue = value;
      if (group?.type === "quantity") {
        const n = Math.max(0, Math.floor(Number(value)) || 0);
        const maxRj =
          groupId === "rj45"
            ? (getGamme(prev.gammeId)?.attributes.maxRj45 ?? n)
            : (group.max ?? n);
        nextValue = String(Math.min(n, maxRj));
      }
      return sanitizeOptions({
        ...prev,
        options: { ...prev.options, [groupId]: nextValue },
      });
    });
  }

  function resetConfiguration() {
    setState(createDefaultConfigState());
  }

  function applyLogicalRef(ref: string): string | null {
    const result = configDraftFromLogicalRef(ref);
    if (result.error || !result.draft) return result.error ?? "Référence invalide.";
    setState(result.draft);
    return null;
  }

  function isGroupConfigured(groupId: string): boolean {
    const raw = state.options[groupId];
    if (raw == null || raw === "") return false;
    return true;
  }

  return {
    segments,
    gammes,
    state,
    compatibility,
    complete,
    ready,
    bom,
    pricedBom,
    unitPricing,
    orderTotal,
    configRef,
    priceEntries,
    pricesStatus,
    imageBySku,
    setGammeId,
    setMateriau,
    setCoffretCount,
    setOptionValue,
    resetConfiguration,
    applyLogicalRef,
    isGroupConfigured,
    isDefaultOptionValue: (groupId: string) =>
      isDefaultOptionValue(groupId, state.options[groupId] ?? ""),
  };
}
