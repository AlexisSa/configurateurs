export type PdfImageAsset = {
  dataUrl: string;
  width: number;
  height: number;
  /** Format jsPDF (défaut PNG). */
  format?: "PNG" | "JPEG";
};

const cache = new Map<string, PdfImageAsset | null>();

const FETCH_IMAGE_TYPE = "coffret-fetch-image";
const FETCH_IMAGE_RESULT_TYPE = "coffret-fetch-image-result";

function isXeilomImageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "xeilom.fr" || host.endsWith(".xeilom.fr");
  } catch {
    return false;
  }
}

/** Proxy same-origin (OK en local ; souvent 403 Cloudflare depuis Vercel). */
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

function formatFromMime(mime: string | undefined): "PNG" | "JPEG" {
  if (mime?.includes("jpeg") || mime?.includes("jpg")) return "JPEG";
  return "PNG";
}

async function blobToAsset(blob: Blob): Promise<PdfImageAsset | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
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
    const format = formatFromMime(blob.type);
    return {
      dataUrl:
        format === "JPEG"
          ? canvas.toDataURL("image/jpeg", 0.85)
          : canvas.toDataURL("image/png"),
      width: canvas.width,
      height: canvas.height,
      format,
    };
  } catch {
    return null;
  }
}

async function dataUrlToAsset(dataUrl: string): Promise<PdfImageAsset | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxEdge = 800;
        const scale = Math.min(
          1,
          maxEdge / Math.max(img.naturalWidth, img.naturalHeight),
        );
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx || !canvas.width) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const isJpeg = dataUrl.startsWith("data:image/jpeg");
        resolve({
          dataUrl: isJpeg
            ? canvas.toDataURL("image/jpeg", 0.85)
            : canvas.toDataURL("image/png"),
          width: canvas.width,
          height: canvas.height,
          format: isJpeg ? "JPEG" : "PNG",
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/**
 * Demande l’image au parent Oxatis (même origine → pas de blocage Cloudflare).
 * Nécessite oxatis-bridge.js à jour sur xeilom.fr.
 */
function loadViaParentBridge(url: string): Promise<PdfImageAsset | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!window.parent || window.parent === window) return Promise.resolve(null);
  if (!isXeilomImageUrl(url)) return Promise.resolve(null);

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(null);
    }, 10000);

    function onMessage(event: MessageEvent) {
      const data = event.data as {
        type?: string;
        requestId?: string;
        dataUrl?: string | null;
      } | null;
      if (!data || data.type !== FETCH_IMAGE_RESULT_TYPE) return;
      if (data.requestId !== requestId) return;
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      if (!data.dataUrl) {
        resolve(null);
        return;
      }
      void dataUrlToAsset(data.dataUrl).then(resolve);
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage(
      { type: FETCH_IMAGE_TYPE, requestId, url },
      "*",
    );
  });
}

async function loadViaApiProxy(url: string): Promise<PdfImageAsset | null> {
  const response = await fetch(pdfImageFetchUrl(url));
  if (!response.ok) return null;
  return blobToAsset(await response.blob());
}

/**
 * Charge une image distante pour jsPDF (cache mémoire).
 * 1) proxy `/api/pdf-image` (local)
 * 2) postMessage parent Oxatis (prod iframe — contourne Cloudflare)
 */
export async function loadPdfImage(
  url: string | null | undefined,
): Promise<PdfImageAsset | null> {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url) ?? null;

  let asset: PdfImageAsset | null = null;
  const inIframe =
    typeof window !== "undefined" &&
    Boolean(window.parent && window.parent !== window);

  // En iframe Oxatis : le parent fetch /Files/ (pas bloqué par Cloudflare).
  // Hors iframe / en local : proxy Next /api/pdf-image.
  if (inIframe) {
    try {
      asset = await loadViaParentBridge(url);
    } catch {
      asset = null;
    }
  }

  if (!asset) {
    try {
      asset = await loadViaApiProxy(url);
    } catch {
      asset = null;
    }
  }

  cache.set(url, asset);
  return asset;
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
