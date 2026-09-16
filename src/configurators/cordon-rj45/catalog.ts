/** Modèle + filtres du catalogue cordons de brassage RJ45 (Supabase / Oxatis). */

export type ProductFacet = {
  key: string;
  code?: string | null;
  value: string;
};

/** Libellé quand la facet « Type de cordon » est absente. */
export const STANDARD_CORDON_TYPE = "Standards";

export type Rj45Product = {
  sku: string;
  label: string;
  category: string | null;
  color: string | null;
  length: string | null;
  shielding: string | null;
  /** Toujours renseigné : facet Oxatis ou « Standards ». */
  cordonType: string;
  qtyInStock: number;
  imageUrl: string | null;
};

export type Rj45Filters = {
  category: string | "all";
  color: string | "all";
  length: string | "all";
  shielding: string | "all";
  cordonType: string | "all";
};

export const DEFAULT_FILTERS: Rj45Filters = {
  category: "all",
  color: "all",
  length: "all",
  shielding: "all",
  cordonType: "all",
};

export function getFacetValue(
  facets: ProductFacet[] | null | undefined,
  key: string,
): string | null {
  const hit = facets?.find((facet) => facet.key === key);
  return hit?.value?.trim() ? hit.value.trim() : null;
}

/** Parse "1,00 m" / "1 m" → mètres. */
export function parseLengthMeters(raw: string | null): number | null {
  if (!raw) return null;
  const match = raw.replace(/\s/g, "").match(/^(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

export function resolveCordonType(
  facets: ProductFacet[] | null | undefined,
): string {
  return getFacetValue(facets, "Type de cordon") ?? STANDARD_CORDON_TYPE;
}

export function mapProductRow(row: {
  sku: string;
  name: string;
  qty_in_stock: number | null;
  image_url: string | null;
  facets: ProductFacet[] | null;
}): Rj45Product {
  const facets = row.facets ?? [];
  return {
    sku: row.sku,
    label: row.name,
    category: getFacetValue(facets, "Catégorie"),
    color: getFacetValue(facets, "Couleur"),
    length: getFacetValue(facets, "Longueur"),
    shielding: getFacetValue(facets, "Blindage"),
    cordonType: resolveCordonType(facets),
    qtyInStock: Number(row.qty_in_stock ?? 0),
    imageUrl: row.image_url,
  };
}

export type Rj45FilterOptions = {
  categories: string[];
  colors: string[];
  lengths: string[];
  shieldings: string[];
  cordonTypes: string[];
};

const FILTER_KEYS = [
  "category",
  "color",
  "length",
  "shielding",
  "cordonType",
] as const satisfies ReadonlyArray<keyof Rj45Filters>;

export function filterRj45Products(
  products: Rj45Product[],
  filters: Rj45Filters,
): Rj45Product[] {
  return products.filter((product) => {
    if (filters.category !== "all" && product.category !== filters.category) {
      return false;
    }
    if (filters.color !== "all" && product.color !== filters.color) {
      return false;
    }
    if (filters.length !== "all" && product.length !== filters.length) {
      return false;
    }
    if (
      filters.shielding !== "all" &&
      product.shielding !== filters.shielding
    ) {
      return false;
    }
    if (
      filters.cordonType !== "all" &&
      product.cordonType !== filters.cordonType
    ) {
      return false;
    }
    return true;
  });
}

function uniqueSorted(
  values: Array<string | null>,
  compare?: (a: string, b: string) => number,
): string[] {
  const set = new Set<string>();
  for (const value of values) {
    if (value) set.add(value);
  }
  const list = [...set];
  list.sort(compare ?? ((a, b) => a.localeCompare(b, "fr")));
  return list;
}

function compareLengths(a: string, b: string): number {
  const na = parseLengthMeters(a) ?? Number.POSITIVE_INFINITY;
  const nb = parseLengthMeters(b) ?? Number.POSITIVE_INFINITY;
  return na - nb || a.localeCompare(b, "fr");
}

function compareCordonTypes(a: string, b: string): number {
  if (a === STANDARD_CORDON_TYPE && b !== STANDARD_CORDON_TYPE) return -1;
  if (b === STANDARD_CORDON_TYPE && a !== STANDARD_CORDON_TYPE) return 1;
  return a.localeCompare(b, "fr");
}

export function buildFilterOptions(products: Rj45Product[]): Rj45FilterOptions {
  return {
    categories: uniqueSorted(products.map((p) => p.category)),
    colors: uniqueSorted(products.map((p) => p.color)),
    lengths: uniqueSorted(products.map((p) => p.length), compareLengths),
    shieldings: uniqueSorted(products.map((p) => p.shielding)),
    cordonTypes: uniqueSorted(
      products.map((p) => p.cordonType),
      compareCordonTypes,
    ),
  };
}

export function buildCompatibleFilterOptions(
  products: Rj45Product[],
  filters: Rj45Filters,
): Rj45FilterOptions {
  return {
    categories: buildFilterOptions(
      filterRj45Products(products, { ...filters, category: "all" }),
    ).categories,
    colors: buildFilterOptions(
      filterRj45Products(products, { ...filters, color: "all" }),
    ).colors,
    lengths: buildFilterOptions(
      filterRj45Products(products, { ...filters, length: "all" }),
    ).lengths,
    shieldings: buildFilterOptions(
      filterRj45Products(products, { ...filters, shielding: "all" }),
    ).shieldings,
    cordonTypes: buildFilterOptions(
      filterRj45Products(products, { ...filters, cordonType: "all" }),
    ).cordonTypes,
  };
}

function coerceFiltersToOptions(
  filters: Rj45Filters,
  options: Rj45FilterOptions,
): Rj45Filters {
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
    length:
      filters.length === "all" || options.lengths.includes(filters.length)
        ? filters.length
        : "all",
    shielding:
      filters.shielding === "all" ||
      options.shieldings.includes(filters.shielding)
        ? filters.shielding
        : "all",
    cordonType:
      filters.cordonType === "all" ||
      options.cordonTypes.includes(filters.cordonType)
        ? filters.cordonType
        : "all",
  };
}

function filtersEqual(a: Rj45Filters, b: Rj45Filters): boolean {
  return FILTER_KEYS.every((key) => a[key] === b[key]);
}

export function resolveFacetFilters(
  products: Rj45Product[],
  filters: Rj45Filters,
): { filters: Rj45Filters; options: Rj45FilterOptions } {
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

export function findRj45Product(
  products: Rj45Product[],
  sku: string,
): Rj45Product | undefined {
  return products.find((product) => product.sku === sku);
}
