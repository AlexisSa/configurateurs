"use client";

import { Minus, Plus } from "lucide-react";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  id?: string;
  className?: string;
  size?: "sm" | "md";
};

/**
 * Sélecteur de quantité avec boutons − / +.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  id,
  className = "",
  size = "md",
}: QuantityStepperProps) {
  const safe = clamp(Math.floor(Number(value) || min), min, max);
  const canDec = safe > min;
  const canInc = max == null || safe < max;

  const btn =
    size === "sm"
      ? "h-8 w-8 text-sm"
      : "h-10 w-10 text-base";
  const input =
    size === "sm"
      ? "h-8 w-12 text-sm"
      : "h-10 w-14 text-base";

  return (
    <div
      className={`inline-flex w-fit shrink-0 items-stretch overflow-hidden rounded-md border border-zinc-300 bg-white ${className}`}
    >
      <button
        type="button"
        aria-label="Diminuer la quantité"
        disabled={!canDec}
        className={`${btn} flex shrink-0 items-center justify-center border-0 bg-transparent text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40`}
        onClick={() => onChange(clamp(safe - 1, min, max))}
      >
        <Minus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </button>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        inputMode="numeric"
        aria-label="Quantité"
        className={`${input} shrink-0 border-0 border-x border-zinc-300 bg-white text-center tabular-nums text-zinc-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        value={safe}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isFinite(next)) return;
          onChange(clamp(Math.floor(next), min, max));
        }}
        onBlur={() => onChange(clamp(safe, min, max))}
      />
      <button
        type="button"
        aria-label="Augmenter la quantité"
        disabled={!canInc}
        className={`${btn} flex shrink-0 items-center justify-center border-0 bg-transparent text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40`}
        onClick={() => onChange(clamp(safe + 1, min, max))}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

function clamp(value: number, min: number, max?: number): number {
  const lower = Math.max(min, value);
  return max == null ? lower : Math.min(max, lower);
}
