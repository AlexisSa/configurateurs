/** Modèle + filtres du catalogue câble RJ45 informatique (Supabase / Oxatis). */

import type { TierPriceMap } from "@/core/pricing/priceLevels";

export type ProductFacet = {
  key: string;
  code?: string | null;
  value: string;
};

export type CableProduct = {
  sku: string;
  label: string;
  oxatisId: number | null;
  category: string | null;
  color: string | null;
  shielding: string | null;
  sheath: string | null;
  productType: string | null;
  pairCount: string | null;
  qtyInStock: number;
  imageUrl: string | null;
  prices: TierPriceMap;
};

export type CableFilters = {
  category: string | "all";
  color: string | "all";
  shielding: string | "all";
  sheath: string | "all";
  productType: string | "all";
  pairCount: string | "all";
};

export const DEFAULT_FILTERS: CableFilters = {
  category: "all",
  color: "all",
  shielding: "all",
  sheath: "all",
  productType: "all",
  pairCount: "all",
};

export function getFacetValue(
  facets: ProductFacet[] | null | undefined,
  key: string,
): string | null {
  const hit = facets?.find((facet) => facet.key === key);
  return hit?.value?.trim() ? hit.value.trim() : null;
}

export function mapProductRow(row: {
  sku: string;
  name: string;
  oxatis_id: number | null;
  qty_in_stock: number | null;
  image_url: string | null;
  facets: ProductFacet[] | null;
  prices?: TierPriceMap;
}): CableProduct {
  const facets = row.facets ?? [];
  const oxatisRaw = row.oxatis_id == null ? null : Number(row.oxatis_id);
  return {
    sku: row.sku,
    label: row.name,
    oxatisId:
      oxatisRaw != null && Number.isFinite(oxatisRaw) && oxatisRaw > 0
        ? oxatisRaw
        : null,
    category: getFacetValue(facets, "Catégorie"),
    color: getFacetValue(facets, "Couleur"),
    shielding: getFacetValue(facets, "Blindage"),
    sheath: getFacetValue(facets, "Gaine"),
    productType: getFacetValue(facets, "Type de produit"),
    pairCount: getFacetValue(facets, "Nombre de paires"),
    qtyInStock: Number(row.qty_in_stock ?? 0),
    imageUrl: row.image_url,
    prices: row.prices ?? {},
  };
}

export type CableFilterOptions = {
  categories: string[];
  colors: string[];
  shieldings: string[];
  sheaths: string[];
  productTypes: string[];
  pairCounts: string[];
};

const FILTER_KEYS = [
  "category",
  "color",
  "shielding",
  "sheath",
  "productType",
  "pairCount",
] as const satisfies ReadonlyArray<keyof CableFilters>;

export function filterCableProducts(
  products: CableProduct[],
  filters: CableFilters,
): CableProduct[] {
  return products.filter((product) => {
    if (filters.category !== "all" && product.category !== filters.category) {
      return false;
    }
    if (filters.color !== "all" && product.color !== filters.color) {
      return false;
    }
    if (
      filters.shielding !== "all" &&
      product.shielding !== filters.shielding
    ) {
      return false;
    }
    if (filters.sheath !== "all" && product.sheath !== filters.sheath) {
      return false;
    }
    if (
      filters.productType !== "all" &&
      product.productType !== filters.productType
    ) {
      return false;
    }
    if (
      filters.pairCount !== "all" &&
      product.pairCount !== filters.pairCount
    ) {
      return false;
    }
    return true;
  });
}

function uniqueSorted(values: Array<string | null>): string[] {
  const set = new Set<string>();
  for (const value of values) {
    if (value) set.add(value);
  }
  return [...set].sort((a, b) => a.localeCompare(b, "fr"));
}

export function buildFilterOptions(products: CableProduct[]): CableFilterOptions {
  return {
    categories: uniqueSorted(products.map((p) => p.category)),
    colors: uniqueSorted(products.map((p) => p.color)),
    shieldings: uniqueSorted(products.map((p) => p.shielding)),
    sheaths: uniqueSorted(products.map((p) => p.sheath)),
    productTypes: uniqueSorted(products.map((p) => p.productType)),
    pairCounts: uniqueSorted(products.map((p) => p.pairCount)),
  };
}

export function buildCompatibleFilterOptions(
  products: CableProduct[],
  filters: CableFilters,
): CableFilterOptions {
  return {
    categories: buildFilterOptions(
      filterCableProducts(products, { ...filters, category: "all" }),
    ).categories,
    colors: buildFilterOptions(
      filterCableProducts(products, { ...filters, color: "all" }),
    ).colors,
    shieldings: buildFilterOptions(
      filterCableProducts(products, { ...filters, shielding: "all" }),
    ).shieldings,
    sheaths: buildFilterOptions(
      filterCableProducts(products, { ...filters, sheath: "all" }),
    ).sheaths,
    productTypes: buildFilterOptions(
      filterCableProducts(products, { ...filters, productType: "all" }),
    ).productTypes,
    pairCounts: buildFilterOptions(
      filterCableProducts(products, { ...filters, pairCount: "all" }),
    ).pairCounts,
  };
}

function coerceFiltersToOptions(
  filters: CableFilters,
  options: CableFilterOptions,
): CableFilters {
  return {
    category:
      filters.category === "all" ||
      options.categories.includes(filters.category)
        ? filters.category
        : "all",
    color:
      filters.color === "all" || options.colors.includes(filters.color)
        ? filters.color
        : "all",
    shielding:
      filters.shielding === "all" ||
      options.shieldings.includes(filters.shielding)
        ? filters.shielding
        : "all",
    sheath:
      filters.sheath === "all" || options.sheaths.includes(filters.sheath)
        ? filters.sheath
        : "all",
    productType:
      filters.productType === "all" ||
      options.productTypes.includes(filters.productType)
        ? filters.productType
        : "all",
    pairCount:
      filters.pairCount === "all" ||
      options.pairCounts.includes(filters.pairCount)
        ? filters.pairCount
        : "all",
  };
}

function filtersEqual(a: CableFilters, b: CableFilters): boolean {
  return FILTER_KEYS.every((key) => a[key] === b[key]);
}

export function resolveFacetFilters(
  products: CableProduct[],
  filters: CableFilters,
): { filters: CableFilters; options: CableFilterOptions } {
  let current = filters;
  let options = buildCompatibleFilterOptions(products, current);

  for (let i = 0; i < FILTER_KEYS.length + 1; i += 1) {
    const next = coerceFiltersToOptions(current, options);
    if (filtersEqual(next, current)) {
      return { filters: current, options };
    }
    current = next;
    options = buildCompatibleFilterOptions(products, current);
  }

  return { filters: current, options };
}

export function findCableProduct(
  products: CableProduct[],
  sku: string,
): CableProduct | undefined {
  return products.find((product) => product.sku === sku);
}
