import {
  PRODUCT_CATEGORY_EMBED,
  withoutExcludedCategoryProducts,
} from "@/core/catalog/excludedCategories";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/core/supabase/client";
import type { StockStatus } from "@/core/payload/types";

/**
 * Stock via `public.products` (sku + qty_in_stock).
 * Ignore les produits des catégories exclues (ex. Anciens Produits).
 * - SKU absent / exclu → partial / unknown
 * - qty_in_stock <= 0 → partial (sauf si toutes les refs manquent → unknown)
 */
export async function getStockStatus(refs: string[]): Promise<StockStatus> {
  if (!refs.length) return "unknown";
  if (!isSupabaseConfigured()) return "unknown";

  const client = getSupabaseBrowserClient();
  if (!client) return "unknown";

  try {
    const { data, error } = await client
      .from("products")
      .select(`sku, qty_in_stock, ${PRODUCT_CATEGORY_EMBED}`)
      .in("sku", refs);

    if (error) {
      console.warn("[stock] products query failed:", error.message);
      return "unknown";
    }

    const active = withoutExcludedCategoryProducts(data ?? []);

    const bySku = new Map(
      active.map((row) => [String(row.sku), Number(row.qty_in_stock ?? 0)]),
    );

    let found = 0;
    let outOfStock = 0;

    for (const ref of refs) {
      if (!bySku.has(ref)) continue;
      found += 1;
      if ((bySku.get(ref) ?? 0) <= 0) outOfStock += 1;
    }

    if (found === 0) return "unknown";
    if (found < refs.length || outOfStock > 0) return "partial";
    return "ok";
  } catch (err) {
    console.warn("[stock] unexpected error:", err);
    return "unknown";
  }
}
