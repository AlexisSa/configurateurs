import type { SupabaseClient } from "@supabase/supabase-js";

export type CatalogCategory = {
  id: string;
  name: string;
  path: string | null;
  parent_id: string | null;
};

/**
 * Parcourt l’arbre `categories` depuis un nœud racine (BFS).
 * `skipSubtreeNames` ignore ces nœuds et tous leurs descendants.
 */
export async function listCategorySubtree(
  client: SupabaseClient,
  rootName: string,
  options?: { skipSubtreeNames?: readonly string[] },
): Promise<CatalogCategory[]> {
  const skip = new Set(
    (options?.skipSubtreeNames ?? []).map((name) =>
      name.trim().toLocaleLowerCase("fr"),
    ),
  );

  const { data: root, error: rootError } = await client
    .from("categories")
    .select("id, name, path, parent_id")
    .eq("name", rootName)
    .maybeSingle();

  if (rootError) {
    throw new Error(rootError.message);
  }
  if (!root) {
    return [];
  }

  const collected: CatalogCategory[] = [];
  const queue: CatalogCategory[] = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (skip.has(current.name.trim().toLocaleLowerCase("fr"))) {
      continue;
    }

    collected.push(current);

    const { data: children, error: childError } = await client
      .from("categories")
      .select("id, name, path, parent_id")
      .eq("parent_id", current.id);

    if (childError) {
      throw new Error(childError.message);
    }

    queue.push(...(children ?? []));
  }

  return collected;
}
