export type PdfImageAsset = {
  dataUrl: string;
  width: number;
  height: number;
};

const cache = new Map<string, PdfImageAsset | null>();

/** Passe par /api/pdf-image pour contourner l’absence de CORS sur xeilom.fr. */
export function pdfImageFetchUrl(url: string): string {
  if (typeof window === "undefined") return url;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin === window.location.origin) return url;
    return `/api/pdf-image?url=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return url;
  }
}

async function blobToAsset(blob: Blob): Promise<PdfImageAsset | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    // Limite mémoire PDF (grandes photos Oxatis)
    const maxEdge = 800;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return {
      dataUrl: canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    return null;
  }
}

/**
 * Charge une image distante pour jsPDF (cache mémoire).
 * URLs externes → proxy same-origin.
 */
export async function loadPdfImage(
  url: string | null | undefined,
): Promise<PdfImageAsset | null> {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url) ?? null;

  const fetchUrl = pdfImageFetchUrl(url);

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      cache.set(url, null);
      return null;
    }
    const asset = await blobToAsset(await response.blob());
    cache.set(url, asset);
    return asset;
  } catch {
    cache.set(url, null);
    return null;
  }
}

/** Précharge un ensemble d’URLs (dédupliquées). */
export async function loadPdfImages(
  urls: Array<string | null | undefined>,
): Promise<Map<string, PdfImageAsset>> {
  const unique = [...new Set(urls.filter((u): u is string => Boolean(u)))];
  const entries = await Promise.all(
    unique.map(async (url) => [url, await loadPdfImage(url)] as const),
  );
  const map = new Map<string, PdfImageAsset>();
  for (const [url, asset] of entries) {
    if (asset) map.set(url, asset);
  }
  return map;
}
