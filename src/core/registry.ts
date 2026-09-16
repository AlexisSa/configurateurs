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
  {
    id: "cordon-rj45",
    slug: "cordon-rj45",
    title: "Cordons de brassage RJ45",
    description:
      "Configurez un cordon depuis la catégorie Oxatis homonyme (type, cat., couleur, longueur…).",
  },
  {
    id: "cable-rj45",
    slug: "cable-rj45",
    title: "Câble RJ45 informatique",
    description:
      "Configurez un câble réseau depuis la catégorie Oxatis homonyme (type, cat., blindage, gaine…).",
  },
];

export function getConfiguratorMeta(slug: string): ConfiguratorMeta | undefined {
  return CONFIGURATOR_METAS.find((entry) => entry.slug === slug);
}
