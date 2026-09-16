"use client";

import { useCallback, useRef, useState } from "react";
import {
  ADD_TO_CART_MESSAGE_TYPE,
  ADD_TO_CART_RESULT_MESSAGE_TYPE,
  buildOxatisCartUrl,
  CART_TIMEOUT_MS,
  OXATIS_ORIGIN,
  type AddToCartResultMessage,
  type OxatisCartItem,
} from "./messages";

export type AddToCartStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "success"; method?: string }
  | { state: "error"; message: string }
  | { state: "redirect" };

/**
 * Ajoute au panier Oxatis via postMessage (iframe + bridge),
 * avec fallback URL si hors iframe / bridge absent.
 */
export function useAddToCart() {
  const [status, setStatus] = useState<AddToCartStatus>({ state: "idle" });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const addToCart = useCallback(
    (items: OxatisCartItem[]) => {
      const cleaned = items
        .map((item) => ({
          productId: Number(item.productId),
          quantity: Math.max(1, Math.floor(item.quantity) || 1),
        }))
        .filter((item) => item.productId > 0);

      if (cleaned.length === 0) {
        setStatus({
          state: "error",
          message: "Produit introuvable pour le panier.",
        });
        return;
      }

      const inIframe = typeof window !== "undefined" && window.parent !== window;
      const fallbackUrl = buildOxatisCartUrl(cleaned);

      if (!inIframe) {
        setStatus({ state: "redirect" });
        window.location.href = fallbackUrl;
        return;
      }

      clearTimer();
      setStatus({ state: "pending" });

      const payload = {
        type: ADD_TO_CART_MESSAGE_TYPE,
        items: cleaned,
        productId: cleaned[0].productId,
        quantity: cleaned[0].quantity,
      };

      window.parent.postMessage(payload, OXATIS_ORIGIN);

      const onResult = (event: MessageEvent) => {
        if (event.origin !== OXATIS_ORIGIN) return;
        const data = event.data as AddToCartResultMessage | null;
        if (!data || data.type !== ADD_TO_CART_RESULT_MESSAGE_TYPE) return;

        clearTimer();
        window.removeEventListener("message", onResult);

        if (data.success) {
          setStatus({ state: "success", method: data.method });
        } else {
          setStatus({
            state: "error",
            message: data.error ?? "Impossible d’ajouter au panier.",
          });
        }
      };

      window.addEventListener("message", onResult);

      timeoutRef.current = setTimeout(() => {
        window.removeEventListener("message", onResult);
        setStatus({ state: "redirect" });
        // Bridge absent / origine non autorisée → panier Oxatis.
        window.top!.location.href = fallbackUrl;
      }, CART_TIMEOUT_MS * cleaned.length);
    },
    [clearTimer],
  );

  const resetStatus = useCallback(() => {
    clearTimer();
    setStatus({ state: "idle" });
  }, [clearTimer]);

  return { addToCart, status, resetStatus };
}
