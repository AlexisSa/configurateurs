import type { SupabaseClient } from "@supabase/supabase-js";

export type CatalogCategory = {
  id: string;
  name: string;
  path: string | null;
  parent_id: string | null;
};

const CATEGORY_PAGE_SIZE = 1000;

let categoriesMemory: CatalogCategory[] | null = null;
let categoriesPromise: Promise<CatalogCategory[]> | null = null;

/**
 * Parcourt l’arbre `categories` depuis un nœud racine (BFS en mémoire).
 * Charge toutes les catégories en peu de requêtes, puis filtre localement.
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

  const all = await fetchAllCategories(client);
  const root = all.find((category) => category.name === rootName);
  if (!root) return [];

  const childrenByParent = new Map<string, CatalogCategory[]>();
  for (const category of all) {
    if (!category.parent_id) continue;
    const list = childrenByParent.get(category.parent_id) ?? [];
    list.push(category);
    childrenByParent.set(category.parent_id, list);
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
    queue.push(...(childrenByParent.get(current.id) ?? []));
  }

  return collected;
}

async function fetchAllCategories(
  client: SupabaseClient,
): Promise<CatalogCategory[]> {
  if (categoriesMemory) return categoriesMemory;
  if (categoriesPromise) return categoriesPromise;

  categoriesPromise = (async () => {
    const rows: CatalogCategory[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await client
        .from("categories")
        .select("id, name, path, parent_id")
        .range(from, from + CATEGORY_PAGE_SIZE - 1);

      if (error) throw new Error(error.message);

      const page = (data ?? []) as CatalogCategory[];
      rows.push(...page);
      if (page.length < CATEGORY_PAGE_SIZE) break;
      from += CATEGORY_PAGE_SIZE;
    }

    categoriesMemory = rows;
    return rows;
  })();

  try {
    return await categoriesPromise;
  } finally {
    categoriesPromise = null;
  }
}
