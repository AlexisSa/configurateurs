import { OXATIS_ORIGIN } from "@/core/cart/messages";

/**
 * URL stable de la fiche produit Oxatis (ItmID).
 * @see docs/AJOUT-PANIER-OXATIS.md
 */
export function buildOxatisProductUrl(oxatisId: number): string {
  const id = Math.floor(oxatisId);
  return `${OXATIS_ORIGIN}/PBSCProduct.asp?PGFLngID=0&ItmID=${id}`;
}
