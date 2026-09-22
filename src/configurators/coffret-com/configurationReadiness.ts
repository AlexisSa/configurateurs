import { getOption, getOptionGroup } from "./catalog";
import { isConfigurationComplete, type ConfigState } from "./configState";
import { isDefaultOptionValue } from "./logicalRef";
import { evaluateCompatibility } from "./compatibility";

/**
 * UI prête (PDF / devis / share) si config complète + au moins une option non-défaut.
 */
export function isConfigurationReady(state: ConfigState): boolean {
  if (!isConfigurationComplete(state)) return false;

  const { visibleGroupIds } = evaluateCompatibility(state);
  for (const groupId of visibleGroupIds) {
    const group = getOptionGroup(groupId);
    const raw = state.options[groupId];
    if (raw == null || raw === "") continue;
    if (!isDefaultOptionValue(groupId, raw)) return true;

    // Groupe obligatoire non-optionnel : brassage intérieur seul ne suffit pas
    if (group && group.optional === false) {
      const option = getOption(raw);
      if (option && !option.isNone && option.id !== "brassage-interieur") {
        return true;
      }
    }
  }

  return false;
}
