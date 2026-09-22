"use client";

import { useClientContext } from "@/core/client-context/ClientProvider";
import { Text } from "@/core/design-system";
import { downloadQuotePdf } from "@/core/pdf";
import { getPricingTierLabel } from "@/core/pricing/pricingTiers";
import { buildCoffretComPdfDocument } from "./buildPdfDocument";
import { GammeStep } from "./GammeStep";
import { NomenclaturePanel } from "./NomenclaturePanel";
import { OptionsStep } from "./OptionsStep";
import { useCoffretConfiguration } from "./useCoffretConfiguration";

/**
 * Configurateur coffrets — UI alignée référence Vite, style hub Next.
 */
export function CoffretComConfigurator() {
  const { pricingTierCode } = useClientContext();
  const {
    segments,
    gammes,
    state,
    compatibility,
    complete,
    ready,
    pricedBom,
    unitPricing,
    orderTotal,
    configRef,
    pricesStatus,
    imageBySku,
    setGammeId,
    setCoffretCount,
    setOptionValue,
    resetConfiguration,
    applyLogicalRef,
    isGroupConfigured,
  } = useCoffretConfiguration(pricingTierCode);

  function handleExportPdf() {
    if (!ready || pricedBom.length === 0) return;
    const doc = buildCoffretComPdfDocument({
      state,
      pricedBom,
      orderTotal,
      pricingTierCode,
      configRef,
      imageBySku,
    });
    const refSlug = (configRef ?? state.gammeId).replace(
      /[^a-zA-Z0-9_-]/g,
      "_",
    );
    void downloadQuotePdf(doc, `devis-coffret-${refSlug}.pdf`);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <Text className="text-sm text-zinc-600">
          XH&apos;system · Grade 3 TV · {getPricingTierLabel(pricingTierCode)}
        </Text>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <GammeStep
            segments={segments}
            gammes={gammes}
            selectedId={state.gammeId}
            imageBySku={imageBySku}
            onSelect={setGammeId}
          />

          {complete && (
            <OptionsStep
              state={state}
              compatibility={compatibility}
              imageBySku={imageBySku}
              isGroupConfigured={isGroupConfigured}
              onSetOption={setOptionValue}
              onSetCoffretCount={setCoffretCount}
            />
          )}
        </div>

        <NomenclaturePanel
          hasGamme={Boolean(state.gammeId)}
          ready={ready}
          pricedBom={pricedBom}
          unitTotal={unitPricing.total}
          orderTotal={orderTotal}
          coffretCount={state.coffretCount}
          configRef={configRef}
          pricingTierCode={pricingTierCode}
          pricesLoading={pricesStatus === "loading"}
          missingSkus={unitPricing.missingSkus}
          onReset={resetConfiguration}
          onExportPdf={handleExportPdf}
          onApplyRef={applyLogicalRef}
        />
      </div>
    </div>
  );
}
