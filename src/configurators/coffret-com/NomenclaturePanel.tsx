"use client";

import { useState } from "react";
import { HelpCircle, RotateCcw } from "lucide-react";
import {
  Button,
  Card,
  Heading,
  Text,
} from "@/core/design-system";
import { REF_TOKEN_LEGEND } from "./applyLogicalRef";
import { CoffretQuantityCard } from "./CoffretQuantityCard";
import type { PricedBomLine } from "./useCoffretConfiguration";
import { catalog } from "./catalog";

type NomenclaturePanelProps = {
  hasGamme: boolean;
  ready: boolean;
  pricedBom: PricedBomLine[];
  unitTotal: number;
  orderTotal: number;
  coffretCount: number;
  onCoffretCountChange: (count: number) => void;
  configRef: string | null;
  pricesLoading?: boolean;
  missingSkus: string[];
  onReset: () => void;
  onExportPdf: () => void | Promise<void>;
  onApplyRef: (ref: string) => string | null;
};

/**
 * Sidebar nomenclature — HT / TTC, réf., reset, PDF, charger une référence.
 */
export function NomenclaturePanel({
  hasGamme,
  ready,
  pricedBom,
  unitTotal,
  orderTotal,
  coffretCount,
  onCoffretCountChange,
  configRef,
  pricesLoading,
  missingSkus,
  onReset,
  onExportPdf,
  onApplyRef,
}: NomenclaturePanelProps) {
  const [refInput, setRefInput] = useState("");
  const [refError, setRefError] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const tvaRate = catalog.meta.tvaRate ?? 0.2;
  const totalTtc = orderTotal * (1 + tvaRate);

  function handleApply() {
    const err = onApplyRef(refInput);
    setRefError(err);
  }

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-4">
      {/* Desktop : quantité collée à la nomenclature (masquée sur mobile) */}
      {hasGamme && (
        <CoffretQuantityCard
          className="hidden lg:flex"
          count={coffretCount}
          onChange={onCoffretCountChange}
        />
      )}

      <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading level={2}>Nomenclature</Heading>
        {hasGamme && (
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Réinitialiser
          </button>
        )}
      </div>

      {confirmReset && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <Text className="text-amber-950">
            Effacer tous les choix et recommencer ?
          </Text>
          <div className="mt-2 flex gap-2">
            <Button
              variant="secondary"
              className="!px-2 !py-1 text-xs"
              onClick={() => setConfirmReset(false)}
            >
              Annuler
            </Button>
            <Button
              className="!px-2 !py-1 text-xs"
              onClick={() => {
                onReset();
                setConfirmReset(false);
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      )}

      {!hasGamme || pricedBom.length === 0 ? (
        <Text muted className="text-sm">
          Choisissez une gamme ou chargez une référence ci-dessous.
        </Text>
      ) : (
        <>
          {configRef && (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <Text className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Référence configurée
                </Text>
                <button
                  type="button"
                  className="text-zinc-500 hover:text-zinc-800"
                  aria-label="Légende de la référence"
                  onClick={() => setLegendOpen((v) => !v)}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </div>
              <Text className="mt-0.5 font-mono text-sm text-zinc-900">
                {configRef}
              </Text>
              {legendOpen && (
                <ul className="mt-2 space-y-0.5 text-xs text-zinc-600">
                  {REF_TOKEN_LEGEND.map((entry) => (
                    <li key={entry.token}>
                      <span className="font-mono font-medium">{entry.token}</span>
                      {" — "}
                      {entry.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {pricesLoading && (
            <Text muted className="text-sm">
              Chargement des prix…
            </Text>
          )}

          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200">
            {pricedBom.map((line) => (
              <li
                key={`${line.type}:${line.sku}`}
                className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-zinc-900">
                    {line.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {line.sku} · ×{line.quantity}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-zinc-800">
                  {line.lineTotalHT == null
                    ? "—"
                    : `${line.lineTotalHT.toFixed(2)} €`}
                </span>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-1 border-t border-zinc-200 pt-3 text-sm">
            <div className="flex justify-between gap-3">
              <Text className="text-zinc-600">Prix unitaire HT</Text>
              <span className="tabular-nums">{unitTotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between gap-3">
              <Text className="font-medium">
                Total HT
                {coffretCount > 1 ? ` (${coffretCount}×)` : ""}
              </Text>
              <span className="font-semibold tabular-nums">
                {orderTotal.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <Text className="text-zinc-600">
                TTC · TVA {Math.round(tvaRate * 100)} %
              </Text>
              <span className="text-base font-semibold tabular-nums text-zinc-900">
                {totalTtc.toFixed(2)} €
              </span>
            </div>
          </div>

          {missingSkus.length > 0 && (
            <Text className="text-sm text-amber-800">
              Prix manquants : {missingSkus.join(", ")}
            </Text>
          )}

          {!ready && (
            <Text muted className="text-sm">
              Ajoutez au moins une option pour exporter le devis PDF.
            </Text>
          )}

          <Button onClick={onExportPdf} disabled={!ready}>
            Voir le PDF
          </Button>

          <Text muted className="text-xs">
            Devis pour {coffretCount} coffret{coffretCount > 1 ? "s" : ""}.
          </Text>
        </>
      )}

      <div className="border-t border-zinc-200 pt-3">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-zinc-800">
            Charger une référence
          </span>
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm"
              placeholder="XHG3M-4RJ-DTI-4TV"
              value={refInput}
              onChange={(e) => {
                setRefInput(e.target.value);
                setRefError(null);
              }}
            />
            <Button
              variant="secondary"
              disabled={!refInput.trim()}
              onClick={handleApply}
            >
              Appliquer
            </Button>
          </div>
        </label>
        {refError && (
          <Text className="mt-1 text-sm text-red-700">{refError}</Text>
        )}
      </div>
    </Card>
    </div>
  );
}
