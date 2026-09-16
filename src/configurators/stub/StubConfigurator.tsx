"use client";

import { useEffect, useMemo, useState } from "react";
import { useClientContext } from "@/core/client-context/ClientProvider";
import { Button, Card, Heading, Text } from "@/core/design-system";
import { getUnitPriceHT } from "@/core/pricing/pricing";
import { getStockStatus } from "@/core/stock/getStockStatus";
import type { ConfigPayload, StockStatus } from "@/core/payload/types";
import { buildStubPayload, DEMO_SKU, type StubState } from "./buildPayload";

const STOCK_LABEL: Record<StockStatus, string> = {
  ok: "En stock",
  partial: "Stock partiel ou insuffisant",
  unknown: "Disponibilité à confirmer",
};

/**
 * Configurateur stub isolé — UI orientée client (pas de jargon technique).
 */
export function StubConfigurator() {
  const { pricingTierCode } = useClientContext();
  const [state, setState] = useState<StubState>({
    label: "Module démo",
    quantity: 1,
    widthMm: 600,
  });
  const [summary, setSummary] = useState<ConfigPayload | null>(null);
  const [stockHint, setStockHint] = useState<StockStatus>("unknown");

  const unitPrice = useMemo(
    () => getUnitPriceHT(DEMO_SKU, pricingTierCode),
    [pricingTierCode],
  );

  useEffect(() => {
    let cancelled = false;
    getStockStatus([DEMO_SKU]).then((status) => {
      if (!cancelled) setStockHint(status);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleValidate() {
    const stockStatus = await getStockStatus([DEMO_SKU]);
    setStockHint(stockStatus);
    setSummary(
      buildStubPayload({
        state,
        pricingTierCode,
        stockStatus,
      }),
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Text muted>
          Prix unitaire HT :{" "}
          {unitPrice == null ? "—" : `${unitPrice.toFixed(2)} €`}.
        </Text>
      </div>

      <Card className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Désignation</span>
          <input
            className="rounded-md border border-zinc-300 px-3 py-2"
            value={state.label}
            onChange={(e) => setState((s) => ({ ...s, label: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Quantité</span>
          <input
            type="number"
            min={1}
            className="rounded-md border border-zinc-300 px-3 py-2"
            value={state.quantity}
            onChange={(e) =>
              setState((s) => ({ ...s, quantity: Number(e.target.value) }))
            }
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Largeur (mm)</span>
          <input
            type="number"
            min={1}
            className="rounded-md border border-zinc-300 px-3 py-2"
            value={state.widthMm}
            onChange={(e) =>
              setState((s) => ({ ...s, widthMm: Number(e.target.value) }))
            }
          />
        </label>
        <Text muted className="text-sm">
          {STOCK_LABEL[stockHint]}
        </Text>
        <Button onClick={handleValidate}>Valider ma configuration</Button>
      </Card>

      {summary && (
        <Card>
          <Heading level={3}>Récapitulatif</Heading>
          <ul className="mt-3 space-y-1 text-sm text-zinc-700">
            {summary.nomenclature.map((line) => (
              <li key={line.ref}>
                {line.qty} × {line.label}
              </li>
            ))}
          </ul>
          <Text className="mt-3 font-medium">
            Total HT : {summary.pricing.total.toFixed(2)} €
          </Text>
          <Text muted className="mt-1 text-sm">
            {STOCK_LABEL[summary.stockStatus]}
          </Text>
        </Card>
      )}
    </div>
  );
}
