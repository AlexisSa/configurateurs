import type { PdfQuoteMeta } from "@/core/pdf";

/** Coordonnées / commentaire client pour devis PDF (tous optionnels). */
export type QuoteContactInfo = {
  clientName: string;
  societe: string;
  email: string;
  telephone: string;
  commentaire: string;
};

export function createEmptyContactInfo(): QuoteContactInfo {
  return {
    clientName: "",
    societe: "",
    email: "",
    telephone: "",
    commentaire: "",
  };
}

/** Entrées méta PDF — uniquement les champs renseignés. */
export function contactInfoToPdfMeta(
  contact: QuoteContactInfo,
): PdfQuoteMeta[] {
  const rows: Array<{ label: string; value: string }> = [
    { label: "Nom", value: contact.clientName },
    { label: "Société", value: contact.societe },
    { label: "Email", value: contact.email },
    { label: "Téléphone", value: contact.telephone },
    { label: "Commentaire", value: contact.commentaire },
  ];
  return rows
    .map((row) => ({ label: row.label, value: row.value.trim() }))
    .filter((row) => row.value.length > 0);
}
