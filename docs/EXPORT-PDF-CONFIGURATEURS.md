# Export PDF des configurateurs

Module partagé : [`src/core/pdf/`](../src/core/pdf/) — utilisable par **tous** les configurateurs.

## Principe

```
Configurateur (coffret-com, cordon-rj45, …)
  → mappe son état vers PdfQuoteDocument
  → downloadQuotePdf(doc)   // ou buildQuotePdfBlob(doc)
```

Le core ne connaît **pas** le métier (BOM, filtres, facettes).  
Chaque module fournit uniquement un document normalisé.

## Template visuel

[`buildQuotePdf.ts`](../src/core/pdf/buildQuotePdf.ts) — A4 jsPDF, palette Xeilom (`#363bc7`) :

- bandeau marque **XEILOM** + titre / date
- encadré méta (réf. configurée, quantité…)
- tableau nomenclature (SKU pastille, désignation, qté, PU HT, total HT)
- encadré totaux HT + TTC optionnel
- pied de page + n° de page

## Contrat `PdfQuoteDocument`

| Champ | Rôle |
|-------|------|
| `title` | Titre du devis |
| `subtitle` | Optionnel (gamme, produit…) |
| `configuratorId` | Id registre (`coffret-com`, …) |
| `clientTariffCode` | Grille S\|M\|B\|A\|Z |
| `tariffLabel` | Libellé grille (ex. Tarif public) |
| `meta[]` | Paires label/valeur |
| `lines[]` | `ref`, `label`, `qty`, `unitPriceHT`, `lineTotalHT` |
| `totals.totalHT` | Total HT |
| `totals.totalTTC` / `vatRate` | Optionnel — encadré TTC |
| `totals.note` | Aide sous le total |
| `footerNote` | Mentions bas de page |
| `issuedAt` | Date d’émission (sinon aujourd’hui) |

Types : [`src/core/pdf/types.ts`](../src/core/pdf/types.ts).

## API

```ts
import {
  downloadQuotePdf,
  buildQuotePdfBlob,
  type PdfQuoteDocument,
} from "@/core/pdf";

const doc: PdfQuoteDocument = {
  title: "Devis coffrets",
  configuratorId: "coffret-com",
  clientTariffCode: "S",
  tariffLabel: "Tarif public",
  lines: [/* … */],
  totals: { currency: "EUR", totalHT: 123.45, totalTTC: 148.14, vatRate: 0.2 },
};

downloadQuotePdf(doc);
```

Changer de lib dans `buildQuotePdf.ts` **sans** toucher aux configurateurs, tant que le contrat est respecté.

## Checklist — brancher un nouveau configurateur

1. Construire un `PdfQuoteDocument` (adapter local).
2. Appeler `downloadQuotePdf(doc)` depuis un bouton UI.
3. Ne **pas** importer `jspdf` dans le module configurateur.
4. Les prix / quantités sont calculés **avant** — le PDF ne recalcule rien.

## Exemple coffrets

[`src/configurators/coffret-com/buildPdfDocument.ts`](../src/configurators/coffret-com/buildPdfDocument.ts)
