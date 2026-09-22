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
  clientTariffCode: PricingTierCode;
  /** Libellé grille (ex. « Tarif public ») — sinon le code S–Z */
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
