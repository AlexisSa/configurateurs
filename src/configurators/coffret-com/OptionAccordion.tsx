"use client";

import { useId, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";

type OptionAccordionProps = {
  title: string;
  description?: string;
  hint?: string;
  configured?: boolean;
  defaultOpen?: boolean;
  showClear?: boolean;
  /** Libellé du bouton de choix explicite « pas de produit » (défaut : Sans option). */
  clearLabel?: string;
  clearActive?: boolean;
  onClear?: () => void;
  children: ReactNode;
};

/**
 * Accordion d’option — même logique que la référence Vite, classes hub.
 */
export function OptionAccordion({
  title,
  description,
  hint,
  configured = false,
  defaultOpen = false,
  showClear = false,
  clearLabel = "Sans option",
  clearActive = false,
  onClear,
  children,
}: OptionAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <div
      className={`rounded-md border ${
        configured ? "border-brand/40 bg-brand-muted/20" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-left"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          <span
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
              configured
                ? "border-brand bg-brand text-white"
                : "border-zinc-300 bg-white"
            }`}
            aria-hidden
          >
            {configured ? (
              <Check className="h-3 w-3" strokeWidth={2.5} />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-zinc-900">
              {title}
            </span>
            {description && (
              <span className="mt-0.5 block text-xs text-zinc-500">
                {description}
              </span>
            )}
            {hint && (
              <span className="mt-0.5 block text-xs text-brand">{hint}</span>
            )}
          </span>
          <ChevronDown
            className={`mt-0.5 h-4 w-4 shrink-0 text-zinc-500 transition ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
        {showClear && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-pressed={clearActive}
            aria-label={`${clearLabel} — valider ce groupe sans produit`}
            title="Valider ce groupe sans ajouter de produit"
            className={`shrink-0 self-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
              clearActive
                ? "border-brand bg-brand text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:border-brand/40 hover:bg-brand-muted hover:text-brand"
            }`}
          >
            {clearLabel}
          </button>
        )}
      </div>
      {open && (
        <div
          id={bodyId}
          role="region"
          className="border-t border-zinc-100 px-3 py-3"
        >
          {children}
        </div>
      )}
    </div>
  );
}
