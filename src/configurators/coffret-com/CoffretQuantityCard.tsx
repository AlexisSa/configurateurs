"use client";

import { Card, QuantityStepper, Text } from "@/core/design-system";

type CoffretQuantityCardProps = {
  count: number;
  onChange: (count: number) => void;
  /** Affiché seulement sous / au-dessus d’un breakpoint (tailwind). */
  className?: string;
};

/**
 * Nombre de coffrets (multiplie les totaux, pas les qty BOM unitaires).
 */
export function CoffretQuantityCard({
  count,
  onChange,
  className = "",
}: CoffretQuantityCardProps) {
  return (
    <Card className={`flex flex-col gap-2 ${className}`.trim()}>
      <label className="text-sm font-semibold text-zinc-900">
        Nombre de coffrets
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper
          value={count}
          min={1}
          max={1000}
          onChange={onChange}
        />
        <Text muted className="text-xs">
          de 1 à 1&nbsp;000
        </Text>
      </div>
    </Card>
  );
}
