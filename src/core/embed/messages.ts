/** Types de messages postMessage alignés sur le guide Oxatis (coffret-*). */

export const EMBED_CONTEXT_MESSAGE_TYPE = "coffret-context";
export const EMBED_REQUEST_CONTEXT_MESSAGE_TYPE = "coffret-request-context";
export const EMBED_RESIZE_MESSAGE_TYPE = "coffret-resize";
/** iframe → parent : demande le fetch d’une image catalogue (bypass Cloudflare Vercel). */
export const EMBED_FETCH_IMAGE_TYPE = "coffret-fetch-image";
/** parent → iframe : data URL de l’image. */
export const EMBED_FETCH_IMAGE_RESULT_TYPE = "coffret-fetch-image-result";

export type EmbedContextMessage = {
  type: typeof EMBED_CONTEXT_MESSAGE_TYPE;
  categoryId?: string | number;
  pricingTier?: string;
};

export type EmbedResizeMessage = {
  type: typeof EMBED_RESIZE_MESSAGE_TYPE;
  height: number;
};

export type EmbedFetchImageMessage = {
  type: typeof EMBED_FETCH_IMAGE_TYPE;
  requestId: string;
  url: string;
};

export type EmbedFetchImageResultMessage = {
  type: typeof EMBED_FETCH_IMAGE_RESULT_TYPE;
  requestId: string;
  dataUrl?: string | null;
  error?: string;
};
