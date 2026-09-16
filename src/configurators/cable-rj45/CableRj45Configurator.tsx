"use client";

import { useEffect, useMemo, useState } from "react";
import { useAddToCart } from "@/core/cart/useAddToCart";
import { useClientContext } from "@/core/client-context/ClientProvider";
import { Button, Card, Heading, Text } from "@/core/design-system";
import type { ConfigPayload, StockStatus } from "@/core/payload/types";
import { pickTierPrice } from "@/core/pricing/priceLevels";
import { getStockStatus } from "@/core/stock/getStockStatus";
import { buildCableRj45Payload } from "./buildPayload";
import {
  DEFAULT_FILTERS,
  filterCableProducts,
  findCableProduct,
  resolveFacetFilters,
  type CableFilters,
  type CableProduct,
} from "./catalog";
import { CABLE_CATEGORY_ROOT, loadCableRj45Catalog } from "./loadCatalog";

const STOCK_LABEL: Record<StockStatus, string> = {
  ok: "En stock",
  partial: "Stock partiel ou insuffisant",
  unknown: "Disponibilité à confirmer",
};

const selectClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";

type CatalogState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; products: CableProduct[] };

/**
 * Configurateur câble RJ45 informatique — catalogue = catégorie Oxatis.
 */
export function CableRj45Configurator() {
  const { pricingTierCode, tariffLabel } = useClientContext();
  const { addToCart, status: cartStatus, resetStatus: resetCartStatus } =
    useAddToCart();
  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading" });
  const [filters, setFilters] = useState<CableFilters>(DEFAULT_FILTERS);
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [summary, setSummary] = useState<ConfigPayload | null>(null);
  const [stockBySku, setStockBySku] = useState<
    Partial<Record<string, StockStatus>>
  >({});

  useEffect(() => {
    let cancelled = false;
    loadCableRj45Catalog().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setCatalog({ status: "error", message: result.message });
        return;
      }
      setCatalog({ status: "ready", products: result.products });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const products = useMemo(
    () => (catalog.status === "ready" ? catalog.products : []),
    [catalog],
  );

  const { filters: activeFilters, options: filterOptions } = useMemo(
    () => resolveFacetFilters(products, filters),
    [products, filters],
  );

  const filtered = useMemo(
    () => filterCableProducts(products, activeFilters),
    [products, activeFilters],
  );

  const resolvedSku =
    filtered.length === 0
      ? ""
      : filtered.some((p) => p.sku === selectedSku)
        ? selectedSku
        : filtered[0].sku;

  const selectedProduct = useMemo(
    () =>
      resolvedSku ? findCableProduct(products, resolvedSku) : undefined,
    [products, resolvedSku],
  );

  const unitPrice = useMemo(() => {
    if (!selectedProduct) return null;
    return pickTierPrice(selectedProduct.prices, pricingTierCode);
  }, [selectedProduct, pricingTierCode]);

  const stockHint: StockStatus = selectedProduct
    ? (stockBySku[selectedProduct.sku] ??
      (selectedProduct.qtyInStock > 0 ? "ok" : "partial"))
    : "unknown";

  const filtersAreDefault =
    activeFilters.category === "all" &&
    activeFilters.color === "all" &&
    activeFilters.shielding === "all" &&
    activeFilters.sheath === "all" &&
    activeFilters.productType === "all" &&
    activeFilters.pairCount === "all";

  const cartMessage =
    cartStatus.state === "pending"
      ? "Ajout au panier…"
      : cartStatus.state === "success"
        ? "Ajouté au panier Oxatis."
        : cartStatus.state === "redirect"
          ? "Redirection vers le panier Oxatis…"
          : cartStatus.state === "error"
            ? cartStatus.message
            : null;

  useEffect(() => {
    if (!selectedProduct) return;
    const sku = selectedProduct.sku;
    let cancelled = false;
    getStockStatus([sku]).then((status) => {
      if (!cancelled) {
        setStockBySku((prev) => ({ ...prev, [sku]: status }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedProduct]);

  function updateFilter<K extends keyof CableFilters>(
    key: K,
    value: CableFilters[K],
  ) {
    setFilters((prev) => {
      const tentative = { ...prev, [key]: value };
      return resolveFacetFilters(products, tentative).filters;
    });
    setSummary(null);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setSummary(null);
  }

  async function handleValidate() {
    if (!selectedProduct) return;
    const stockStatus = await getStockStatus([selectedProduct.sku]);
    setStockBySku((prev) => ({ ...prev, [selectedProduct.sku]: stockStatus }));
    setSummary(
      buildCableRj45Payload({
        product: selectedProduct,
        quantity,
        pricingTierCode,
        stockStatus,
      }),
    );
  }

  function handleAddToCart() {
    if (!selectedProduct?.oxatisId) return;
    resetCartStatus();
    addToCart([{ productId: selectedProduct.oxatisId, quantity }]);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Heading level={1}>{CABLE_CATEGORY_ROOT}</Heading>
        <Text muted className="mt-2">
          Catalogue issu de la catégorie Oxatis homonyme. Filtrez par type,
          catégorie, couleur, blindage et gaine. {tariffLabel}.
        </Text>
      </div>

      {catalog.status === "loading" && (
        <Card>
          <Text muted>Chargement du catalogue…</Text>
        </Card>
      )}

      {catalog.status === "error" && (
        <Card>
          <Text className="text-red-700">
            Impossible de charger le catalogue : {catalog.message}
          </Text>
        </Card>
      )}

      {catalog.status === "ready" && (
        <>
          <Card className="flex flex-col gap-4">
            <Heading level={2}>Filtres</Heading>
            <div className="grid gap-3 sm:grid-cols-2">
              <FilterSelect
                label="Type de produit"
                value={activeFilters.productType}
                options={filterOptions.productTypes}
                onChange={(value) => updateFilter("productType", value)}
              />
              <FilterSelect
                label="Catégorie"
                value={activeFilters.category}
                options={filterOptions.categories}
                onChange={(value) => updateFilter("category", value)}
              />
              <FilterSelect
                label="Couleur"
                value={activeFilters.color}
                options={filterOptions.colors}
                onChange={(value) => updateFilter("color", value)}
              />
              <FilterSelect
                label="Blindage"
                value={activeFilters.shielding}
                options={filterOptions.shieldings}
                onChange={(value) => updateFilter("shielding", value)}
              />
              <FilterSelect
                label="Gaine"
                value={activeFilters.sheath}
                options={filterOptions.sheaths}
                onChange={(value) => updateFilter("sheath", value)}
              />
              <FilterSelect
                label="Nombre de paires"
                value={activeFilters.pairCount}
                options={filterOptions.pairCounts}
                onChange={(value) => updateFilter("pairCount", value)}
              />
            </div>
            <Text muted className="text-sm">
              {filtered.length === 0
                ? "Aucune référence."
                : filtered.length === 1
                  ? "1 référence trouvée."
                  : `${filtered.length} références trouvées.`}{" "}
              ({products.length} au catalogue)
            </Text>
            <Button
              variant="secondary"
              onClick={resetFilters}
              disabled={filtersAreDefault}
            >
              Réinitialiser les filtres
            </Button>
          </Card>

          <Card className="flex flex-col gap-4">
            <Heading level={2}>Résultats</Heading>

            {filtered.length === 0 ? (
              <Text muted>Aucun produit ne correspond à ces filtres.</Text>
            ) : (
              <>
                <ul className="max-h-[28rem] divide-y divide-zinc-200 overflow-y-auto rounded-md border border-zinc-200">
                  {filtered.map((product) => {
                    const selected = product.sku === resolvedSku;
                    return (
                      <li key={product.sku}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSku(product.sku);
                            setSummary(null);
                          }}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
                            selected
                              ? "bg-zinc-900 text-white"
                              : "bg-white hover:bg-zinc-50"
                          }`}
                        >
                          <ProductThumb
                            src={product.imageUrl}
                            alt={product.label}
                            selected={selected}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium leading-snug">
                              {product.label}
                            </span>
                            <span
                              className={`mt-0.5 block text-xs ${
                                selected ? "text-zinc-300" : "text-zinc-500"
                              }`}
                            >
                              {product.sku}
                              {product.category ? ` · ${product.category}` : ""}
                              {product.shielding
                                ? ` · ${product.shielding}`
                                : ""}
                              {product.sheath ? ` · ${product.sheath}` : ""}
                              {` · stock ${product.qtyInStock}`}
                              {(() => {
                                const price = pickTierPrice(
                                  product.prices,
                                  pricingTierCode,
                                );
                                return price == null
                                  ? ""
                                  : ` · ${price.toFixed(2)} € HT`;
                              })()}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-zinc-800">Quantité</span>
                  <input
                    type="number"
                    min={1}
                    className="rounded-md border border-zinc-300 px-3 py-2"
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(Number(e.target.value));
                      setSummary(null);
                    }}
                  />
                </label>

                <Text muted className="text-sm">
                  Prix unitaire HT :{" "}
                  {unitPrice == null ? "—" : `${unitPrice.toFixed(2)} €`}
                  {" · "}
                  {STOCK_LABEL[stockHint]}
                  {selectedProduct
                    ? ` (${selectedProduct.qtyInStock} en stock)`
                    : null}
                </Text>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleValidate} disabled={!selectedProduct}>
                    Valider ma configuration
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleAddToCart}
                    disabled={
                      !selectedProduct?.oxatisId || cartStatus.state === "pending"
                    }
                  >
                    Ajouter au panier
                  </Button>
                </div>
                {cartMessage && (
                  <Text
                    className={`text-sm ${
                      cartStatus.state === "error"
                        ? "text-red-700"
                        : "text-zinc-600"
                    }`}
                  >
                    {cartMessage}
                  </Text>
                )}
                {!selectedProduct?.oxatisId && selectedProduct && (
                  <Text muted className="text-sm">
                    Identifiant Oxatis manquant — panier indisponible pour cette
                    référence.
                  </Text>
                )}
              </>
            )}
          </Card>
        </>
      )}

      {summary && (
        <Card>
          <Heading level={3}>Récapitulatif</Heading>
          <ul className="mt-3 space-y-1 text-sm text-zinc-700">
            {summary.nomenclature.map((line) => (
              <li key={line.ref}>
                {line.qty} × {line.label} ({line.ref})
              </li>
            ))}
          </ul>
          <Text className="mt-3 font-medium">
            Total HT :{" "}
            {summary.pricing.total > 0
              ? `${summary.pricing.total.toFixed(2)} €`
              : "— (prix indisponible pour ce tarif)"}
          </Text>
          <Text muted className="mt-1 text-sm">
            {STOCK_LABEL[summary.stockStatus]}
          </Text>
        </Card>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-800">{label}</span>
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="all">Toutes</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProductThumb({
  src,
  alt,
  selected,
}: {
  src: string | null | undefined;
  alt: string;
  selected: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border ${
        selected ? "border-zinc-600 bg-zinc-800" : "border-zinc-200 bg-zinc-50"
      }`}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- URLs Oxatis externes
        <img
          src={src!}
          alt={alt}
          referrerPolicy="no-referrer"
          className="h-full w-full object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-[10px] leading-tight text-zinc-400">N/A</span>
      )}
    </span>
  );
}
