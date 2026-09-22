import { getComponent, type CatalogComponent } from "./catalog";
import type { BomLine } from "./bomBuilder";

const LOT_SIZE = 24;

/**
 * Embases RJ45 : lots de 24 puis unitaires (total pièces = qty).
 */
export function buildEmbaseRj45Lines(qty: number): BomLine[] {
  const n = Math.max(0, Math.floor(qty) || 0);
  if (n === 0) return [];

  const component = getComponent("embaseRj45") as CatalogComponent | undefined;
  if (!component?.sku) return [];

  const lots = Math.floor(n / LOT_SIZE);
  const rest = n % LOT_SIZE;
  const lines: BomLine[] = [];

  if (lots > 0 && component.skuLot24) {
    lines.push({
      sku: component.skuLot24,
      label: `${component.label} (lot 24)`,
      quantity: lots,
      type: "option",
    });
  } else if (lots > 0) {
    lines.push({
      sku: component.sku,
      label: component.label,
      quantity: lots * LOT_SIZE,
      type: "option",
    });
  }

  if (rest > 0) {
    lines.push({
      sku: component.sku,
      label: component.label,
      quantity: rest,
      type: "option",
    });
  }

  return lines;
}

export function getRj45Quantity(stateOptions: Record<string, string>): number {
  const raw = stateOptions.rj45;
  if (raw == null || raw === "") return 0;
  // Legacy : rj45-4 → 4
  const legacy = /^rj45-(\d+)$/i.exec(raw);
  if (legacy) return Number(legacy[1]);
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}
