import type { PricingTierCode } from "@/core/pricing/pricingTiers";
import type { TierPriceMap } from "@/core/pricing/priceLevels";
import {
  PRODUCT_CATEGORY_EMBED,
  withoutExcludedCategoryProducts,
  type ProductCategoryLink,
} from "@/core/catalog/excludedCategories";
import { fetchTierPricesByProductIds } from "@/core/pricing/fetchProductPrices";
import { pickTierPrice } from "@/core/pricing/priceLevels";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/core/supabase/client";

/** Alias catalogue configurateur → SKU réel en table `products`. */
export const PRODUCT_SKU_ALIASES: Record<string, string> = {
  DTIO2: "DTIO-2",
  DTIO4: "DTIO-4",
};

export function resolveProductSku(sku: string): string {
  return PRODUCT_SKU_ALIASES[sku] ?? sku;
}

type ChassisRow = {
  sku: string;
  label: string;
  gamme_id: string | null;
  image_sku: string | null;
  price_s: number | null;
  price_m: number | null;
  price_b: number | null;
  price_a: number | null;
  price_z: number | null;
};

type ProductRow = {
  id: string;
  sku: string;
  name: string;
  oxatis_id: number | null;
  qty_in_stock: number | null;
  product_categories?: ProductCategoryLink[] | null;
};

export type SkuPriceEntry = {
  sku: string;
  /** SKU réellement lu en DB (après alias). */
  resolvedSku: string;
  label: string | null;
  source: "chassis" | "products";
  prices: TierPriceMap;
  oxatisId: number | null;
  qtyInStock: number | null;
};

function chassisRowToPrices(row: ChassisRow): TierPriceMap {
  const map: TierPriceMap = {};
  if (row.price_s != null && Number.isFinite(Number(row.price_s))) {
    map.S = Number(row.price_s);
  }
  if (row.price_m != null && Number.isFinite(Number(row.price_m))) {
    map.M = Number(row.price_m);
  }
  if (row.price_b != null && Number.isFinite(Number(row.price_b))) {
    map.B = Number(row.price_b);
  }
  if (row.price_a != null && Number.isFinite(Number(row.price_a))) {
    map.A = Number(row.price_a);
  }
  if (row.price_z != null && Number.isFinite(Number(row.price_z))) {
    map.Z = Number(row.price_z);
  }
  return map;
}

/**
 * Charge les prix châssis depuis `public.chassis` (colonnes price_s…price_z).
 */
export async function fetchChassisPriceMap(): Promise<
  Map<string, SkuPriceEntry>
> {
  const result = new Map<string, SkuPriceEntry>();
  if (!isSupabaseConfigured()) return result;
  const client = getSupabaseBrowserClient();
  if (!client) return result;

  const { data, error } = await client.from("chassis").select(
    "sku, label, gamme_id, image_sku, price_s, price_m, price_b, price_a, price_z",
  );

  if (error) {
    console.warn("[pricing] chassis:", error.message);
    return result;
  }

  for (const row of (data ?? []) as ChassisRow[]) {
    const sku = String(row.sku);
    result.set(sku, {
      sku,
      resolvedSku: sku,
      label: row.label,
      source: "chassis",
      prices: chassisRowToPrices(row),
      oxatisId: null,
      qtyInStock: null,
    });
  }

  return result;
}

/**
 * Prix d’une liste de SKU :
 * 1. table `chassis` si présent
 * 2. sinon `products` + `product_prices` (avec alias SKU)
 */
export async function fetchSkuPriceEntries(
  skus: string[],
): Promise<Map<string, SkuPriceEntry>> {
  const result = new Map<string, SkuPriceEntry>();
  const unique = [...new Set(skus.filter(Boolean))];
  if (unique.length === 0) return result;

  const chassisMap = await fetchChassisPriceMap();
  const remaining: string[] = [];

  for (const sku of unique) {
    const fromChassis = chassisMap.get(sku);
    if (fromChassis) {
      result.set(sku, fromChassis);
    } else {
      remaining.push(sku);
    }
  }

  if (remaining.length === 0) return result;
  if (!isSupabaseConfigured()) return result;
  const client = getSupabaseBrowserClient();
  if (!client) return result;

  const lookupSkus = [
    ...new Set(remaining.map((sku) => resolveProductSku(sku))),
  ];

  try {
    const { data, error } = await client
      .from("products")
      .select(`id, sku, name, oxatis_id, qty_in_stock, ${PRODUCT_CATEGORY_EMBED}`)
      .in("sku", lookupSkus);

    if (error) {
      console.warn("[pricing] products by sku:", error.message);
      return result;
    }

    const active = withoutExcludedCategoryProducts(
      (data ?? []) as ProductRow[],
    );
    const byResolvedSku = new Map(
      active.map((row) => [String(row.sku), row] as const),
    );

    const pricesById = await fetchTierPricesByProductIds(
      client,
      active.map((row) => String(row.id)),
    );

    for (const requestedSku of remaining) {
      const resolvedSku = resolveProductSku(requestedSku);
      const row = byResolvedSku.get(resolvedSku);
      if (!row) continue;
      result.set(requestedSku, {
        sku: requestedSku,
        resolvedSku,
        label: row.name,
        source: "products",
        prices: pricesById.get(String(row.id)) ?? {},
        oxatisId:
          row.oxatis_id == null || Number.isNaN(Number(row.oxatis_id))
            ? null
            : Number(row.oxatis_id),
        qtyInStock:
          row.qty_in_stock == null ? null : Number(row.qty_in_stock),
      });
    }
  } catch (err) {
    console.warn("[pricing] fetchSkuPriceEntries:", err);
  }

  return result;
}

export function pickSkuTierPrice(
  entries: Map<string, SkuPriceEntry>,
  sku: string,
  tier: PricingTierCode,
): number | null {
  return pickTierPrice(entries.get(sku)?.prices, tier);
}

export function sumSkuLinePricesHT(
  lines: Array<{ sku: string; qty: number }>,
  entries: Map<string, SkuPriceEntry>,
  tier: PricingTierCode,
): { total: number; missingSkus: string[] } {
  let total = 0;
  const missingSkus: string[] = [];
  for (const line of lines) {
    const unit = pickSkuTierPrice(entries, line.sku, tier);
    if (unit == null) {
      missingSkus.push(line.sku);
      continue;
    }
    total += unit * line.qty;
  }
  return { total, missingSkus };
}
