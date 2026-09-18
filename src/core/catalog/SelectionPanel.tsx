"use client";

import { CartNotification } from "@/core/cart/CartNotification";
import type { AddToCartStatus } from "@/core/cart/useAddToCart";
import { Button, Card, Heading, StockPill, Text } from "@/core/design-system";
import { OxatisProductLink } from "@/core/oxatis/OxatisProductLink";
import type { StockStatus } from "@/core/payload/types";
import { useState } from "react";

/**
 * Colonne droite : produit sélectionné + quantité / prix / panier.
 */
export function SelectionPanel({
  label,
  sku,
  imageUrl,
  unitPrice,
  lineTotal,
  quantity,
  onQuantityChange,
  stockStatus,
  qtyInStock,
  oxatisId,
  isEmbed,
  onAddToCart,
  cartStatus,
}: {
  label: string;
  sku: string;
  imageUrl: string | null | undefined;
  unitPrice: number | null;
  lineTotal: number | null;
  quantity: number;
  onQuantityChange: (value: number) => void;
  stockStatus: StockStatus;
  qtyInStock: number;
  oxatisId: number | null;
  isEmbed: boolean;
  onAddToCart: () => void;
  cartStatus: AddToCartStatus;
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-4">
      <Heading level={2}>Sélection</Heading>

      <div className="flex gap-3">
        <SelectionThumb src={imageUrl} alt={label} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-zinc-900">
            {label}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{sku}</p>
          <div className="mt-2">
            <StockPill status={stockStatus} qtyInStock={qtyInStock} />
          </div>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800">Quantité</span>
        <input
          type="number"
          min={1}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2"
          value={quantity}
          onChange={(e) => onQuantityChange(Number(e.target.value))}
        />
      </label>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
        <div className="text-sm">
          <span className="text-zinc-500">Unitaire HT</span>
          <p className="mt-0.5 font-semibold tabular-nums text-zinc-900">
            {unitPrice == null ? "—" : `${unitPrice.toFixed(2)} €`}
          </p>
        </div>
        <div className="text-sm">
          <span className="text-zinc-500">Total HT</span>
          <p className="mt-0.5 font-semibold tabular-nums text-brand">
            {lineTotal == null ? "—" : `${lineTotal.toFixed(2)} €`}
          </p>
        </div>
      </div>

      <Button
        className="w-full"
        onClick={onAddToCart}
        disabled={!oxatisId || cartStatus.state === "pending"}
      >
        Ajouter au panier
      </Button>

      {oxatisId ? (
        <OxatisProductLink
          oxatisId={oxatisId}
          isEmbed={isEmbed}
          className="!m-0 self-start"
        />
      ) : (
        <Text muted className="text-sm">
          Cette référence ne peut pas être ajoutée au panier pour le moment.
        </Text>
      )}

      <CartNotification status={cartStatus} />
    </Card>
  );
}

function SelectionThumb({
  src,
  alt,
}: {
  src: string | null | undefined;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white">
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
