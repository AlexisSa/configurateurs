import { ExternalLink } from "lucide-react";
import { buildOxatisProductUrl } from "./productUrl";

/** Lien fiche produit Oxatis — visible dans les listes de résultats. */
export function OxatisProductLink({
  oxatisId,
  isEmbed,
  selected = false,
}: {
  oxatisId: number;
  isEmbed: boolean;
  selected?: boolean;
}) {
  return (
    <a
      href={buildOxatisProductUrl(oxatisId)}
      target={isEmbed ? "_top" : "_blank"}
      rel="noopener noreferrer"
      title="Voir la fiche produit"
      aria-label="Voir la fiche produit"
      className={`m-2 flex shrink-0 items-center gap-1.5 self-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
        selected
          ? "border-white/40 bg-white/15 text-white hover:bg-white/25"
          : "border-brand/30 bg-brand-muted text-brand hover:border-brand hover:bg-brand hover:text-white"
      }`}
    >
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
      Fiche
    </a>
  );
}
