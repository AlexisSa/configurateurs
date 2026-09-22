import { getGamme, listGammes } from "./catalog";
import {
  createDefaultConfigState,
  type ConfigState,
} from "./configState";
import { sanitizeOptions } from "./compatibility";

export type ParsedLogicalRef = {
  gamme: string;
  rj45: number;
  porte: boolean;
  brassageExt: boolean;
  sansDti: boolean;
  dtiRj45: boolean;
  dtiFibre: 2 | 4 | null;
  prises: number;
  tv: number;
  cordonsRj45: number;
  cordonsBalun: number;
  raw: string;
};

export const REF_TOKEN_LEGEND = [
  { token: "RJ", label: "Nombre d'embases RJ45" },
  { token: "P", label: "Porte (selon réf. fabricant)" },
  { token: "E", label: "Brassage extérieur" },
  { token: "SD", label: "Sans DTI RJ45" },
  { token: "DTI", label: "Avec DTI RJ45" },
  { token: "DTIO2", label: "DTI fibre, 2 prises" },
  { token: "DTIO4", label: "DTI fibre, 4 prises" },
  { token: "PC", label: "Prises 2P+T (ex. 3PC)" },
  { token: "TV", label: "Répartiteur TV (ex. 4TV)" },
  { token: "CRJ", label: "Cordons RJ45 (bloc collé avec CB)" },
  { token: "CB", label: "Cordons balun TV" },
] as const;

/**
 * Découpe une référence logique en caractéristiques.
 */
export function parseLogicalCoffretRef(ref: string): ParsedLogicalRef | null {
  const trimmed = ref?.trim();
  if (!trimmed?.startsWith("XHG3")) return null;

  const dashIdx = trimmed.indexOf("-");
  const base = dashIdx === -1 ? trimmed : trimmed.slice(0, dashIdx);
  const gamme = base.slice(4);
  if (!gamme) return null;

  const result: ParsedLogicalRef = {
    gamme,
    rj45: 0,
    porte: false,
    brassageExt: false,
    sansDti: false,
    dtiRj45: false,
    dtiFibre: null,
    prises: 0,
    tv: 0,
    cordonsRj45: 0,
    cordonsBalun: 0,
    raw: trimmed,
  };

  if (dashIdx === -1) return result;

  const tokens = trimmed.slice(dashIdx + 1).split("-");
  for (const token of tokens) {
    const rjMatch = /^(\d+)RJ$/.exec(token);
    if (rjMatch) {
      result.rj45 = Number(rjMatch[1]);
      continue;
    }
    if (token === "P") {
      result.porte = true;
      continue;
    }
    if (token === "E") {
      result.brassageExt = true;
      continue;
    }
    if (token === "SD") {
      result.sansDti = true;
      continue;
    }
    if (token === "DTI") {
      result.dtiRj45 = true;
      continue;
    }
    if (token === "DTIO2") {
      result.dtiFibre = 2;
      continue;
    }
    if (token === "DTIO4") {
      result.dtiFibre = 4;
      continue;
    }
    const pcMatch = /^(\d+)PC$/.exec(token);
    if (pcMatch) {
      result.prises = Number(pcMatch[1]);
      continue;
    }
    const tvMatch = /^(\d+)TV$/.exec(token);
    if (tvMatch) {
      result.tv = Number(tvMatch[1]);
      continue;
    }
    const cordMatch = /^(\d+)CRJ(\d+)CB$/.exec(token);
    if (cordMatch) {
      result.cordonsRj45 = Number(cordMatch[1]);
      result.cordonsBalun = Number(cordMatch[2]);
      continue;
    }
    return null;
  }

  return result;
}

function findGammeIdByRefCode(refGammeCode: string): string | null {
  const baseSku = `XHG3${refGammeCode}`;
  return listGammes().find((g) => g.baseSku === baseSku)?.id ?? null;
}

function buildOptionsFromParsedRef(
  parsed: ParsedLogicalRef,
  gammeId: string,
): Record<string, string> {
  const options: Record<string, string> = {
    ...createDefaultConfigState(getGamme(gammeId)).options,
  };
  const gamme = getGamme(gammeId);

  if (parsed.rj45 > 0) options.rj45 = String(parsed.rj45);

  if (parsed.brassageExt) {
    options.brassage = "brassage-exterieur";
  }

  if (parsed.dtiRj45) {
    options.dti_rj45 = "dti-rj45-4precable";
  } else {
    options.dti_rj45 = "dti_rj45-none";
  }

  if (parsed.dtiFibre === 2) options.dti_fibre = "dti-fibre-2";
  else if (parsed.dtiFibre === 4) options.dti_fibre = "dti-fibre-4";
  else options.dti_fibre = "dti_fibre-none";

  if (parsed.prises > 0 && gamme?.attributes.priseMode === "option") {
    options.prise = String(parsed.prises);
  }

  if (parsed.tv > 0) options.tv = `tv-${parsed.tv}`;
  else options.tv = "tv-none";

  if (parsed.cordonsRj45 > 0) {
    options.cordon_rj45 = String(parsed.cordonsRj45);
  }
  options.cordon_balun =
    parsed.cordonsBalun > 0
      ? "cordon-balun-rj45-f"
      : "cordon_balun-none";

  return options;
}

/**
 * Brouillon de configuration depuis une référence logique.
 */
export function configDraftFromLogicalRef(
  ref: string,
): { draft?: ConfigState; error?: string } {
  const parsed = parseLogicalCoffretRef(ref);
  if (!parsed) {
    return {
      error:
        "Référence non reconnue. Vérifiez le format (ex. XHG3M-4RJ-SD-4TV).",
    };
  }

  const gammeId = findGammeIdByRefCode(parsed.gamme);
  if (!gammeId) {
    return { error: `Gamme « ${parsed.gamme} » introuvable dans le catalogue.` };
  }

  const draft = sanitizeOptions({
    gammeId,
    materiau: getGamme(gammeId)?.materiaux[0]?.id ?? "grade3",
    coffretCount: 1,
    options: buildOptionsFromParsedRef(parsed, gammeId),
  });

  return { draft };
}
