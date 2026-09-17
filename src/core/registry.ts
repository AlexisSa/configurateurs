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
    id: "cordon-rj45",
    slug: "cordon-rj45",
    title: "Cordons de brassage RJ45",
    description:
      "Filtrez par type, catégorie, couleur, longueur et blindage pour trouver le cordon adapté.",
  },
  {
    id: "cable-rj45",
    slug: "cable-rj45",
    title: "Câble RJ45 informatique",
    description:
      "Filtrez par euroclasse, type, catégorie, couleur, blindage, gaine et nombre de paires.",
  },
];

export function getConfiguratorMeta(slug: string): ConfiguratorMeta | undefined {
  return CONFIGURATOR_METAS.find((entry) => entry.slug === slug);
}
