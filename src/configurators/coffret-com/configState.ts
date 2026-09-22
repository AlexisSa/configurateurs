import { getGamme, getMateriau, type CatalogGamme } from "./catalog";

export type ConfigState = {
  gammeId: string;
  materiau: string;
  /** 1…1000 — multiplie les totaux commande, pas les qty BOM. */
  coffretCount: number;
  /** single → optionId ; quantity → nombre (string). */
  options: Record<string, string>;
};

export function createDefaultConfigState(
  gamme?: CatalogGamme,
): ConfigState {
  const options: Record<string, string> = {};
  if (gamme?.specificOptionGroups.includes("brassage")) {
    options.brassage = "brassage-interieur";
  }

  return {
    gammeId: gamme?.id ?? "",
    materiau: gamme?.materiaux[0]?.id ?? "",
    coffretCount: 1,
    options,
  };
}

export function clampCoffretCount(count: number): number {
  return Math.max(1, Math.min(1000, Math.floor(count) || 1));
}

export function isMateriauValid(gammeId: string, materiauId: string): boolean {
  return Boolean(getMateriau(gammeId, materiauId));
}

/** BOM calculable dès gamme + matériau. */
export function isConfigurationComplete(state: ConfigState): boolean {
  if (!state.gammeId || !state.materiau) return false;
  const gamme = getGamme(state.gammeId);
  if (!gamme) return false;
  return isMateriauValid(state.gammeId, state.materiau);
}
