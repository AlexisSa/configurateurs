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

const PARENT_ORIGINS = [
  OXATIS_ORIGIN,
  "https://xeilom.fr",
] as const;

function isOxatisOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname;
    return host === "xeilom.fr" || host.endsWith(".xeilom.fr");
  } catch {
    return false;
  }
}

/** Origine réelle du parent (referrer / ancestorOrigins), sinon null. */
function resolveParentOrigin(): string | null {
  if (typeof window === "undefined") return null;

  const ancestors = (
    window.location as Location & { ancestorOrigins?: DOMStringList }
  ).ancestorOrigins;
  if (ancestors && ancestors.length > 0) {
    try {
      return new URL(ancestors[0]).origin;
    } catch {
      /* ignore */
    }
  }

  if (document.referrer) {
    try {
      const origin = new URL(document.referrer).origin;
      if (isOxatisOrigin(origin)) return origin;
    } catch {
      /* ignore */
    }
  }

  return null;
}

function postCartToParent(payload: object) {
  const targets = new Set<string>();
  const resolved = resolveParentOrigin();
  if (resolved) targets.add(resolved);
  for (const origin of PARENT_ORIGINS) targets.add(origin);

  for (const origin of targets) {
    window.parent.postMessage(payload, origin);
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

      postCartToParent(payload);

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
      }, CART_TIMEOUT_MS * Math.max(1, cleaned.length));
    },
    [clearTimers, scheduleAutoDismiss],
  );

  const resetStatus = useCallback(() => {
    clearTimers();
    setStatus({ state: "idle" });
  }, [clearTimers]);

  return { addToCart, status, resetStatus };
}
