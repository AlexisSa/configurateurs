"use client";

type ProductThumbProps = {
  src?: string | null;
  alt: string;
  selected?: boolean;
  size?: "sm" | "md";
};

/** Vignette produit — fallback lettre si pas d’image. */
export function ProductThumb({
  src,
  alt,
  selected = false,
  size = "md",
}: ProductThumbProps) {
  const dim = size === "sm" ? "h-10 w-10" : "h-14 w-14";

  if (!src) {
    return (
      <span
        className={`flex ${dim} shrink-0 items-center justify-center rounded border text-xs font-medium ${
          selected
            ? "border-white/30 bg-white/15 text-white"
            : "border-zinc-200 bg-zinc-100 text-zinc-500"
        }`}
        aria-hidden
      >
        {alt.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- URLs Oxatis externes
    <img
      src={src}
      alt=""
      loading="lazy"
      className={`${dim} shrink-0 rounded border object-contain ${
        selected ? "border-white/30 bg-white" : "border-zinc-200 bg-white"
      }`}
    />
  );
}
