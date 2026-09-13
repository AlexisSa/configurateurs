"use client";

import Link from "next/link";
import { useClientContext } from "@/core/client-context/ClientProvider";
import { Card, Heading, Text } from "@/core/design-system";
import { CONFIGURATOR_METAS } from "@/core/registry";

export default function HomePage() {
  const { isEmbed, tariffLabel } = useClientContext();

  return (
    <main
      className={`mx-auto w-full max-w-4xl flex-1 px-4 py-10 ${isEmbed ? "py-4" : ""}`}
    >
      {!isEmbed && (
        <header className="mb-10">
          <Heading level={1}>Configurateurs</Heading>
          <Text muted className="mt-2">
            Choisissez un produit à configurer. {tariffLabel}.
          </Text>
        </header>
      )}

      {isEmbed && (
        <Text muted className="mb-4 text-sm">
          {tariffLabel}
        </Text>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {CONFIGURATOR_METAS.map((item) => (
          <li key={item.id}>
            <Card className="h-full">
              <Heading level={2}>{item.title}</Heading>
              <Text muted className="mt-2 text-sm">
                {item.description}
              </Text>
              <Link
                href={`/configurators/${item.slug}`}
                className="mt-4 inline-flex text-sm font-medium text-zinc-900 underline-offset-4 hover:underline"
              >
                Configurer
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}
