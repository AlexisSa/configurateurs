import type { PdfQuoteDocument } from "@/core/pdf";
import {
  getPricingTierLabel,
  type PricingTierCode,
} from "@/core/pricing/pricingTiers";
import { catalog, getGamme } from "./catalog";
import type { ConfigState } from "./configState";
import type { PricedBomLine } from "./useCoffretConfiguration";

/** Adapte l’état coffret → document PDF partagé `@/core/pdf`. */
export function buildCoffretComPdfDocument(input: {
  state: ConfigState;
  pricedBom: PricedBomLine[];
  orderTotal: number;
  pricingTierCode: PricingTierCode;
  configRef: string | null;
  imageBySku: Map<string, string>;
}): PdfQuoteDocument {
  const {
    state,
    pricedBom,
    orderTotal,
    pricingTierCode,
    configRef,
    imageBySku,
  } = input;
  const gamme = getGamme(state.gammeId);
  const count = Math.max(1, state.coffretCount || 1);
  const vatRate = catalog.meta.tvaRate ?? 0.2;
  const totalTTC = orderTotal * (1 + vatRate);

  const heroImageUrl = gamme?.imageSku
    ? imageBySku.get(gamme.imageSku)
    : undefined;

  return {
    title: "Devis coffrets",
    subtitle: gamme
      ? `${gamme.label}${gamme.baseSku ? ` · ${gamme.baseSku}` : ""}`
      : undefined,
    heroImageUrl: heroImageUrl ?? null,
    configuratorId: "coffret-com",
    clientTariffCode: pricingTierCode,
    tariffLabel: getPricingTierLabel(pricingTierCode),
    meta: [
      ...(configRef
        ? [{ label: "Référence configurée", value: configRef }]
        : []),
      { label: "Quantité", value: `${count} coffret${count > 1 ? "s" : ""}` },
    ],
    lines: pricedBom.map((line) => ({
      ref: line.sku,
      label: line.label,
      qty: line.quantity * count,
      unitPriceHT: line.unitPriceHT,
      lineTotalHT:
        line.unitPriceHT == null
          ? null
          : line.unitPriceHT * line.quantity * count,
      imageUrl: resolveLineImageUrl(line, state, imageBySku),
    })),
    totals: {
      currency: "EUR",
      totalHT: orderTotal,
      totalTTC,
      vatRate,
      note:
        count > 1
          ? `Nomenclature unitaire × ${count}`
          : undefined,
    },
    footerNote:
      "Prix HT selon grille client. TTC indicatif (TVA). Document généré par le configurateur Xeilom — non contractuel.",
  };
}

function resolveLineImageUrl(
  line: PricedBomLine,
  state: ConfigState,
  imageBySku: Map<string, string>,
): string | undefined {
  const direct = imageBySku.get(line.sku);
  if (direct) return direct;

  // Châssis : image via imageSku de la gamme (ex. XHG3M → XHG3M-4RJ)
  if (line.type === "base") {
    const gamme = getGamme(state.gammeId);
    if (gamme?.imageSku) return imageBySku.get(gamme.imageSku);
  }

  return undefined;
}
