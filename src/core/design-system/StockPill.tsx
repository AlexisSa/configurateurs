import type { StockStatus } from "@/core/payload/types";

const STOCK_LABEL: Record<StockStatus, string> = {
  ok: "En stock",
  partial: "Stock partiel ou insuffisant",
  unknown: "Disponibilité à confirmer",
};

export function stockStatusFromQty(qty: number): StockStatus {
  if (!Number.isFinite(qty)) return "unknown";
  return qty > 0 ? "ok" : "partial";
}

/** Pastille stock — compacte dans les listes, normale dans le récap. */
export function StockPill({
  status,
  qtyInStock,
  compact = false,
  selected = false,
}: {
  status: StockStatus;
  qtyInStock?: number;
  compact?: boolean;
  selected?: boolean;
}) {
  const styles: Record<StockStatus, string> = selected
    ? {
        ok: "border-white/30 bg-white/15 text-white",
        partial: "border-amber-200/50 bg-amber-400/20 text-amber-50",
        unknown: "border-white/20 bg-white/10 text-white/80",
      }
    : {
        ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
        partial: "border-amber-200 bg-amber-50 text-amber-900",
        unknown: "border-zinc-200 bg-zinc-100 text-zinc-700",
      };

  const dot: Record<StockStatus, string> = selected
    ? {
        ok: "bg-emerald-300",
        partial: "bg-amber-300",
        unknown: "bg-zinc-300",
      }
    : {
        ok: "bg-emerald-500",
        partial: "bg-amber-500",
        unknown: "bg-zinc-400",
      };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium ${
        compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      } ${styles[status]}`}
    >
      <span
        className={`rounded-full ${compact ? "h-1 w-1" : "h-1.5 w-1.5"} ${dot[status]}`}
        aria-hidden
      />
      {compact
        ? qtyInStock != null
          ? `Stock ${qtyInStock}`
          : STOCK_LABEL[status]
        : `${STOCK_LABEL[status]}${qtyInStock != null ? ` · ${qtyInStock}` : ""}`}
    </span>
  );
}
