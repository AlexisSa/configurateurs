"use client";

import { useEffect, useMemo, useState } from "react";
import { CartNotification } from "@/core/cart/CartNotification";
import { useAddToCart } from "@/core/cart/useAddToCart";
import { useClientContext } from "@/core/client-context/ClientProvider";
import { Button, Card, Heading, Spinner, Text } from "@/core/design-system";
import { OxatisProductLink } from "@/core/oxatis/OxatisProductLink";
import type { StockStatus } from "@/core/payload/types";
import { pickTierPrice } from "@/core/pricing/priceLevels";
import { getStockStatus } from "@/core/stock/getStockStatus";
import {
  DEFAULT_FILTERS,
  filterCableProducts,
  findCableProduct,
  resolveFacetFilters,
  type CableFilters,
  type CableProduct,
} from "./catalog";
import { loadCableRj45Catalog } from "./loadCatalog";

const STOCK_LABEL: Record<StockStatus, string> = {
  ok: "En stock",
  partial: "Stock partiel ou insuffisant",
  unknown: "Disponibilité à confirmer",
};

const selectClass =
  "w-full min-w-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900";

type CatalogState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; products: CableProduct[] };

/**
 * Configurateur câble RJ45 informatique — catalogue = catégorie Oxatis.
 */
export function CableRj45Configurator() {
  const { pricingTierCode, isEmbed } = useClientContext();
  const { addToCart, status: cartStatus, resetStatus: resetCartStatus } =
    useAddToCart();
  const [catalog, setCatalog] = useState<CatalogState>({ status: "loading" });
  const [filters, setFilters] = useState<CableFilters>(DEFAULT_FILTERS);
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState(1);
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

  const lineTotal =
    unitPrice == null
      ? null
      : unitPrice * Math.max(1, Math.floor(quantity) || 1);

  const stockHint: StockStatus = selectedProduct
    ? (stockBySku[selectedProduct.sku] ??
      (selectedProduct.qtyInStock > 0 ? "ok" : "partial"))
    : "unknown";

  const filtersAreDefault =
    activeFilters.euroclass === "all" &&
    activeFilters.category === "all" &&
    activeFilters.color === "all" &&
    activeFilters.shielding === "all" &&
    activeFilters.sheath === "all" &&
    activeFilters.productType === "all" &&
    activeFilters.pairCount === "all";

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
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  function handleAddToCart() {
    if (!selectedProduct?.oxatisId) return;
    resetCartStatus();
    addToCart([{ productId: selectedProduct.oxatisId, quantity }]);
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div>
        <Text muted>
          Affinez votre recherche, sélectionnez une référence, puis ajoutez-la
          au panier.
        </Text>
      </div>

      {catalog.status === "loading" && (
        <Card>
          <Spinner label="Chargement du catalogue…" />
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:items-start">
          <Card className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
            <Heading level={2}>Filtres</Heading>

            {filterOptions.euroclasses.length > 0 && (
              <div className="rounded-lg border border-brand/25 bg-brand-muted p-3">
                <p className="text-sm font-semibold text-brand">Euroclasse</p>
                <p className="mt-0.5 text-xs text-zinc-600">
                  Classe de réaction au feu du câble
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateFilter("euroclass", "all")}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                      activeFilters.euroclass === "all"
                        ? "border-brand bg-brand text-white"
                        : "border-brand/30 bg-white text-brand hover:border-brand"
                    }`}
                  >
                    Toutes
                  </button>
                  {filterOptions.euroclasses.map((value) => {
                    const active = activeFilters.euroclass === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateFilter("euroclass", value)}
                        className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-brand bg-brand text-white"
                            : "border-brand/30 bg-white text-brand hover:border-brand"
                        }`}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid gap-3">
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
              className="w-full"
              onClick={resetFilters}
              disabled={filtersAreDefault}
            >
              Réinitialiser les filtres
            </Button>
          </Card>

          <Card className="flex min-w-0 flex-col gap-4">
            <Heading level={2}>Résultats</Heading>

            {filtered.length === 0 ? (
              <Text muted>Aucun produit ne correspond à ces filtres.</Text>
            ) : (
              <>
                <ul className="max-h-[32rem] divide-y divide-zinc-200 overflow-y-auto rounded-md border border-zinc-200">
                  {filtered.map((product) => {
                    const selected = product.sku === resolvedSku;
                    const price = pickTierPrice(
                      product.prices,
                      pricingTierCode,
                    );
                    return (
                      <li
                        key={product.sku}
                        className={`flex items-stretch ${
                          selected ? "bg-brand text-white" : "bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSku(product.sku);
                          }}
                          className={`flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition ${
                            selected ? "text-white" : "hover:bg-zinc-50"
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
                                selected ? "text-white/75" : "text-zinc-500"
                              }`}
                            >
                              {product.sku}
                              {product.euroclass
                                ? ` · ${product.euroclass}`
                                : ""}
                              {product.category ? ` · ${product.category}` : ""}
                              {product.shielding
                                ? ` · ${product.shielding}`
                                : ""}
                              {product.sheath ? ` · ${product.sheath}` : ""}
                            </span>
                          </span>
                          {price != null && (
                            <span
                              className={`shrink-0 text-sm font-medium tabular-nums ${
                                selected ? "text-white" : "text-zinc-800"
                              }`}
                            >
                              {price.toFixed(2)} €
                            </span>
                          )}
                        </button>
                        {product.oxatisId ? (
                          <OxatisProductLink
                            oxatisId={product.oxatisId}
                            isEmbed={isEmbed}
                            selected={selected}
                          />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>

                <div className="flex flex-col gap-4 border-t border-zinc-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <label className="flex w-full max-w-[10rem] flex-col gap-1 text-sm">
                    <span className="font-medium text-zinc-800">Quantité</span>
                    <input
                      type="number"
                      min={1}
                      className="rounded-md border border-zinc-300 px-3 py-2"
                      value={quantity}
                      onChange={(e) => {
                        setQuantity(Number(e.target.value));
                      }}
                    />
                  </label>

                  <StockPill
                    status={stockHint}
                    qtyInStock={selectedProduct?.qtyInStock}
                  />
                </div>

                <div className="flex flex-col gap-1 text-sm text-zinc-700">
                  <p>
                    <span className="text-zinc-500">Prix unitaire HT</span>
                    <span className="mt-0.5 block text-base font-medium text-zinc-900 tabular-nums">
                      {unitPrice == null ? "—" : `${unitPrice.toFixed(2)} €`}
                    </span>
                  </p>
                  <p>
                    <span className="text-zinc-500">Total HT</span>
                    <span className="mt-0.5 block text-base font-medium text-zinc-900 tabular-nums">
                      {lineTotal == null ? "—" : `${lineTotal.toFixed(2)} €`}
                    </span>
                  </p>
                </div>

                <Button
                  onClick={handleAddToCart}
                  disabled={
                    !selectedProduct?.oxatisId || cartStatus.state === "pending"
                  }
                >
                  Ajouter au panier
                </Button>
                <CartNotification status={cartStatus} />
                {!selectedProduct?.oxatisId && selectedProduct && (
                  <Text muted className="text-sm">
                    Cette référence ne peut pas être ajoutée au panier pour le
                    moment.
                  </Text>
                )}
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function StockPill({
  status,
  qtyInStock,
}: {
  status: StockStatus;
  qtyInStock?: number;
}) {
  const styles: Record<StockStatus, string> = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    partial: "border-amber-200 bg-amber-50 text-amber-900",
    unknown: "border-zinc-200 bg-zinc-100 text-zinc-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 self-start rounded-full border px-3 py-1 text-xs font-medium ${styles[status]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "ok"
            ? "bg-emerald-500"
            : status === "partial"
              ? "bg-amber-500"
              : "bg-zinc-400"
        }`}
        aria-hidden
      />
      {STOCK_LABEL[status]}
      {qtyInStock != null ? ` · ${qtyInStock}` : null}
    </span>
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
        selected ? "border-brand/40 bg-brand/20" : "border-zinc-200 bg-zinc-50"
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
