import type { CatalogGamme } from "./catalog";

/** Dimensions affichées comme sur le site (H × L). */
export function formatGammeDimensions(gamme: CatalogGamme): string {
  const { largeurMm, hauteurMm } = gamme.attributes;
  if (!largeurMm) return gamme.dimensions ?? "";

  if (gamme.id === "xh-p-300") {
    return `H : 250 à 300 mm × L : ${largeurMm} mm`;
  }
  if (hauteurMm) {
    return `H : ${hauteurMm} mm × L : ${largeurMm} mm`;
  }
  return gamme.dimensions ?? "";
}

export function getGammeSelectorSubtitle(gamme: CatalogGamme): string | null {
  if (gamme.attributes.porteMode === "included") return "avec porte";
  return null;
}
