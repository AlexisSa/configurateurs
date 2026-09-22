export type PdfImageAsset = {
  dataUrl: string;
  width: number;
  height: number;
};

const cache = new Map<string, PdfImageAsset | null>();

async function blobToAsset(blob: Blob): Promise<PdfImageAsset | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.drawImage(bitmap, 0, 0);
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
 * Retourne null si CORS / 404 / erreur.
 */
export async function loadPdfImage(
  url: string | null | undefined,
): Promise<PdfImageAsset | null> {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url) ?? null;

  try {
    const response = await fetch(url, { mode: "cors" });
    if (!response.ok) {
      cache.set(url, null);
      return null;
    }
    const asset = await blobToAsset(await response.blob());
    cache.set(url, asset);
    return asset;
  } catch {
    // Fallback Image + crossOrigin (certains CDN)
    try {
      const asset = await loadViaImageElement(url);
      cache.set(url, asset);
      return asset;
    } catch {
      cache.set(url, null);
      return null;
    }
  }
}

function loadViaImageElement(url: string): Promise<PdfImageAsset | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx || !canvas.width) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
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
