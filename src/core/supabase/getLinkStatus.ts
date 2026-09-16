import {
  EXCLUDED_CATEGORY_NAMES,
  isExcludedCategoryName,
} from "@/core/catalog/excludedCategories";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/core/supabase/client";

export type SupabaseLinkStatus =
  | { state: "unconfigured" }
  | { state: "ok"; productCount: number; message: string }
  | { state: "error"; message: string };

/**
 * Diagnostic léger pour l’UI : env présentes + table `products` accessible.
 * Le compte ignore les produits des catégories exclues (ex. Anciens Produits).
 */
export async function getSupabaseLinkStatus(): Promise<SupabaseLinkStatus> {
  if (!isSupabaseConfigured()) {
    return { state: "unconfigured" };
  }

  const client = getSupabaseBrowserClient();
  if (!client) {
    return { state: "unconfigured" };
  }

  try {
    const { count: totalCount, error: totalError } = await client
      .from("products")
      .select("id", { count: "exact", head: true });

    if (totalError) {
      return { state: "error", message: totalError.message };
    }

    const excludedCount = await countExcludedProducts(client);
    if (excludedCount == null) {
      return {
        state: "error",
        message: "Impossible de compter les catégories exclues.",
      };
    }

    const productCount = Math.max(0, (totalCount ?? 0) - excludedCount);
    const excludedLabel = EXCLUDED_CATEGORY_NAMES.join(", ");

    return {
      state: "ok",
      productCount,
      message:
        productCount === 0
          ? "Connecté — 0 produit actif visible (vérifier RLS anon)."
          : `Connecté — ${productCount} produit(s) actifs (hors ${excludedLabel}).`,
    };
  } catch (err) {
    return {
      state: "error",
      message: err instanceof Error ? err.message : "Erreur réseau Supabase",
    };
  }
}

async function countExcludedProducts(
  client: NonNullable<ReturnType<typeof getSupabaseBrowserClient>>,
): Promise<number | null> {
  const { data: categories, error: catError } = await client
    .from("categories")
    .select("id, name");

  if (catError) {
    console.warn("[supabase] categories query failed:", catError.message);
    return null;
  }

  const excludedIds = (categories ?? [])
    .filter((row) => isExcludedCategoryName(row.name))
    .map((row) => row.id);

  if (excludedIds.length === 0) return 0;

  const { count, error } = await client
    .from("product_categories")
    .select("product_id", { count: "exact", head: true })
    .in("category_id", excludedIds);

  if (error) {
    console.warn("[supabase] product_categories count failed:", error.message);
    return null;
  }

  return count ?? 0;
}
