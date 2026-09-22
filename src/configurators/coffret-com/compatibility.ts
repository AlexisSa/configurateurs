import {
  getGamme,
  getOption,
  getOptionGroup,
  listGammeGroupIds,
  listOptionsForGroup,
  listRules,
  type CatalogOption,
  type GammeAttributes,
} from "./catalog";
import {
  isConfigurationComplete,
  type ConfigState,
} from "./configState";

export type CompatibilityResult = {
  visibleGroupIds: string[];
  optionAvailability: Record<string, boolean>;
  optionsByGroup: Record<string, CatalogOption[]>;
};

function attributeMatches(
  attributes: GammeAttributes,
  ruleIf: { attribute: keyof GammeAttributes; eq?: string; neq?: string },
): boolean {
  const value = String(attributes[ruleIf.attribute] ?? "");
  if (ruleIf.eq != null) return value === ruleIf.eq;
  if (ruleIf.neq != null) return value !== ruleIf.neq;
  return false;
}

function collectHiddenGroupIds(state: ConfigState): Set<string> {
  const hidden = new Set<string>();
  const gamme = getGamme(state.gammeId);
  if (!gamme) return hidden;

  for (const rule of listRules()) {
    if (!attributeMatches(gamme.attributes, rule.if)) continue;
    for (const groupId of rule.hideGroups) hidden.add(groupId);
  }

  return hidden;
}

function collectExcludedOptionIds(
  state: ConfigState,
  ignoreGroupId?: string,
): Set<string> {
  const excluded = new Set<string>();
  for (const [groupId, optionId] of Object.entries(state.options)) {
    // Ne pas masquer les alternatives du même groupe (ex. DTIO-2 / DTIO-4)
    if (ignoreGroupId && groupId === ignoreGroupId) continue;
    const option = getOption(optionId);
    for (const id of option?.rules?.excludeOptions ?? []) {
      excluded.add(id);
    }
  }
  return excluded;
}

function optionMatchesGamme(
  option: CatalogOption,
  gammeId: string,
  attributes: GammeAttributes,
): boolean {
  const rules = option.rules;
  if (rules?.incompatibleGammes?.includes(gammeId)) return false;
  if (
    rules?.compatibleGammes &&
    rules.compatibleGammes.length > 0 &&
    !rules.compatibleGammes.includes(gammeId)
  ) {
    return false;
  }
  if (rules?.requireAttribute) {
    for (const [key, expected] of Object.entries(rules.requireAttribute)) {
      if (String(attributes[key as keyof GammeAttributes]) !== expected) {
        return false;
      }
    }
  }
  return true;
}

export function getVisibleOptionGroups(state: ConfigState): string[] {
  const gamme = getGamme(state.gammeId);
  if (!gamme) return [];

  const hidden = collectHiddenGroupIds(state);
  return listGammeGroupIds(gamme).filter((groupId) => {
    if (hidden.has(groupId)) return false;
    return Boolean(getOptionGroup(groupId));
  });
}

export function evaluateCompatibility(
  state: ConfigState,
): CompatibilityResult {
  const gamme = getGamme(state.gammeId);
  const visibleGroupIds = getVisibleOptionGroups(state);
  const optionAvailability: Record<string, boolean> = {};
  const optionsByGroup: Record<string, CatalogOption[]> = {};

  for (const groupId of visibleGroupIds) {
    const candidates = listOptionsForGroup(groupId).filter((option) =>
      gamme
        ? optionMatchesGamme(option, state.gammeId, gamme.attributes)
        : false,
    );

    // Exclusions hors groupe courant uniquement (sinon DTIO/TV se masquent entre eux)
    const excluded = collectExcludedOptionIds(state, groupId);
    const available: CatalogOption[] = [];
    for (const option of candidates) {
      const ok = !excluded.has(option.id);
      optionAvailability[option.id] = ok;
      if (ok) available.push(option);
    }
    optionsByGroup[groupId] = available;
  }

  return { visibleGroupIds, optionAvailability, optionsByGroup };
}

/** Nettoie options hors groupes visibles / incompatibles (changement de gamme…). */
export function sanitizeOptions(state: ConfigState): ConfigState {
  const { visibleGroupIds, optionsByGroup } = evaluateCompatibility(state);
  const cleaned: Record<string, string> = {};

  for (const groupId of visibleGroupIds) {
    const current = state.options[groupId];
    if (current == null || current === "") continue;
    const group = getOptionGroup(groupId);
    if (group?.type === "quantity") {
      cleaned[groupId] = current;
      continue;
    }
    if ((optionsByGroup[groupId] ?? []).some((o) => o.id === current)) {
      cleaned[groupId] = current;
    }
  }

  // Défaut brassage si groupe visible et vide
  if (
    visibleGroupIds.includes("brassage") &&
    !cleaned.brassage &&
    (optionsByGroup.brassage ?? []).some((o) => o.id === "brassage-interieur")
  ) {
    cleaned.brassage = "brassage-interieur";
  }

  // Legacy keys
  const legacy = { ...state.options };
  delete legacy.dti;
  delete legacy.terre;

  return { ...state, options: cleaned };
}

export { isConfigurationComplete };
