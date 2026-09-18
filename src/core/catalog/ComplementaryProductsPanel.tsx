"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { CartNotification } from "@/core/cart/CartNotification";
import { useAddToCart } from "@/core/cart/useAddToCart";
import {
  fetchRelatedProducts,
  relatedUnitPrice,
  type RelatedProduct,
} from "@/core/catalog/fetchRelatedProducts";
import { useClientContext } from "@/core/client-context/ClientProvider";
import {
  Button,
  Card,
  Heading,
  QuantityStepper,
  Spinner,
  Text,
} from "@/core/design-system";
import { OxatisProductLink } from "@/core/oxatis/OxatisProductLink";
import { getSupabaseBrowserClient } from "@/core/supabase/client";

type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; products: RelatedProduct[] }
  | { status: "error"; message: string };

/**
 * Panneau articles complémentaires (droite des résultats).
 */
export function ComplementaryProductsPanel({
  productId,
}: {
  productId: string | null | undefined;
}) {
  const { pricingTierCode, isEmbed } = useClientContext();
  const { addToCart, status: cartStatus, resetStatus } = useAddToCart();
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!productId) {
      setState({ status: "idle" });
      setQuantities({});
      return;
    }

    let cancelled = false;
    setState({ status: "loading" });
    setQuantities({});

    const client = getSupabaseBrowserClient();
    if (!client) {
      setState({
        status: "error",
        message: "Client Supabase indisponible.",
      });
      return;
    }

    fetchRelatedProducts(client, productId)
      .then((products) => {
        if (cancelled) return;
        setState({ status: "ready", products });
        setQuantities(
          Object.fromEntries(products.map((product) => [product.id, 1])),
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              err instanceof Error ? err.message : "Chargement impossible",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!productId) return null;

  return (
    <Card className="flex min-w-0 flex-col gap-3">
      <div>
        <Heading level={2}>Complémentaires</Heading>
        <Text muted className="mt-1 text-sm">
          Suggestions liées à la référence sélectionnée.
        </Text>
      </div>

      {state.status === "loading" && (
        <Spinner label="Chargement…" className="py-6" />
      )}

      {state.status === "error" && (
        <Text muted className="text-sm">
          Impossible de charger les articles complémentaires.
        </Text>
      )}

      {state.status === "ready" && state.products.length === 0 && (
        <Text muted className="text-sm">
          Aucun article complémentaire pour cette référence.
        </Text>
      )}

      {state.status === "ready" && state.products.length > 0 && (
        <>
          <ul className="flex max-h-[36rem] flex-col gap-3 overflow-y-auto">
            {state.products.map((product) => {
              const price = relatedUnitPrice(product, pricingTierCode);
              const quantity = quantities[product.id] ?? 1;
              const lineTotal =
                price == null
                  ? null
                  : price * Math.max(1, Math.floor(quantity) || 1);

              return (
                <li
                  key={product.id}
                  className="rounded-lg border border-zinc-200 bg-white p-3"
                >
                  <div className="flex gap-3">
                    <RelatedThumb src={product.imageUrl} alt={product.label} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug text-zinc-900">
                        {product.label}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {product.sku}
                      </p>
                      <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900">
                        {price == null
                          ? "—"
                          : `${price.toFixed(2)} € HT`}
                        {lineTotal != null && quantity > 1 ? (
                          <span className="ml-1.5 font-medium text-brand">
                            · {lineTotal.toFixed(2)} €
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <QuantityStepper
                      size="sm"
                      value={quantity}
                      onChange={(value) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [product.id]: value,
                        }))
                      }
                    />
                    <Button
                      className="gap-1.5 !px-2.5 !py-1.5 text-xs"
                      disabled={
                        !product.oxatisId || cartStatus.state === "pending"
                      }
                      onClick={() => {
                        if (!product.oxatisId) return;
                        resetStatus();
                        addToCart([
                          {
                            productId: product.oxatisId,
                            quantity,
                          },
                        ]);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Panier
                    </Button>
                    {product.oxatisId ? (
                      <OxatisProductLink
                        oxatisId={product.oxatisId}
                        isEmbed={isEmbed}
                        className="!m-0"
                      />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <CartNotification status={cartStatus} />
        </>
      )}
    </Card>
  );
}

function RelatedThumb({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white">
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- URLs Oxatis externes
        <img
          src={src!}
          alt={alt}
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[10px] text-zinc-400">N/A</span>
      )}
    </span>
  );
}
