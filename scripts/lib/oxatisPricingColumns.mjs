/**
 * Mapping colonnes CSV Oxatis « All products » → codes tarif app S–Z.
 * Tarif 1 (Price1) non utilisé : le public client = Tarif 2 = S.
 */
export const OXATIS_PRICE_COLUMNS = {
  S: "Price2VATExcluded",
  M: "Price3VATExcluded",
  B: "Price4VATExcluded",
  A: "Price5VATExcluded",
  Z: "Price6VATExcluded",
};

/** Alias SKU configurateur → référence export Oxatis. */
export const OXATIS_SKU_ALIASES = {
  // Exemple : "DEMO-SKU": "DEMO-SKU-OX",
};
