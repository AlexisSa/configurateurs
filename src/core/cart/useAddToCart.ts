"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ADD_TO_CART_MESSAGE_TYPE,
  ADD_TO_CART_RESULT_MESSAGE_TYPE,
  CART_TIMEOUT_MS,
  OXATIS_ORIGIN,
  type AddToCartResultMessage,
  type OxatisCartItem,
} from "./messages";

export type AddToCartStatus =
  | { state: "idle" }
  | { state: "pending" }
  | { state: "success"; method?: string }
  | { state: "error"; message: string };

function isOxatisOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "xeilom.fr" || host.endsWith(".xeilom.fr");
  } catch {
    return false;
  }
}

/**
 * Ajoute au panier Oxatis via postMessage (iframe + bridge).
 * Ne quitte jamais le configurateur : notification succès / erreur uniquement.
 */
export function useAddToCart() {
  const [status, setStatus] = useState<AddToCartStatus>({ state: "idle" });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (dismissRef.current) {
      clearTimeout(dismissRef.current);
      dismissRef.current = null;
    }
  }, []);

  const scheduleAutoDismiss = useCallback(() => {
    if (dismissRef.current) clearTimeout(dismissRef.current);
    dismissRef.current = setTimeout(() => {
      setStatus({ state: "idle" });
    }, 4500);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

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
        scheduleAutoDismiss();
        return;
      }

      const inIframe =
        typeof window !== "undefined" && window.parent !== window;

      if (!inIframe) {
        setStatus({
          state: "error",
          message:
            "L’ajout au panier est disponible depuis la boutique en ligne.",
        });
        scheduleAutoDismiss();
        return;
      }

      clearTimers();
      setStatus({ state: "pending" });

      const payload = {
        type: ADD_TO_CART_MESSAGE_TYPE,
        items: cleaned,
        productId: cleaned[0].productId,
        quantity: cleaned[0].quantity,
      };

      window.parent.postMessage(payload, OXATIS_ORIGIN);

      const onResult = (event: MessageEvent) => {
        if (!isOxatisOrigin(event.origin)) return;
        const data = event.data as AddToCartResultMessage | null;
        if (!data || data.type !== ADD_TO_CART_RESULT_MESSAGE_TYPE) return;

        clearTimers();
        window.removeEventListener("message", onResult);

        if (data.success) {
          setStatus({ state: "success", method: data.method });
        } else {
          setStatus({
            state: "error",
            message: data.error ?? "Impossible d’ajouter au panier.",
          });
        }
        scheduleAutoDismiss();
      };

      window.addEventListener("message", onResult);

      timeoutRef.current = setTimeout(() => {
        window.removeEventListener("message", onResult);
        setStatus({
          state: "error",
          message:
            "Le panier n’a pas répondu. Réessayez dans un instant.",
        });
        scheduleAutoDismiss();
      }, CART_TIMEOUT_MS * cleaned.length);
    },
    [clearTimers, scheduleAutoDismiss],
  );

  const resetStatus = useCallback(() => {
    clearTimers();
    setStatus({ state: "idle" });
  }, [clearTimers]);

  return { addToCart, status, resetStatus };
}
