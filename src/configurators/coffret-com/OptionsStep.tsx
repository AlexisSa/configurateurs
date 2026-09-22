"use client";

import { Card, Heading, QuantityStepper, Text } from "@/core/design-system";
import {
  getGamme,
  getOption,
  getOptionGroup,
  type CatalogOption,
} from "./catalog";
import { OptionAccordion } from "./OptionAccordion";
import { ProductThumb } from "./ProductThumb";
import type { CompatibilityResult } from "./compatibility";
import type { ConfigState } from "./configState";

const chipClass = (active: boolean) =>
  `rounded-md border px-2.5 py-1.5 text-sm transition ${
    active
      ? "border-brand bg-brand text-white"
      : "border-zinc-300 bg-white hover:bg-zinc-50"
  }`;

type OptionsStepProps = {
  state: ConfigState;
  compatibility: CompatibilityResult;
  imageBySku: Map<string, string>;
  isGroupConfigured: (groupId: string) => boolean;
  onSetOption: (groupId: string, value: string) => void;
};

function noneOptionId(options: CatalogOption[]): string | undefined {
  return options.find((o) => o.isNone)?.id;
}

function selectionLabel(
  groupId: string,
  state: ConfigState,
  options: CatalogOption[],
): string | null {
  const raw = state.options[groupId];
  if (raw == null || raw === "") return null;
  const group = getOptionGroup(groupId);
  if (group?.type === "quantity") {
    const n = Number(raw);
    if (!Number.isFinite(n) || n === 0) return "Aucun";
    return String(n);
  }
  const option = getOption(raw) ?? options.find((o) => o.id === raw);
  if (!option) return null;
  if (option.isNone) return "Aucun";
  return option.label;
}

/**
 * Options en accordéons + inclus.
 */
export function OptionsStep({
  state,
  compatibility,
  imageBySku,
  isGroupConfigured,
  onSetOption,
}: OptionsStepProps) {
  const gamme = getGamme(state.gammeId);
  if (!gamme) return null;

  const maxRj45 = gamme.attributes.maxRj45;
  const rj45Presets = (getOptionGroup("rj45")?.presets ?? []).filter(
    (n) => n <= maxRj45,
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div>
          <Heading level={2}>Options</Heading>
          <Text muted className="mt-1 text-sm">
            Cliquez sur « Aucun » ou choisissez une option pour continuer.
          </Text>
        </div>

        {gamme.includedItems.length > 0 && (
          <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
            <Heading level={3}>Déjà inclus</Heading>
            <ul className="mt-1 list-inside list-disc text-sm text-zinc-700">
              {gamme.includedItems.map((item) => (
                <li key={item.id}>{item.label}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {compatibility.visibleGroupIds.map((groupId, index) => {
            const group = getOptionGroup(groupId);
            if (!group) return null;
            const options = compatibility.optionsByGroup[groupId] ?? [];
            const configured = isGroupConfigured(groupId);
            const clearId = noneOptionId(options);
            const label = selectionLabel(groupId, state, options);
            const hint =
              groupId === "brassage" &&
              state.options.brassage === "brassage-interieur"
                ? "Pré-sélectionné : Brassage intérieur"
                : !configured
                  ? group.type === "quantity"
                    ? "Choisissez une quantité ou cliquez sur « Aucun » pour continuer"
                    : "Cliquez sur « Aucun » ou choisissez une option pour continuer"
                  : label
                    ? `Sélection : ${label}`
                    : undefined;

            return (
              <OptionAccordion
                key={groupId}
                title={group.label}
                description={group.description}
                hint={hint}
                configured={configured}
                defaultOpen={index === 0}
                showClear={group.optional !== false}
                clearActive={
                  group.type === "quantity"
                    ? Number(state.options[groupId] ?? 0) === 0 &&
                      state.options[groupId] != null
                    : Boolean(clearId && state.options[groupId] === clearId)
                }
                onClear={() => {
                  if (group.type === "quantity") {
                    onSetOption(groupId, "0");
                  } else if (clearId) {
                    onSetOption(groupId, clearId);
                  }
                }}
              >
                {groupId === "rj45" ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <ProductThumb
                        src={imageBySku.get("KJ6AFSEF1")}
                        alt="Embase RJ45"
                        size="sm"
                      />
                      <Text className="text-xs text-zinc-500">
                        Embase RJ45 Cat. 6A · KJ6AFSEF1
                      </Text>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={chipClass(
                          Number(state.options.rj45 ?? -1) === 0 &&
                            state.options.rj45 != null,
                        )}
                        onClick={() => onSetOption("rj45", "0")}
                      >
                        Aucun
                      </button>
                      {rj45Presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          className={chipClass(
                            Number(state.options.rj45) === preset,
                          )}
                          onClick={() => onSetOption("rj45", String(preset))}
                        >
                          {preset} embases
                        </button>
                      ))}
                    </div>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="text-zinc-600">Autre quantité</span>
                      <QuantityStepper
                        value={Number(state.options.rj45 ?? 0)}
                        min={0}
                        max={maxRj45}
                        onChange={(n) => onSetOption("rj45", String(n))}
                      />
                    </label>
                  </div>
                ) : group.type === "quantity" ? (
                  <div className="flex flex-col gap-3">
                    {groupId === "cordon_rj45" && (
                      <div className="flex items-center gap-3">
                        <ProductThumb
                          src={imageBySku.get("CR6ASSTPOH0.5GS")}
                          alt="Cordon RJ45"
                          size="sm"
                        />
                        <Text className="text-xs text-zinc-500">
                          Cordon RJ45 0,50 m · CR6ASSTPOH0.5GS
                        </Text>
                      </div>
                    )}
                    {groupId === "prise" && (
                      <div className="flex items-center gap-3">
                        <ProductThumb
                          src={imageBySku.get("PC45X45")}
                          alt="Prise 2P+T"
                          size="sm"
                        />
                        <Text className="text-xs text-zinc-500">
                          Prise 2P+T · PC45X45
                        </Text>
                      </div>
                    )}
                    <QuantityStepper
                      value={Number(state.options[groupId] ?? 0)}
                      min={group.min ?? 0}
                      max={group.max}
                      onChange={(n) => onSetOption(groupId, String(n))}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {options.map((option) => {
                      const selected = state.options[groupId] === option.id;
                      const imageUrl = option.sku
                        ? imageBySku.get(option.sku)
                        : undefined;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => onSetOption(groupId, option.id)}
                          className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm ${
                            selected
                              ? "border-brand bg-brand text-white"
                              : "border-zinc-200 bg-white hover:bg-zinc-50"
                          }`}
                        >
                          {!option.isNone && (
                            <ProductThumb
                              src={imageUrl}
                              alt={option.label}
                              selected={selected}
                              size="sm"
                            />
                          )}
                          <span className="min-w-0">
                            <span className="block font-medium">
                              {option.label}
                            </span>
                            {option.sku ? (
                              <span
                                className={`mt-0.5 block text-xs ${
                                  selected ? "text-white/75" : "text-zinc-500"
                                }`}
                              >
                                {option.sku}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </OptionAccordion>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
