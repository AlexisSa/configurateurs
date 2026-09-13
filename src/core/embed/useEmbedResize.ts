"use client";

import { useEffect } from "react";
import { EMBED_RESIZE_MESSAGE_TYPE } from "./messages";

/**
 * Envoie la hauteur du document au parent pour éviter le double scroll iframe.
 * Activer uniquement en mode embed.
 */
export function useEmbedResize(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!window.parent || window.parent === window) return;

    const publish = () => {
      const height = Math.ceil(
        Math.max(
          document.body.scrollHeight,
          document.documentElement.scrollHeight,
        ),
      );
      window.parent.postMessage(
        { type: EMBED_RESIZE_MESSAGE_TYPE, height },
        "*",
      );
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(document.body);

    window.addEventListener("load", publish);
    return () => {
      observer.disconnect();
      window.removeEventListener("load", publish);
    };
  }, [enabled]);
}
