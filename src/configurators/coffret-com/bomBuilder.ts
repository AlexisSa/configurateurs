import {
  getComponent,
  getGamme,
  getOption,
  getOptionGroup,
  hasIncludedItem,
} from "./catalog";
import {
  evaluateCompatibility,
} from "./compatibility";
import { isConfigurationComplete, type ConfigState } from "./configState";
import { resolveChassisLabel, resolveChassisSku } from "./gammeSku";
import { buildLogicalRef } from "./logicalRef";
import { buildEmbaseRj45Lines, getRj45Quantity } from "./rj45";

export type BomLineType = "base" | "option" | "materiau";

export type BomLine = {
  sku: string;
  label: string;
  quantity: number;
  type: BomLineType;
  configRef?: string;
};

/**
 * Nomenclature unitaire (coffretCount n’affecte pas les quantités).
 * Retourne [] si config incomplète.
 */
export function buildBom(state: ConfigState): BomLine[] {
  if (!isConfigurationComplete(state)) return [];

  const gamme = getGamme(state.gammeId);
  if (!gamme) return [];

  const chassisSku = resolveChassisSku(state);
  if (!chassisSku) return [];

  const configRef = buildLogicalRef(state) ?? undefined;
  const lines: BomLine[] = [];

  lines.push({
    sku: chassisSku,
    label: resolveChassisLabel(gamme, state),
    quantity: 1,
    type: "base",
    configRef,
  });

  // Bornier facturé seulement si pas inclus
  const bornier = getComponent("terreBornier");
  if (bornier?.sku && !hasIncludedItem(gamme, "terre-bornier")) {
    lines.push({
      sku: bornier.sku,
      label: bornier.label,
      quantity: 1,
      type: "option",
    });
  }

  const { visibleGroupIds } = evaluateCompatibility(state);

  // RJ45 (composant, lots 24)
  if (visibleGroupIds.includes("rj45")) {
    const max = gamme.attributes.maxRj45;
    const qty = Math.min(getRj45Quantity(state.options), max);
    lines.push(...buildEmbaseRj45Lines(qty));
  }

  // Prise quantity
  if (visibleGroupIds.includes("prise")) {
    appendQuantityOption(lines, state, "prise", "prise-2pt");
  }

  // Cordon RJ45 quantity
  if (visibleGroupIds.includes("cordon_rj45")) {
    appendQuantityOption(lines, state, "cordon_rj45", "cordon-rj45-050");
  }

  // Options single (non virtual, non none)
  for (const groupId of visibleGroupIds) {
    const group = getOptionGroup(groupId);
    if (!group || group.type !== "single") continue;
    const optionId = state.options[groupId];
    if (!optionId) continue;
    const option = getOption(optionId);
    if (!option || option.virtual || option.isNone || !option.sku) continue;
    lines.push({
      sku: option.sku,
      label: option.label,
      quantity: 1,
      type: "option",
    });
  }

  return mergeBomLines(lines);
}

function appendQuantityOption(
  lines: BomLine[],
  state: ConfigState,
  groupId: string,
  defaultOptionId: string,
): void {
  const raw = state.options[groupId];
  const qty = Math.max(0, Math.floor(Number(raw)) || 0);
  if (qty === 0) return;
  const option = getOption(defaultOptionId);
  if (!option?.sku) return;
  const group = getOptionGroup(groupId);
  const max = group?.max;
  const capped = max != null ? Math.min(qty, max) : qty;
  lines.push({
    sku: option.sku,
    label: option.label,
    quantity: capped,
    type: "option",
  });
}

function mergeBomLines(lines: BomLine[]): BomLine[] {
  const map = new Map<string, BomLine>();
  for (const line of lines) {
    const key = `${line.type}:${line.sku}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += line.quantity;
      if (!existing.configRef && line.configRef) {
        existing.configRef = line.configRef;
      }
    } else {
      map.set(key, { ...line });
    }
  }
  return Array.from(map.values());
}
