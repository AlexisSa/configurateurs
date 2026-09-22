import catalogJson from "./data/catalog.json";

export type OptionGroupType = "single" | "quantity";

export type CatalogMateriau = {
  id: string;
  label: string;
  skuSuffix?: string;
};

export type GammeAttributes = {
  maxRj45: number;
  porteMode: "non" | "included" | "option";
  capotMode: "non" | "option";
  priseMode: "option" | "included" | "non";
  priseCount?: number;
  largeurMm?: number;
  hauteurMm?: number;
};

export type IncludedItem = {
  id: string;
  label: string;
};

export type CatalogGamme = {
  id: string;
  label: string;
  baseSku: string;
  imageSku?: string;
  unitPriceHT?: number;
  description?: string;
  dimensions?: string;
  materiaux: CatalogMateriau[];
  optionGroups: string[];
  specificOptionGroups: string[];
  attributes: GammeAttributes;
  includedItems: IncludedItem[];
  maxCoffretCount?: number;
};

export type CatalogOptionGroup = {
  label: string;
  type: OptionGroupType;
  optional?: boolean;
  description?: string;
  min?: number;
  max?: number;
  presets?: number[];
};

export type OptionRules = {
  excludeOptions?: string[];
  compatibleGammes?: string[];
  incompatibleGammes?: string[];
  chassisSkuSuffix?: string;
  maxPerConfig?: number;
  requireAttribute?: Partial<
    Record<"porteMode" | "capotMode" | "priseMode", string>
  >;
};

export type CatalogOption = {
  id: string;
  group: string;
  label: string;
  sku: string;
  unitPriceHT?: number;
  virtual?: boolean;
  isNone?: boolean;
  rules?: OptionRules;
};

export type CatalogComponent = {
  sku: string;
  skuLot24?: string;
  label: string;
};

export type CatalogRuleIf = {
  attribute: keyof GammeAttributes;
  eq?: string;
  neq?: string;
};

export type CatalogRule = {
  id: string;
  if: CatalogRuleIf;
  hideGroups: string[];
};

export type GammeSegment = {
  id: string;
  label: string;
  items: string[];
};

export type Catalog = {
  meta: {
    brand: string;
    productLine?: string;
    tvaRate: number;
    currency: string;
  };
  gammeSegments: GammeSegment[];
  gammes: CatalogGamme[];
  optionGroups: Record<string, CatalogOptionGroup>;
  options: CatalogOption[];
  components: Record<string, CatalogComponent>;
  rules: CatalogRule[];
};

export const catalog = catalogJson as Catalog;

export function listSegments(): GammeSegment[] {
  return catalog.gammeSegments;
}

export function listGammes(): CatalogGamme[] {
  return catalog.gammes;
}

export function getGamme(gammeId: string): CatalogGamme | undefined {
  return catalog.gammes.find((g) => g.id === gammeId);
}

export function getMateriau(
  gammeId: string,
  materiauId: string,
): CatalogMateriau | undefined {
  return getGamme(gammeId)?.materiaux.find((m) => m.id === materiauId);
}

export function getOptionGroup(
  groupId: string,
): CatalogOptionGroup | undefined {
  return catalog.optionGroups[groupId];
}

export function getOption(optionId: string): CatalogOption | undefined {
  return catalog.options.find((o) => o.id === optionId);
}

export function listOptionsForGroup(groupId: string): CatalogOption[] {
  return catalog.options.filter((o) => o.group === groupId);
}

export function getComponent(
  componentId: string,
): CatalogComponent | undefined {
  return catalog.components[componentId];
}

export function listRules(): CatalogRule[] {
  return catalog.rules;
}

/** Groupes de la gamme : brassage en premier s’il existe, puis communs, puis spécifiques. */
export function listGammeGroupIds(gamme: CatalogGamme): string[] {
  const specific = gamme.specificOptionGroups ?? [];
  const common = gamme.optionGroups ?? [];
  const ordered: string[] = [];
  if (specific.includes("brassage")) ordered.push("brassage");
  for (const id of common) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  for (const id of specific) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

export function hasIncludedItem(gamme: CatalogGamme, itemId: string): boolean {
  return gamme.includedItems.some((item) => item.id === itemId);
}
