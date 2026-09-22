import {
  PRODUCT_CATEGORY_EMBED,
  withoutExcludedCategoryProducts,
} from "@/core/catalog/excludedCategories";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/core/supabase/client";
import { resolveProductSku } from "@/core/pricing/fetchSkuPrices";

/**
 * Charge `image_url` pour une liste de SKUs (hors catégories exclues).
 * Clé = SKU demandé (avant alias).
 */
export async function fetchProductImagesBySkus(
  skus: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const unique = [...new Set(skus.filter(Boolean))];
  if (unique.length === 0) return result;
  if (!isSupabaseConfigured()) return result;

  const client = getSupabaseBrowserClient();
  if (!client) return result;

  const requestedToResolved = new Map(
    unique.map((sku) => [sku, resolveProductSku(sku)] as const),
  );
  const lookup = [...new Set(requestedToResolved.values())];

  try {
    const { data, error } = await client
      .from("products")
      .select(`sku, image_url, ${PRODUCT_CATEGORY_EMBED}`)
      .in("sku", lookup);

    if (error) {
      console.warn("[coffret-com] images:", error.message);
      return result;
    }

    const active = withoutExcludedCategoryProducts(data ?? []);
    const byResolved = new Map(
      active
        .filter((row) => row.image_url)
        .map((row) => [String(row.sku), String(row.image_url)] as const),
    );

    for (const [requested, resolved] of requestedToResolved) {
      const url = byResolved.get(resolved);
      if (url) result.set(requested, url);
    }
  } catch (err) {
    console.warn("[coffret-com] images unexpected:", err);
  }

  return result;
}
