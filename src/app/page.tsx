"use client";

import Link from "next/link";
import { useClientContext } from "@/core/client-context/ClientProvider";
import { Heading, Text } from "@/core/design-system";
import { CONFIGURATOR_METAS } from "@/core/registry";

/** Vignettes hub = photos catalogue Oxatis (SKU représentatifs). */
const CONFIGURATOR_VISUAL: Record<
  string,
  { accent: string; label: string; image: string; imageAlt: string }
> = {
  "cordon-rj45": {
    accent: "from-sky-50 to-white",
    label: "Cordons",
    image:
      "https://www.xeilom.fr/Files/126457/Img/02/CR6ASSTPOHxxGS-1-big.png",
    imageAlt: "Cordon RJ45 Cat. 6A S/FTP — CR6ASSTPOH1GS",
  },
  "cable-rj45": {
    accent: "from-emerald-50 to-white",
    label: "Câbles",
    image: "https://www.xeilom.fr/Files/126457/Img/20/UK310100_1.png",
    imageAlt: "Câble informatique Cat. 6A — UK310100",
  },
};

export default function HomePage() {
  const { isEmbed } = useClientContext();
  const embedQuery = isEmbed ? "?embed=1" : "";

  return (
    <main
      className={`mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 ${
        isEmbed ? "py-5" : "py-12"
      }`}
    >
      <header className={isEmbed ? "mb-6" : "mb-10"}>
        <Heading level={1}>Configurateurs</Heading>
        <Text muted className="mt-2 max-w-xl text-base leading-relaxed">
          Sélectionnez une famille de produits, affinez les caractéristiques,
          puis ajoutez la référence au panier.
        </Text>
      </header>

      <ul className="grid gap-5 sm:grid-cols-2">
        {CONFIGURATOR_METAS.map((item) => {
          const visual = CONFIGURATOR_VISUAL[item.id] ?? {
            accent: "from-zinc-50 to-white",
            label: "Produit",
            image: "",
            imageAlt: item.title,
          };

          return (
            <li key={item.id}>
              <Link
                href={`/configurators/${item.slug}${embedQuery}`}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-brand/40 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div
                  className={`flex items-center gap-4 border-b border-zinc-100 bg-gradient-to-br px-5 py-5 ${visual.accent}`}
                >
                  {visual.image ? (
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element -- URLs Oxatis externes */}
                      <img
                        src={visual.image}
                        alt={visual.imageAlt}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-contain"
                      />
                    </span>
                  ) : null}
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {visual.label}
                    </span>
                    <h2 className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
                      {item.title}
                    </h2>
                  </span>
                </div>

                <div className="flex flex-1 flex-col gap-4 px-5 py-5">
                  <p className="text-sm leading-relaxed text-zinc-600">
                    {item.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                    Ouvrir le configurateur
                    <span
                      aria-hidden
                      className="transition group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
