import type { ComponentType } from "react";

/**
 * Registre des configurateurs exposés au hub.
 * Chaque module s’enregistre ici — sans importer les autres configurateurs entre eux.
 */
export type ConfiguratorMeta = {
  id: string;
  slug: string;
  title: string;
  description: string;
};

export type ConfiguratorModule = ConfiguratorMeta & {
  Component: ComponentType;
};

export const CONFIGURATOR_METAS: ConfiguratorMeta[] = [
  {
    id: "stub",
    slug: "stub",
    title: "Exemple de configuration",
    description: "Parcours de démonstration pour tester l’outil.",
  },
];

export function getConfiguratorMeta(slug: string): ConfiguratorMeta | undefined {
  return CONFIGURATOR_METAS.find((entry) => entry.slug === slug);
}
