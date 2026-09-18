import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PRODUCT_CATEGORY_EMBED,
  withoutExcludedCategoryProducts,
  type ProductCategoryLink,
} from "@/core/catalog/excludedCategories";
import { fetchTierPricesByProductIds } from "@/core/pricing/fetchProductPrices";
import { pickTierPrice, type TierPriceMap } from "@/core/pricing/priceLevels";
import type { PricingTierCode } from "@/core/pricing/pricingTiers";

export type RelatedProduct = {
  id: string;
  sku: string;
  label: string;
  oxatisId: number | null;
  imageUrl: string | null;
  qtyInStock: number;
  prices: TierPriceMap;
};

type RelationRow = {
  related_sku: string;
  relation_type: string;
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  oxatis_id: number | null;
  qty_in_stock: number | null;
  image_url: string | null;
  product_categories?: ProductCategoryLink[] | null;
};

const DEFAULT_LIMIT = 8;

/**
 * Articles complémentaires Oxatis (`product_relations`, type `related`).
 */
export async function fetchRelatedProducts(
  client: SupabaseClient,
  productId: string,
  options?: { limit?: number },
): Promise<RelatedProduct[]> {
  const limit = options?.limit ?? DEFAULT_LIMIT;
  if (!productId) return [];

  const { data: relations, error: relError } = await client
    .from("product_relations")
    .select("related_sku, relation_type")
    .eq("product_id", productId)
    .eq("relation_type", "related")
    .limit(40);

  if (relError) throw new Error(relError.message);

  const skus = uniqueSkus(
    ((relations ?? []) as RelationRow[]).map((row) => row.related_sku),
  );
  if (skus.length === 0) return [];

  const { data: products, error: prodError } = await client
    .from("products")
    .select(
      `id, sku, name, oxatis_id, qty_in_stock, image_url, ${PRODUCT_CATEGORY_EMBED}`,
    )
    .in("sku", skus);

  if (prodError) throw new Error(prodError.message);

  const active = withoutExcludedCategoryProducts(
    (products ?? []) as ProductRow[],
  );
  if (active.length === 0) return [];

  const pricesById = await fetchTierPricesByProductIds(
    client,
    active.map((row) => row.id),
  );

  const bySku = new Map(active.map((row) => [row.sku, row]));
  const ordered: RelatedProduct[] = [];

  for (const sku of skus) {
    const row = bySku.get(sku);
    if (!row) continue;
    const oxatisRaw = row.oxatis_id == null ? null : Number(row.oxatis_id);
    ordered.push({
      id: row.id,
      sku: row.sku,
      label: row.name,
      oxatisId:
        oxatisRaw != null && Number.isFinite(oxatisRaw) && oxatisRaw > 0
          ? oxatisRaw
          : null,
      imageUrl: row.image_url,
      qtyInStock: Number(row.qty_in_stock ?? 0),
      prices: pricesById.get(row.id) ?? {},
    });
    if (ordered.length >= limit) break;
  }

  return ordered;
}

export function relatedUnitPrice(
  product: RelatedProduct,
  tier: PricingTierCode,
): number | null {
  return pickTierPrice(product.prices, tier);
}

function uniqueSkus(skus: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const sku of skus) {
    const value = sku?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}
