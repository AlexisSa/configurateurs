/**
 * Règles catalogue transverses (tous les configurateurs / lecteurs products).
 * Ne jamais exposer les produits rattachés à ces catégories Oxatis/Product DB.
 */

export const EXCLUDED_CATEGORY_NAMES = ["Anciens Produits"] as const;

export type CategoryNameRef = {
  name?: string | null;
};

export type ProductCategoryLink = {
  categories?: CategoryNameRef | CategoryNameRef[] | null;
};

function normalizeCategoryName(name: string): string {
  return name.trim().toLocaleLowerCase("fr");
}

const EXCLUDED_NORMALIZED = new Set(
  EXCLUDED_CATEGORY_NAMES.map((name) => normalizeCategoryName(name)),
);

/** True si le libellé catégorie est exclu du catalogue actif. */
export function isExcludedCategoryName(name: string | null | undefined): boolean {
  if (!name) return false;
  return EXCLUDED_NORMALIZED.has(normalizeCategoryName(name));
}

function categoryNamesFromLink(
  link: ProductCategoryLink,
): Array<string | null | undefined> {
  const ref = link.categories;
  if (!ref) return [];
  return Array.isArray(ref) ? ref.map((c) => c?.name) : [ref.name];
}

/** True si le produit est lié (via product_categories) à une catégorie exclue. */
export function isProductInExcludedCategory(row: {
  product_categories?: ProductCategoryLink[] | null;
}): boolean {
  const links = row.product_categories ?? [];
  return links.some((link) =>
    categoryNamesFromLink(link).some((name) => isExcludedCategoryName(name)),
  );
}

/** Retire les produits des catégories exclues (filtre pur). */
export function withoutExcludedCategoryProducts<
  T extends { product_categories?: ProductCategoryLink[] | null },
>(rows: T[]): T[] {
  return rows.filter((row) => !isProductInExcludedCategory(row));
}

/** Fragment select PostgREST pour joindre les noms de catégories. */
export const PRODUCT_CATEGORY_EMBED =
  "product_categories(categories(name))" as const;
