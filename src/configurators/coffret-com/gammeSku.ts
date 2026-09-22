import { getGamme, getMateriau, getOption, type CatalogGamme } from "./catalog";
import type { ConfigState } from "./configState";

/** Suffixe châssis issu d’une option virtuelle (ex. brassage extérieur → -E). */
export function getChassisSkuSuffix(state: ConfigState): string {
  for (const optionId of Object.values(state.options)) {
    const option = getOption(optionId);
    const suffix = option?.rules?.chassisSkuSuffix;
    if (suffix) return suffix;
  }
  return "";
}

/**
 * SKU châssis = baseSku + materiau.skuSuffix + chassisSkuSuffix (brassage -E…).
 */
export function resolveChassisSku(state: ConfigState): string | null {
  const gamme = getGamme(state.gammeId);
  if (!gamme) return null;
  const materiau = getMateriau(state.gammeId, state.materiau);
  if (!materiau) return null;
  return `${gamme.baseSku}${materiau.skuSuffix ?? ""}${getChassisSkuSuffix(state)}`;
}

export function resolveChassisLabel(
  gamme: CatalogGamme,
  state: ConfigState,
): string {
  const suffix = getChassisSkuSuffix(state);
  if (suffix === "-E") {
    return `${gamme.label} — brassage extérieur`;
  }
  return gamme.label;
}
