#!/usr/bin/env node
/**
 * CSV Oxatis → src/core/pricing/pricingMatrix.json
 * Usage: npm run import:pricing -- [chemin/vers/export.csv]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OXATIS_PRICE_COLUMNS,
  OXATIS_SKU_ALIASES,
} from "./lib/oxatisPricingColumns.mjs";
import { parseOxatisCsv, recordsToObjects } from "./lib/parseOxatisCsv.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const defaultCsv = path.join(root, "data", "import", "Oxatis-All-export.csv");
const matrixPath = path.join(root, "src", "core", "pricing", "pricingMatrix.json");

const csvPath = path.resolve(process.argv[2] ?? defaultCsv);

if (!fs.existsSync(csvPath)) {
  console.error(`CSV introuvable: ${csvPath}`);
  console.error("Déposez un export Oxatis dans data/import/ puis relancez.");
  process.exit(1);
}

const text = fs.readFileSync(csvPath, "utf8");
const { headers, records } = parseOxatisCsv(text);
const rows = recordsToObjects(headers, records);

const skuKey =
  headers.find((h) => /^(ItemID|SKU|Reference|Référence)$/i.test(h)) ??
  headers[0];

const reverseAlias = Object.fromEntries(
  Object.entries(OXATIS_SKU_ALIASES).map(([appSku, oxSku]) => [oxSku, appSku]),
);

const skus = {};
for (const row of rows) {
  const oxSku = String(row[skuKey] ?? "").trim();
  if (!oxSku) continue;
  const appSku = reverseAlias[oxSku] ?? oxSku;
  const prices = {};
  for (const [tier, column] of Object.entries(OXATIS_PRICE_COLUMNS)) {
    const raw = String(row[column] ?? "").replace(",", ".").trim();
    const num = raw === "" ? null : Number(raw);
    prices[tier] = Number.isFinite(num) ? num : null;
  }
  skus[appSku] = prices;
}

const matrix = {
  meta: {
    tiers: ["S", "M", "B", "A", "Z"],
    oxatisTierMapping: {
      S: "Tarif 2 (Price2VATExcluded)",
      M: "Tarif 3 (Price3VATExcluded)",
      B: "Tarif 4 (Price4VATExcluded)",
      A: "Tarif 5 (Price5VATExcluded)",
      Z: "Tarif 6 (Price6VATExcluded)",
    },
    importedAt: new Date().toISOString(),
    source: path.basename(csvPath),
  },
  skus,
};

fs.writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
console.log(`OK — ${Object.keys(skus).length} SKU → ${matrixPath}`);
