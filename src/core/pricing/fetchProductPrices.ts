import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TIER_TO_PRICE_LEVEL,
  tierPricesFromLevels,
  type TierPriceMap,
} from "./priceLevels";

const ID_BATCH_SIZE = 100;
const PAGE_SIZE = 1000;
const PRICE_LEVELS = Object.values(TIER_TO_PRICE_LEVEL);

/**
 * Charge les prix HT multi-niveaux pour une liste de `products.id`.
 * Retourne une map product_id → { S, M, B, A, Z }.
 */
export async function fetchTierPricesByProductIds(
  client: SupabaseClient,
  productIds: string[],
): Promise<Map<string, TierPriceMap>> {
  const result = new Map<string, TierPriceMap>();
  if (productIds.length === 0) return result;

  const rowsByProduct = new Map<
    string,
    Array<{ level: number; price_ht: number | null }>
  >();

  const idBatches: string[][] = [];
  for (let i = 0; i < productIds.length; i += ID_BATCH_SIZE) {
    idBatches.push(productIds.slice(i, i + ID_BATCH_SIZE));
  }

  await Promise.all(
    idBatches.map(async (idBatch) => {
      let from = 0;
      while (true) {
        const { data, error } = await client
          .from("product_prices")
          .select("product_id, level, price_ht")
          .in("product_id", idBatch)
          .in("level", PRICE_LEVELS)
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw new Error(error.message);

        const page = data ?? [];
        for (const row of page) {
          const productId = String(row.product_id);
          const list = rowsByProduct.get(productId) ?? [];
          list.push({
            level: Number(row.level),
            price_ht: row.price_ht == null ? null : Number(row.price_ht),
          });
          rowsByProduct.set(productId, list);
        }

        if (page.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
    }),
  );

  for (const [productId, rows] of rowsByProduct) {
    result.set(productId, tierPricesFromLevels(rows));
  }

  return result;
}
