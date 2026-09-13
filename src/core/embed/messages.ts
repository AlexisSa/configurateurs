/** Types de messages postMessage alignés sur le guide Oxatis (coffret-*). */

export const EMBED_CONTEXT_MESSAGE_TYPE = "coffret-context";
export const EMBED_REQUEST_CONTEXT_MESSAGE_TYPE = "coffret-request-context";
export const EMBED_RESIZE_MESSAGE_TYPE = "coffret-resize";

export type EmbedContextMessage = {
  type: typeof EMBED_CONTEXT_MESSAGE_TYPE;
  categoryId?: string | number;
  pricingTier?: string;
};

export type EmbedResizeMessage = {
  type: typeof EMBED_RESIZE_MESSAGE_TYPE;
  height: number;
};
