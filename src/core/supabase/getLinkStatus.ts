import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/core/supabase/client";

export type SupabaseLinkStatus =
  | { state: "unconfigured" }
  | { state: "ok"; productCount: number; message: string }
  | { state: "error"; message: string };

/**
 * Diagnostic léger pour l’UI : env présentes + table `products` accessible.
 * La V1 n’utilise pas encore une table `stocks` (absente du projet Supabase).
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
    const { count, error } = await client
      .from("products")
      .select("id", { count: "exact", head: true });

    if (error) {
      return { state: "error", message: error.message };
    }

    const productCount = count ?? 0;
    return {
      state: "ok",
      productCount,
      message:
        productCount === 0
          ? "Connecté — 0 produit visible (vérifier RLS anon)."
          : `Connecté — ${productCount} produit(s) visibles.`,
    };
  } catch (err) {
    return {
      state: "error",
      message: err instanceof Error ? err.message : "Erreur réseau Supabase",
    };
  }
}
