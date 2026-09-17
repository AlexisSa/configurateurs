/** Indicateur de chargement — rond animé. */
export function Spinner({
  label = "Chargement…",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 py-10 ${className}`}
    >
      <span
        className="h-9 w-9 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-800"
        aria-hidden
      />
      <span className="text-sm text-zinc-500">{label}</span>
    </div>
  );
}
