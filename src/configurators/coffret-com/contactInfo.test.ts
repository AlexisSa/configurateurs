import { describe, expect, it } from "vitest";
import {
  contactInfoToPdfMeta,
  createEmptyContactInfo,
} from "./contactInfo";

describe("contactInfoToPdfMeta", () => {
  it("retourne une liste vide si rien n’est renseigné", () => {
    expect(contactInfoToPdfMeta(createEmptyContactInfo())).toEqual([]);
  });

  it("n’inclut que les champs non vides (trim)", () => {
    expect(
      contactInfoToPdfMeta({
        clientName: "  Alice  ",
        societe: "",
        email: "alice@ex.fr",
        telephone: "  ",
        commentaire: "Livraison semaine 12",
      }),
    ).toEqual([
      { label: "Nom", value: "Alice" },
      { label: "Email", value: "alice@ex.fr" },
      { label: "Commentaire", value: "Livraison semaine 12" },
    ]);
  });
});
