import type { PricingTierCode } from "@/core/pricing/pricingTiers";

/**
 * Document PDF générique — contrat partagé entre configurateurs.
 * Chaque module mappe son état métier vers ce shape, sans connaître jsPDF.
 */
export type PdfQuoteLine = {
  ref: string;
  label: string;
  qty: number;
  unitPriceHT: number | null;
  lineTotalHT: number | null;
  /** URL image produit (chargée côté PDF avant rendu). */
  imageUrl?: string | null;
};

export type PdfQuoteMeta = {
  label: string;
  value: string;
};

export type PdfQuoteDocument = {
  /** Titre principal du PDF */
  title: string;
  /** Sous-titre (gamme, produit…) */
  subtitle?: string;
  /** Image principale (ex. coffret / produit sélectionné) */
  heroImageUrl?: string | null;
  /** Id registre, ex. coffret-com */
  configuratorId: string;
  /**
   * Code grille interne (calcul prix / nom fichier).
   * Ne jamais afficher ce code ni son libellé dans l’UI ou le PDF.
   */
  clientTariffCode: PricingTierCode;
  /**
   * @deprecated Ne plus renseigner : les libellés tarif ne doivent pas apparaître au client.
   */
  tariffLabel?: string;
  /** Lignes libres (réf. logique, client, date…) */
  meta?: PdfQuoteMeta[];
  lines: PdfQuoteLine[];
  totals: {
    currency: "EUR";
    /** Total HT affiché (déjà multiplié si besoin) */
    totalHT: number;
    /** Total TTC indicatif (optionnel) */
    totalTTC?: number;
    /** Taux TVA affiché, ex. 0.2 */
    vatRate?: number;
    /** Ligne d’aide sous le total (ex. « 3 × configuration ») */
    note?: string;
  };
  footerNote?: string;
  /** Date d’émission (sinon aujourd’hui) */
  issuedAt?: Date | string;
};
