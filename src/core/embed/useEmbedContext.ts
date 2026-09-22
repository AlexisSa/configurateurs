"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { isAllowedEmbedOrigin } from "./embedOrigins";
import {
  EMBED_CONTEXT_MESSAGE_TYPE,
  EMBED_REQUEST_CONTEXT_MESSAGE_TYPE,
  type EmbedContextMessage,
} from "./messages";
import {
  isPricingTierCode,
  resolvePricingTierCode,
  type PricingTierCode,
} from "@/core/pricing/pricingTiers";

function subscribeSearch(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}

function getSearchSnapshot() {
  return window.location.search;
}

function getServerSearchSnapshot() {
  return "";
}

/**
 * Reçoit le contexte tarifaire Oxatis (URL + postMessage).
 * Demande le contexte au parent dès que l’écouteur est prêt (évite la course au load).
 */
export function useEmbedContext(): {
  pricingTierCode: PricingTierCode;
  categoryId: string | null;
  isEmbed: boolean;
} {
  const search = useSyncExternalStore(
    subscribeSearch,
    getSearchSnapshot,
    getServerSearchSnapshot,
  );

  const fromUrl = useMemo(() => {
    const params = new URLSearchParams(search);
    const direct = params.get("pricingTier");
    const tier =
      direct && isPricingTierCode(direct.toUpperCase())
        ? (direct.toUpperCase() as PricingTierCode)
        : resolvePricingTierCode(params.get("categoryId"));
    return {
      pricingTierCode: tier,
      categoryId: params.get("categoryId"),
      isEmbed: params.get("embed") === "1" || params.get("embed") === "true",
    };
  }, [search]);

  const [fromParent, setFromParent] = useState<{
    pricingTierCode: PricingTierCode;
    categoryId: string | null;
  } | null>(null);
  const fromParentRef = useRef(fromParent);
  fromParentRef.current = fromParent;

  const applyContext = useCallback((message: EmbedContextMessage) => {
    if (message.pricingTier && isPricingTierCode(message.pricingTier.toUpperCase())) {
      setFromParent({
        pricingTierCode: message.pricingTier.toUpperCase() as PricingTierCode,
        categoryId: message.categoryId != null ? String(message.categoryId) : null,
      });
      return;
    }
    if (message.categoryId != null && String(message.categoryId).trim() !== "") {
      setFromParent({
        categoryId: String(message.categoryId),
        pricingTierCode: resolvePricingTierCode(message.categoryId),
      });
    }
  }, []);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (!isAllowedEmbedOrigin(event.origin)) return;
      const data = event.data as EmbedContextMessage | null;
      if (!data || data.type !== EMBED_CONTEXT_MESSAGE_TYPE) return;
      applyContext(data);
    }

    window.addEventListener("message", onMessage);

    function requestContext() {
      if (fromParentRef.current) return;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(
          { type: EMBED_REQUEST_CONTEXT_MESSAGE_TYPE },
          "*",
        );
      }
    }

    // oxInfos.catid côté parent est souvent dispo après le 1er paint
    requestContext();
    const timers = [400, 1000, 2000, 4000, 8000].map((ms) =>
      window.setTimeout(requestContext, ms),
    );

    return () => {
      window.removeEventListener("message", onMessage);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [applyContext]);

  return {
    pricingTierCode: fromParent?.pricingTierCode ?? fromUrl.pricingTierCode,
    categoryId: fromParent?.categoryId ?? fromUrl.categoryId,
    isEmbed: fromUrl.isEmbed,
  };
}
