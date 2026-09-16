"use client";

import type { AddToCartStatus } from "./useAddToCart";

/** Bannière de notification panier (reste dans le configurateur). */
export function CartNotification({ status }: { status: AddToCartStatus }) {
  if (status.state === "idle") return null;

  const styles =
    status.state === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : status.state === "error"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-zinc-200 bg-zinc-50 text-zinc-800";

  const message =
    status.state === "pending"
      ? "Ajout au panier en cours…"
      : status.state === "success"
        ? "Produit ajouté au panier."
        : status.message;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-md border px-3 py-2 text-sm ${styles}`}
    >
      {message}
    </div>
  );
}
