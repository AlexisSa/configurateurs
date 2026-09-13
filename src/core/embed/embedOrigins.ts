/**
 * Origines parent autorisées pour postMessage (prod).
 * En développement, on accepte toute origine pour faciliter embed-test.html.
 */
const EMBED_PARENT_ORIGINS = [
  "https://www.xeilom.fr",
  "https://xeilom.fr",
] as const;

export function isAllowedEmbedOrigin(origin: string): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  if (EMBED_PARENT_ORIGINS.includes(origin as (typeof EMBED_PARENT_ORIGINS)[number])) {
    return true;
  }

  // Referrer Oxatis parfois sans www / sous-domaine boutique
  try {
    const host = new URL(origin).hostname;
    return host === "xeilom.fr" || host.endsWith(".xeilom.fr");
  } catch {
    return false;
  }
}
