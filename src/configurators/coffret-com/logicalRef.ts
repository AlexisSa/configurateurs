import { getGamme, getOption, type CatalogGamme } from "./catalog";
import { getChassisSkuSuffix } from "./gammeSku";
import { getRj45Quantity } from "./rj45";
import type { ConfigState } from "./configState";

/**
 * Référence logique :
 * XHG3{Gamme}[-{n}RJ][-P][-E][-SD|DTI][-DTIO2|DTIO4][-{p}PC][-{k}TV][-{c}CRJ{b}CB]
 */
export function buildLogicalRef(state: ConfigState): string | null {
  const gamme = getGamme(state.gammeId);
  if (!gamme || !state.materiau) return null;

  const code = gamme.baseSku.replace(/^XHG3/, "");
  const parts: string[] = [`XHG3${code}`];

  const rj = getRj45Quantity(state.options);
  if (rj > 0) parts.push(`${rj}RJ`);

  if (imageSkuHasPToken(gamme)) parts.push("P");

  if (getChassisSkuSuffix(state) === "-E") parts.push("E");

  const dtiRj45 = state.options.dti_rj45;
  if (dtiRj45 === "dti-rj45-4precable") {
    parts.push("DTI");
  } else {
    parts.push("SD");
  }

  const fibre = state.options.dti_fibre;
  if (fibre === "dti-fibre-2") parts.push("DTIO2");
  if (fibre === "dti-fibre-4") parts.push("DTIO4");

  const pc = resolvePriseCount(gamme, state);
  if (pc > 0) parts.push(`${pc}PC`);

  const tv = resolveTvCount(state);
  if (tv > 0) parts.push(`${tv}TV`);

  const cordonRj = getQuantity(state.options.cordon_rj45);
  const cordonBalun =
    state.options.cordon_balun === "cordon-balun-rj45-f" ? 1 : 0;
  if (cordonRj > 0 || cordonBalun > 0) {
    parts.push(`${cordonRj}CRJ${cordonBalun}CB`);
  }

  return parts.join("-");
}

function imageSkuHasPToken(gamme: CatalogGamme): boolean {
  const image = gamme.imageSku ?? "";
  // Token P seulement si imageSku se termine par P (après le bloc RJ/TV…)
  return /P$/i.test(image) && /-\d+RJ/i.test(image);
}

function resolvePriseCount(gamme: CatalogGamme, state: ConfigState): number {
  if (gamme.attributes.priseMode === "included") {
    return gamme.attributes.priseCount ?? 0;
  }
  if (gamme.attributes.priseMode === "option") {
    return getQuantity(state.options.prise);
  }
  return 0;
}

function resolveTvCount(state: ConfigState): number {
  const id = state.options.tv;
  if (!id || id === "tv-none") return 0;
  const match = /^tv-(\d+)$/.exec(id);
  return match ? Number(match[1]) : 0;
}

function getQuantity(raw: string | undefined): number {
  if (raw == null || raw === "") return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Option sélectionnée « non défaut » pour readiness. */
export function isDefaultOptionValue(
  groupId: string,
  value: string,
): boolean {
  if (!value) return true;
  const option = getOption(value);
  if (option?.isNone) return true;
  if (option?.id === "brassage-interieur") return true;
  if (groupId === "rj45" || groupId === "cordon_rj45" || groupId === "prise") {
    return getQuantity(value) === 0;
  }
  return false;
}
