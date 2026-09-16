"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useClientContext } from "@/core/client-context/ClientProvider";
import { Heading, Text } from "@/core/design-system";
import { getConfiguratorMeta } from "@/core/registry";
import StubConfigurator from "@/configurators/stub";
import CordonRj45Configurator from "@/configurators/cordon-rj45";
import CableRj45Configurator from "@/configurators/cable-rj45";

function ConfiguratorSlot({ slug }: { slug: string }) {
  // Switch explicite : évite de « créer » un composant pendant le render.
  switch (slug) {
    case "stub":
      return <StubConfigurator />;
    case "cordon-rj45":
      return <CordonRj45Configurator />;
    case "cable-rj45":
      return <CableRj45Configurator />;
    default:
      return null;
  }
}

export default function ConfiguratorPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { isEmbed } = useClientContext();
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
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      {!isEmbed && (
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← Retour
        </Link>
      )}
      <ConfiguratorSlot slug={slug} />
    </main>
  );
}
