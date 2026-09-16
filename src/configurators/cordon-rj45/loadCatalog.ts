import { listCategorySubtree } from "@/core/catalog/categoryTree";
import {
  PRODUCT_CATEGORY_EMBED,
  withoutExcludedCategoryProducts,
  type ProductCategoryLink,
} from "@/core/catalog/excludedCategories";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/core/supabase/client";
import { mapProductRow, type ProductFacet, type Rj45Product } from "./catalog";

/**
 * Racine Oxatis exacte (Product DB / categories.name).
 * Sous « Câblage informatique cuivre ».
 */
export const CORDON_CATEGORY_ROOT = "Cordons de brassage RJ45";

/** Hors scope configurateur cordons (autre famille produit). */
const SKIP_SUBTREE_NAMES = ["Liaisons pré-connectées cuivre"] as const;

const PRODUCT_PAGE_SIZE = 100;

export type LoadCordonCatalogResult =
  | { ok: true; products: Rj45Product[] }
  | { ok: false; reason: "unconfigured" | "error"; message: string };

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  qty_in_stock: number | null;
  image_url: string | null;
  facets: ProductFacet[] | null;
  product_categories?: ProductCategoryLink[] | null;
};

/**
 * Charge le catalogue via l’arbre catégories Oxatis « Cordons de brassage RJ45 ».
 * Applique la règle core d’exclusion « Anciens Produits ».
 */
export async function loadCordonRj45Catalog(): Promise<LoadCordonCatalogResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: "unconfigured",
      message:
        "Supabase non configuré (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY).",
    };
  }

  const client = getSupabaseBrowserClient();
  if (!client) {
    return {
      ok: false,
      reason: "unconfigured",
      message: "Client Supabase indisponible.",
    };
  }

  try {
    const subtree = await listCategorySubtree(client, CORDON_CATEGORY_ROOT, {
      skipSubtreeNames: SKIP_SUBTREE_NAMES,
    });

    if (subtree.length === 0) {
      return {
        ok: false,
        reason: "error",
        message: `Catégorie « ${CORDON_CATEGORY_ROOT} » introuvable.`,
      };
    }

    const categoryIds = subtree.map((category) => category.id);
    const productIds = await listProductIdsInCategories(client, categoryIds);
    const rows = await fetchProductsByIds(client, productIds);
    const active = withoutExcludedCategoryProducts(rows);

    const bySku = new Map<string, Rj45Product>();
    for (const row of active) {
      bySku.set(row.sku, mapProductRow(row));
    }

    const products = [...bySku.values()].sort((a, b) =>
      a.label.localeCompare(b.label, "fr"),
    );

    return { ok: true, products };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Erreur réseau Supabase",
    };
  }
}

async function listProductIdsInCategories(
  client: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
  categoryIds: string[],
): Promise<string[]> {
  const ids = new Set<string>();
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await client
      .from("product_categories")
      .select("product_id")
      .in("category_id", categoryIds)
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = data ?? [];
    for (const row of page) {
      ids.add(String(row.product_id));
    }
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return [...ids];
}

async function fetchProductsByIds(
  client: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
  productIds: string[],
): Promise<ProductRow[]> {
  const rows: ProductRow[] = [];

  for (let i = 0; i < productIds.length; i += PRODUCT_PAGE_SIZE) {
    const batch = productIds.slice(i, i + PRODUCT_PAGE_SIZE);
    const { data, error } = await client
      .from("products")
      .select(
        `id, sku, name, qty_in_stock, image_url, facets, ${PRODUCT_CATEGORY_EMBED}`,
      )
      .in("id", batch);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...((data ?? []) as ProductRow[]));
  }

  return rows;
}
