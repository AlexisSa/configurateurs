"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useClientContext } from "@/core/client-context/ClientProvider";
import { Heading, Text } from "@/core/design-system";
import { getConfiguratorMeta } from "@/core/registry";
import CordonRj45Configurator from "@/configurators/cordon-rj45";
import CableRj45Configurator from "@/configurators/cable-rj45";
import CoffretComConfigurator from "@/configurators/coffret-com";

function ConfiguratorSlot({ slug }: { slug: string }) {
  // Switch explicite : évite de « créer » un composant pendant le render.
  switch (slug) {
    case "cordon-rj45":
      return <CordonRj45Configurator />;
    case "cable-rj45":
      return <CableRj45Configurator />;
    case "coffret-com":
      return <CoffretComConfigurator />;
    default:
      return null;
  }
}

function buildHubHref(ctx: {
  isEmbed: boolean;
  categoryId: string | null;
  pricingTierCode: string;
}): string {
  const q = new URLSearchParams();
  if (ctx.isEmbed) q.set("embed", "1");
  if (ctx.categoryId) q.set("categoryId", ctx.categoryId);
  if (ctx.pricingTierCode) q.set("pricingTier", ctx.pricingTierCode);
  const qs = q.toString();
  return qs ? `/?${qs}` : "/";
}

export default function ConfiguratorPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { isEmbed, categoryId, pricingTierCode } = useClientContext();
  const meta = getConfiguratorMeta(slug);

  if (!meta) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Heading level={1}>Page introuvable</Heading>
        <Text muted className="mt-2">
          Ce configurateur n’est pas disponible.
        </Text>
        <Link href="/" className="mt-4 inline-block text-sm underline">
          Retour
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4">
      <header className="mb-4 flex items-center gap-3">
        <Link
          href={buildHubHref({ isEmbed, categoryId, pricingTierCode })}
          className="shrink-0 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-sm font-medium text-zinc-800 hover:border-brand/40 hover:bg-brand-muted hover:text-brand"
        >
          ← Retour
        </Link>
        <Heading level={1}>{meta.title}</Heading>
      </header>
      <ConfiguratorSlot slug={slug} />
    </main>
  );
}
