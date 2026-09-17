type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

const memory = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Cache mémoire (+ sessionStorage si dispo) pour les catalogues configurateurs.
 * Évite de recharger Supabase à chaque navigation dans la même session.
 */
export function getCachedCatalog<T>(key: string): T | null {
  const now = Date.now();
  const mem = memory.get(key) as CacheEntry<T> | undefined;
  if (mem && mem.expiresAt > now) return mem.value;

  if (typeof sessionStorage === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (!parsed || parsed.expiresAt <= now) {
      sessionStorage.removeItem(storageKey(key));
      return null;
    }
    memory.set(key, parsed);
    return parsed.value;
  } catch {
    return null;
  }
}

export function setCachedCatalog<T>(
  key: string,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  const entry: CacheEntry<T> = {
    expiresAt: Date.now() + ttlMs,
    value,
  };
  memory.set(key, entry);

  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Quota / mode privé : le cache mémoire suffit.
  }
}

function storageKey(key: string): string {
  return `configurateurs:catalog:${key}`;
}
