"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Heading, Text } from "@/core/design-system";
import type { CatalogGamme, GammeSegment } from "./catalog";
import {
  formatGammeDimensions,
  getGammeSelectorSubtitle,
} from "./gammeDisplay";
import { ProductThumb } from "./ProductThumb";

type GammeStepProps = {
  segments: GammeSegment[];
  gammes: CatalogGamme[];
  selectedId: string;
  imageBySku: Map<string, string>;
  onSelect: (gammeId: string) => void;
};

/**
 * Étape gamme : familles (segments) + cartes produit — aligné référence Vite, style hub.
 */
export function GammeStep({
  segments,
  gammes,
  selectedId,
  imageBySku,
  onSelect,
}: GammeStepProps) {
  const segmentForSelected = useMemo(() => {
    if (!selectedId) return segments[0]?.id ?? "";
    return (
      segments.find((s) => s.items.includes(selectedId))?.id ??
      segments[0]?.id ??
      ""
    );
  }, [segments, selectedId]);

  const [activeSegmentId, setActiveSegmentId] = useState(segmentForSelected);

  useEffect(() => {
    if (segmentForSelected) setActiveSegmentId(segmentForSelected);
  }, [segmentForSelected]);

  const activeSegment = segments.find((s) => s.id === activeSegmentId);
  const segmentGammes = useMemo(
    () =>
      (activeSegment?.items ?? [])
        .map((id) => gammes.find((g) => g.id === id))
        .filter((g): g is CatalogGamme => Boolean(g)),
    [activeSegment, gammes],
  );

  return (
    <Card className="flex flex-col gap-4">
      <div>
        <Heading level={2}>Gamme</Heading>
        <Text muted className="mt-1 text-sm">
          Sélectionnez une famille à gauche, puis choisissez le coffret adapté.
        </Text>
      </div>

      <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
        <nav
          aria-label="Familles de coffrets"
          className="flex flex-row gap-2 overflow-x-auto md:flex-col md:overflow-visible"
        >
          {segments.map((segment) => {
            const count = segment.items.filter((id) =>
              gammes.some((g) => g.id === id),
            ).length;
            const active = segment.id === activeSegmentId;
            return (
              <button
                key={segment.id}
                type="button"
                onClick={() => setActiveSegmentId(segment.id)}
                aria-current={active ? "true" : undefined}
                className={`flex shrink-0 items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition md:w-full ${
                  active
                    ? "border-brand bg-brand-muted text-brand"
                    : "border-zinc-200 bg-white text-zinc-800 hover:border-brand/30"
                }`}
              >
                <span className="leading-snug">{segment.label}</span>
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    active ? "bg-brand text-white" : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="min-w-0">
          {activeSegment && (
            <Heading level={3} className="mb-3 text-base">
              {activeSegment.label}
            </Heading>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {segmentGammes.map((gamme) => {
              const selected = gamme.id === selectedId;
              const subtitle = getGammeSelectorSubtitle(gamme);
              const imageUrl = gamme.imageSku
                ? imageBySku.get(gamme.imageSku)
                : undefined;
              return (
                <button
                  key={gamme.id}
                  type="button"
                  onClick={() => onSelect(gamme.id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-3 rounded-md border px-3 py-3 text-left transition ${
                    selected
                      ? "border-brand bg-brand text-white"
                      : "border-zinc-200 bg-white hover:border-brand/40 hover:bg-brand-muted/40"
                  }`}
                >
                  <ProductThumb
                    src={imageUrl}
                    alt={gamme.label}
                    selected={selected}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">
                      {gamme.label}
                      {subtitle ? (
                        <span
                          className={
                            selected ? "text-white/85" : "text-zinc-500"
                          }
                        >
                          {" "}
                          {subtitle}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`mt-1 block text-xs ${
                        selected ? "text-white/75" : "text-zinc-500"
                      }`}
                    >
                      {formatGammeDimensions(gamme)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
