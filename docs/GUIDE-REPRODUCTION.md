# Guide de reproduction — configurateur Xeilom (coffrets)

Spécification pour **reproduire** le configurateur coffrets XH'system — y compris en **recréant tout le catalogue en base de données**.

> **Source de vérité données :**  
> [`src/data/catalog.json`](./src/data/catalog.json) · [`src/data/pricingMatrix.json`](./src/data/pricingMatrix.json) · [`src/data/pricingTiers.json`](./src/data/pricingTiers.json)  
> **Source de vérité comportements :** `src/utils/*` + tests `src/__tests__/*` (surtout `logicalRefGolden`, `bomBuilder`, `compatibility`).

---

## 0. Mission si tu as une DB (à lire en premier)

Tu ne « redesignes » pas le catalogue. Tu **recopies** ce qui existe déjà dans les JSON.

1. **Créer le schéma** (tables ci-dessous) capable de stocker le shape de `catalog.json` + matrices tarifaires.
2. **Seeder / importer** depuis les 3 fichiers JSON — **tous** les produits, options, composants, règles, segments, prix.
3. **Exposer une API** qui renvoie **exactement** le même shape JSON (ou un adaptateur 1:1).
4. **Réutiliser** le moteur front (`compatibility`, `bomBuilder`, `logicalRef`, `pricing`…) sans réécrire les règles métier en SQL.
5. **Valider** avec la checklist §18 (tous les cas).

**Interdit :** inventer des SKU, omettre une gamme, fusionner brassage en ligne BOM, facturer le bornier quand il est inclus, ignorer les lots RJ45 ×24, etc.

**Autorisé :** stocker `rules` / `attributes` / `includedItems` en JSONB si ça simplifie, tant que l’API reconstruit le JSON attendu.

---

## 1. En bref

| Aspect     | Réalité                                                                                                       |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| Type       | SPA React 19 + Vite 7, **sans backend aujourd’hui**                                                           |
| Données    | 3 JSON versionnés (à migrer en DB si besoin)                                                                  |
| Logique    | Fonctions pures `src/utils/`                                                                                  |
| État       | `useCoffretConfiguration`                                                                                     |
| Embed      | iframe Oxatis `?embed=1` + `postMessage`                                                                      |
| Inventaire | **11 gammes**, **22 options**, **2 composants**, **4 règles globales**, **36 SKU tarifés**, **5 grilles** S–Z |

---

## 2. Architecture & flux

```
DB ou JSON
   → shape catalog + pricing
      → ConfigState { gammeId, materiau, coffretCount, options }
         → compatibility (groupes / exclusions)
            → bomBuilder (nomenclature)
               → pricing (grille client)
                  → récap / PDF / mailto / share
```

### ConfigState

```js
{
  gammeId: "xh-m-250",
  materiau: "grade3",
  coffretCount: 1,           // 1…1000 — multiplie les TOTAUX, pas les qty BOM
  options: { /* une clé par optionGroup */ }
}
```

### BomLine

```js
{
  sku, label, quantity,
  type: "base" | "option" | "materiau",
  configRef,                 // ligne base seulement
  unitPriceHT, lineTotalHT, productUrl, image, imageSource
}
```

- **BOM calculable** si `gammeId` + `materiau` (`isConfigurationComplete`).
- **UI prête** (PDF / devis / share) si au moins une option **non-défaut** (`isConfigurationReady`).

---

## 3. Schéma DB recommandé

### Tables

| Table                  | Contenu                                                                              | Équiv. JSON                             |
| ---------------------- | ------------------------------------------------------------------------------------ | --------------------------------------- |
| `configurator`         | meta (marque, TVA, share URL…)                                                       | `meta`                                  |
| `option_groups`        | id, label, type (`single`/`quantity`), optional, description                         | `optionGroups`                          |
| `gamme_segments`       | id, label, sort                                                                      | `gammeSegments`                         |
| `gamme_segment_items`  | segment_id, gamme_id, sort                                                           | `gammeSegments[].items`                 |
| `gammes`               | id, label, description, base_sku, image_sku, unit_price_ht, dimensions, urls, image… | `gammes[]`                              |
| `gamme_attributes`     | gamme_id + JSONB **ou** colonnes                                                     | `attributes`                            |
| `gamme_materiaux`      | gamme_id, id, label, sku_suffix                                                      | `materiaux`                             |
| `gamme_option_groups`  | gamme_id, group_id, kind=`common`\|`specific`, sort                                  | `optionGroups` + `specificOptionGroups` |
| `gamme_included_items` | gamme_id, item_id, label, sort                                                       | `includedItems`                         |
| `components`           | key (`embaseRj45`, `terreBornier`), sku, sku_lot_24, label, brand…                   | `components`                            |
| `options`              | id, group_id, label, sku, prices fallback, urls, image…                              | `options[]`                             |
| `option_rules`         | option_id + JSONB rules **recommandé**                                               | `options[].rules`                       |
| `catalog_rules`        | id + JSONB (if / hideGroups / require…)                                              | `rules[]`                               |
| `pricing_tiers`        | code, label, category_id, is_default                                                 | `pricingTiers.json`                     |
| `prices`               | sku, tier_code, price_ht (nullable si inconnu)                                       | `pricingMatrix.skus`                    |

### Contrat API (obligatoire)

| Endpoint                  | Shape                  |
| ------------------------- | ---------------------- |
| `GET /api/catalog`        | = `catalog.json`       |
| `GET /api/pricing/matrix` | = `pricingMatrix.json` |
| `GET /api/pricing/tiers`  | = `pricingTiers.json`  |

Ou un seul `GET /api/bootstrap`.

**Seed initial :** parser les 3 JSON du repo et INSERT — ne pas retaper à la main.

```bash
# Référence locale
node -e "JSON.stringify(require('./src/data/catalog.json'))"
```

---

## 4. Inventaire à recréer — segments UI

| id             | Label                            | Gammes (ordre)                                     |
| -------------- | -------------------------------- | -------------------------------------------------- |
| `encastrement` | Tableaux pour bac d'encastrement | `xh-p-300`                                         |
| `modules-13`   | Coffrets 13 modules              | `xh-m-250`, `xh-ml-500`, `xh-mx-350`, `xh-mxl-615` |
| `modules-18`   | Coffrets 18 modules              | `xh-m2-250`, `xh-m2l-500`                          |
| `support-box`  | Coffrets avec support box        | `xh-s-250`, `xh-sx-350`                            |
| `avec-porte`   | Coffrets avec porte              | `xh-l-500`, `xh-xl-625`                            |

---

## 5. Inventaire — option groups (12)

| id             | Type         | Optional | Notes                                          |
| -------------- | ------------ | -------- | ---------------------------------------------- |
| `dti_rj45`     | single       | oui      |                                                |
| `dti_fibre`    | single       | oui      |                                                |
| `rj45`         | **quantity** | oui      | Pas d’option unitaire : composant `embaseRj45` |
| `cordon_rj45`  | **quantity** | oui      | Option catalogue `cordon-rj45-050` + qty       |
| `tv`           | single       | oui      |                                                |
| `cordon_balun` | single       | oui      |                                                |
| `prise`        | **quantity** | oui      | Max 2 ; option `prise-2pt`                     |
| `brassage`     | single       | **non**  | Virtuel ; défaut intérieur                     |
| `etagere_box`  | single       | oui      |                                                |
| `capot`        | single       | oui      |                                                |
| `rehausse`     | single       | oui      |                                                |
| `porte`        | single       | oui      | Masqué si porteMode ≠ option                   |

---

## 6. Inventaire — 11 gammes (produits de base)

Matériau unique partout : `{ id: "grade3", label: "Grade 3 TV", skuSuffix: "" }`.

| id           | Label             | baseSku   | imageSku           | PU HT S | maxRj45 | porte    | capot      | prise        | priseCount | Groups spécifiques    | Inclus (ids)                                                                        |
| ------------ | ----------------- | --------- | ------------------ | ------- | ------- | -------- | ---------- | ------------ | ---------- | --------------------- | ----------------------------------------------------------------------------------- |
| `xh-p-300`   | Plaque EASY P 300 | **XHG3T** | XHG3T-4RJ          | 11.81   | 10      | non      | non        | option       | —          | —                     | **aucun** → bornier **facturé**                                                     |
| `xh-m-250`   | M 250             | XHG3M     | XHG3M-4RJ          | 14.76   | 10      | non      | non        | option       | —          | brassage, etagere_box | terre-bornier, panneau-rj45-10, rail-din                                            |
| `xh-mx-350`  | MX 350            | XHG3MX    | XHG3MX-4RJ         | 33.81   | 10      | included | non        | option       | —          | etagere_box           | — (porte incluse UI, **pas** de P dans imageSku)                                    |
| `xh-ml-500`  | ML 500            | XHG3ML    | XHG3ML-4RJTV       | 29.10   | 10      | non      | non        | **included** | **2**      | brassage              | panneau-10, rail, terre, plaque-support-box, tablette, lien-60                      |
| `xh-mxl-615` | MXL 615           | XHG3MXL   | XHG3MXL-4RJTV      | 32.67   | 10      | non      | non        | option       | —          | brassage              | idem ML (sans PC inclus)                                                            |
| `xh-s-250`   | S 250             | XHG3S     | XHG3S-4RJ          | 16.90   | 10      | non      | **option** | option       | —          | capot, rehausse       | panneau-10, rail, terre, emplacement-support-box                                    |
| `xh-sx-350`  | SX 350            | XHG3SX    | XHG3SX-4RJ         | 21.90   | 10      | non      | **option** | option       | —          | capot, rehausse       | idem S                                                                              |
| `xh-l-500`   | L 500             | XHG3L     | **XHG3L-4RJTVP**   | 27.36   | **20**  | included | non        | included     | **3**      | etagere_box           | porte-wifi, rails-lateraux, panneau-20, rail, support-3-prises, prises-2pt-3, terre |
| `xh-xl-625`  | XL 625            | XHG3XL    | **XHG3XL-8RJTVP**  | 29.79   | **20**  | included | non        | included     | **3**      | etagere_box           | idem L                                                                              |
| `xh-m2-250`  | M2 250            | XHG3M2    | XHG3M2-4RJTV       | 20.43   | 10      | included | non        | **non**      | —          | etagere_box           | rail, panneau-10, terre                                                             |
| `xh-m2l-500` | M2L 500           | XHG3M2L   | **XHG3M2L-4RJTVP** | 36.45   | 10      | included | non        | included     | **3**      | —                     | rail, panneau-10, plaque-support-box, bloc-3-prises, terre, lien-auto-agrippant     |

### Groupes communs (toutes sauf où retiré)

Base typique : `dti_rj45`, `dti_fibre`, `rj45`, `cordon_rj45`, `tv`, `cordon_balun`, (+ `prise` si pas included/non).

- ML / L / XL / M2 / M2L : **pas** de groupe `prise` dans `optionGroups` (prises incluses ou absentes).
- Affichage groupes = `optionGroups` ∪ `specificOptionGroups`, avec **`brassage` en premier** s’il existe.

---

## 7. Inventaire — composants (pas des options UI)

| key            | sku         | skuLot24       | label                        | PU HT S | Usage BOM                                           |
| -------------- | ----------- | -------------- | ---------------------------- | ------- | --------------------------------------------------- |
| `embaseRj45`   | `KJ6AFSEF1` | `KJ6AFSEF1-24` | Embase RJ45 Cat. 6A UNIKKERN | 4.14    | qty RJ45 → lots 24 puis unitaires                   |
| `terreBornier` | `BMT-PRD`   | —              | Bornier terre rail DIN       | 3.09    | +1 sauf si `includedItems` contient `terre-bornier` |

`KJ6AFSEF1-24` n’est **pas** dans pricingMatrix aujourd’hui (seul `KJ6AFSEF1`) — le lot utilise le même pipeline SKU ; prévoir le prix lot si tu l’ajoutes en DB.

---

## 8. Inventaire — 22 options

| id                    | group        | sku             | PU HT S           | rules clés                                                                        |
| --------------------- | ------------ | --------------- | ----------------- | --------------------------------------------------------------------------------- |
| `cordon-rj45-050`     | cordon_rj45  | CR6ASSTPOH0.5GS | 2.43              | (qty group)                                                                       |
| `dti-rj45-4precable`  | dti_rj45     | DTIMP4RJ45      | 21.50             | maxPerConfig 1                                                                    |
| `dti-fibre-2`         | dti_fibre    | DTIO2           | 16.83             | excl. dti-fibre-4                                                                 |
| `dti-fibre-4`         | dti_fibre    | DTIO4           | 16.83             | excl. dti-fibre-2                                                                 |
| `tv-2`                | tv           | SPLITF-2        | 3.44              | excl. autres tv-\*                                                                |
| `tv-3`                | tv           | SPLITF-3        | 4.56              | idem                                                                              |
| `tv-4`                | tv           | SPLITF-4        | 5.46              | idem                                                                              |
| `tv-6`                | tv           | SPLITF-6        | 11.13             | idem                                                                              |
| `tv-8`                | tv           | SPLITF-8        | 12.74             | idem                                                                              |
| `cordon-balun-rj45-f` | cordon_balun | CR503S78-0.5    | 8.37              | max 1                                                                             |
| `prise-2pt`           | prise        | PC45X45         | 4.14              | max 2 ; require priseMode=option                                                  |
| `brassage-interieur`  | brassage     | —               | —                 | **virtual** ; gammes M/ML/MXL ; excl. extérieur                                   |
| `brassage-exterieur`  | brassage     | —               | —                 | **virtual** ; `chassisSkuSuffix: "-E"` ; gammes M/ML/MXL                          |
| `etagere-box`         | etagere_box  | XH-ET-LXL       | 13.87             | gammes L, XL                                                                      |
| `etagere-extl`        | etagere_box  | XH-ETEXTL       | 20.80             | M, MX, M2 ; excl. _-1pc _-2pc                                                     |
| `etagere-extl-1pc`    | etagere_box  | XH-ETEXTL-1PC   | 26.74             | M, MX, M2                                                                         |
| `etagere-extl-2pc`    | etagere_box  | XH-ETEXTL-2PC   | 31.20             | M, MX, M2                                                                         |
| `capot-s250`          | capot        | XH-S-CAPOT      | 26.66             | gamme S only ; capotMode=option                                                   |
| `capot-sx350`         | capot        | XH-SX-CAPOT     | 38.63             | SX only                                                                           |
| `rehausse-s250`       | rehausse     | XH-S-REH        | 45.24             | S only                                                                            |
| `rehausse-sx350`      | rehausse     | XH-SX-REH       | 32.41             | SX only                                                                           |
| `porte-l500`          | porte        | XH-L-PORTE-HQ   | (matrice 23.70 S) | L only ; require porteMode=option (**groupe masqué** tant que porteMode=included) |

Conserver aussi `productUrl`, `image`, `imageSource` depuis `catalog.json` lors du seed.

---

## 9. Règles globales (`catalog.rules`) — à seed

| id                          | Condition                | Action       |
| --------------------------- | ------------------------ | ------------ |
| `hide-capot-if-not-option`  | `capotMode` ≠ `option`   | hide `capot` |
| `hide-porte-if-not-option`  | `porteMode` ≠ `option`   | hide `porte` |
| `hide-prise-if-included`    | `priseMode` = `included` | hide `prise` |
| `hide-prise-if-unavailable` | `priseMode` = `non`      | hide `prise` |

---

## 10. Grilles tarifaires + SKU prix

### Tiers (`pricingTiers.json`)

| code | label        | categoryId Oxatis | défaut  |
| ---- | ------------ | ----------------- | ------- |
| S    | Tarif public | 3394217           | **oui** |
| M    | Tarif M      | 3394220           |         |
| B    | Tarif B      | 3394218           |         |
| A    | Tarif A      | 3394154           |         |
| Z    | Tarif Z      | 3394219           |         |

### SKU à avoir dans `prices` (36)

**Châssis :** `XHG3T`, `XHG3M`, `XHG3M-E`, `XHG3MX`, `XHG3ML`, `XHG3ML-E`, `XHG3MXL`, `XHG3MXL-E`, `XHG3S`, `XHG3SX`, `XHG3L`, `XHG3XL`, `XHG3M2`, `XHG3M2L`

**Options / composants :** `KJ6AFSEF1`, `CR6ASSTPOH0.5GS`, `DTIMP4RJ45`, `DTIO2`, `DTIO4`, `SPLITF-2/3/4/6/8`, `BMT-PRD`, `PC45X45`, `XH-ET-LXL`, `XH-ETEXTL`, `XH-ETEXTL-1PC`, `XH-ETEXTL-2PC`, `XH-S-CAPOT`, `XH-SX-CAPOT`, `XH-L-PORTE-HQ`, `CR503S78-0.5`, `XH-S-REH`, `XH-SX-REH`

Importer les 5 colonnes depuis `pricingMatrix.json` (certaines cellules vides = null, ex. DTIO2, Z sur porte).

Les variantes **`-E`** (brassage extérieur) sont des **SKU de tarification distincts** même si le prix S est souvent égal au châssis sans `-E`.

---

## 11. Construction BOM (ordre à reproduire)

1. Config incomplète → `[]`
2. Ligne **base** : SKU = `baseSku + materiau.skuSuffix + chassisSkuSuffix` ; `configRef` = réf. logique
3. **Bornier** BMT-PRD si composant présent **et** pas `terre-bornier` dans includedItems
4. **RJ45** : `buildEmbaseRj45Lines` (lots 24 + reste)
5. **Prise** quantity si groupe visible
6. **Cordon RJ45** quantity si groupe visible
7. Options **single** sélectionnées, non virtual, sélectionnables
8. `applyPricingToBom(tier)`

`coffretCount` ne multiplie **pas** les quantités lignes — seulement les totaux commande.

---

## 12. Référence logique

```
XHG3{Gamme}[-{n}RJ][-P][-E][-SD|DTI][-DTIO2|DTIO4][-{p}PC][-{k}TV][-{c}CRJ{b}CB]
```

| Token    | Règle                                                          |
| -------- | -------------------------------------------------------------- |
| P        | Si `imageSku` match `…-{n}RJ…` et suffixe **se termine par P** |
| E        | Brassage extérieur                                             |
| SD / DTI | Toujours l’un des deux                                         |
| PC       | `priseMode=included` → `priseCount` ; sinon qty option         |
| CRJ/CB   | Bloc collé dès qu’un cordon > 0                                |

### Golden (ne pas casser)

| Gamme | base                   | rj4          | full                                 |
| ----- | ---------------------- | ------------ | ------------------------------------ |
| P     | XHG3T-SD               | XHG3T-4RJ-SD | XHG3T-8RJ-E-SD-DTIO2-2PC-4TV-4CRJ1CB |
| M     | XHG3M-SD               | XHG3M-4RJ-SD | XHG3M-8RJ-E-SD-DTIO2-2PC-4TV-4CRJ1CB |
| MX    | XHG3MX-SD              | …            | … (pas de P)                         |
| ML    | XHG3ML-SD-**2PC**      | …            | …                                    |
| L     | XHG3L-**P**-SD-**3PC** | …            | …                                    |
| M2    | XHG3M2-SD              | …            | full **sans** PC                     |
| M2L   | XHG3M2L-P-SD-3PC       | …            | …                                    |

Fichier : `src/__tests__/logicalRefGolden.test.js`.

---

## 13. Tous les cas métier (checklist d’acceptance)

Cocher après seed + moteur branché.

### Catalogue / seed

- [ ] 11 gammes présentes avec **mêmes ids**
- [ ] baseSku P = **XHG3T** (pas XHG3P)
- [ ] 12 option_groups + 5 segments
- [ ] 22 options + 2 components
- [ ] 4 catalog_rules
- [ ] 36 SKU × 5 tiers (null autorisé)
- [ ] `GET /catalog` deep-equal structurel avec `catalog.json` (hors whitespace)

### Bornier

- [ ] P 300 → BOM contient `BMT-PRD` qty 1
- [ ] M 250 (et toute gamme avec `terre-bornier`) → **pas** de `BMT-PRD` dans BOM
- [ ] Included items affichés en UI sans prix

### Brassage

- [ ] Présent seulement M / ML / MXL
- [ ] Défaut = `brassage-interieur` au choix de gamme
- [ ] Virtuel : **aucune** ligne BOM « Brassage… »
- [ ] Extérieur → SKU base `XHG3M-E` (resp. ML-E, MXL-E) + token `E` dans configRef
- [ ] Label base contient « brassage extérieur »

### RJ45

- [ ] Plafond = `maxRj45` (10 ou 20)
- [ ] Presets 2,4,6,8,10 filtrés par max
- [ ] 20 embases sur XL → lignes lot + unitaires, total pièces = 20
- [ ] Legacy `rj45-4` accepté en parse

### Prises

- [ ] Groupe masqué si included ou non
- [ ] Option : max 2, SKU `PC45X45`
- [ ] Included : token `{n}PC` dans réf. sans ligne BOM prise

### Porte / capot / imageSku

- [ ] Token P seulement si imageSku finit par P (L, XL, M2L) — **pas** MX malgré porte incluse
- [ ] Groupes capot/porte masqués selon attributes

### Étagères

- [ ] L/XL → seulement `etagere-box` (XH-ET-LXL)
- [ ] M/MX/M2 → famille EXTL avec exclusions mutuelles
- [ ] Autres gammes : pas d’options étagère visibles

### Capot / rehausse S & SX

- [ ] Capot S invisible sur SX et inversement
- [ ] Rehausse idem

### Quantité coffrets

- [ ] BOM unitaire inchangé si count=3
- [ ] Totaux HT/TTC × 3
- [ ] Résumé « 3× … »

### UI readiness

- [ ] BOM non vide dès gamme+matériau
- [ ] PDF/devis/share bloqués tant que seules options défaut (ex. brassage intérieur seul)
- [ ] « Aucun » sur groupe optionnel = acknowledgment pour avancer l’accordéon

### Compat / sanitize

- [ ] Exclusion TV mutuelle
- [ ] Exclusion DTIO2/4
- [ ] Changement de gamme retire options incompatibles
- [ ] Legacy `options.dti` et `options.terre` nettoyés

### Réf. logique

- [ ] Golden tests §12 passent
- [ ] Parse + apply ref reconstruit un draft (RefApplyField)
- [ ] Share fiable = `?config=` pas seulement la réf.

### Tarifs

- [ ] Visiteur → grille S
- [ ] Embed catid → code M/B/A/Z
- [ ] Prix ligne = matrice[sku][tier]

### Inclus non facturés

- [ ] Aucune ligne SKU `INCLUS` dans BOM
- [ ] Porte/capot/prises inclus ne génèrent pas de ligne option

---

## 14. Couches code (réutiliser)

| Couche        | Rôle       |
| ------------- | ---------- |
| `components/` | UI         |
| `hooks/`      | État       |
| `utils/`      | Métier pur |
| data / API    | Catalogue  |

Fichiers critiques : `bomBuilder.js`, `compatibility.js`, `logicalRef.js`, `gammeSku.js`, `includedItems.js`, `rj45.js`, `cordonRj45.js`, `prise.js`, `configSanitizer.js`, `pricing*.js`, `orderPricing.js`, `progress.js`, `configurationReadiness.js`, `useCoffretConfiguration.js`.

---

## 15. Parcours UI

1. Segments → choix gamme → defaults (brassage si applicable)
2. Accordéons groupes visibles
3. Quantity groups dédiés (`Rj45*`, `Cordon*`, `Prise*`)
4. Quantité coffrets
5. Sidebar inclus + récap
6. Si ready : contact, PDF, mailto, share, copy
7. Saisie réf. logique + légende tokens

Mode embed : masque header, resize iframe, tarif client.

---

## 16. Sans DB (rappel)

Pack [`kit-nouveau-configurateur/`](./kit-nouveau-configurateur/) + fiche cadrage + checklist — pour un **nouveau** produit.  
Pour **ce** configurateur en DB : seed depuis les JSON existants (§0–§13), ne pas repartir d’un template vide.

---

## 17. Script de seed (intention)

```text
1. Lire catalog.json, pricingMatrix.json, pricingTiers.json
2. UPSERT tiers, groups, segments, gammes (+ attrs, matériaux, groups links, included)
3. UPSERT components, options (+ rules JSONB), catalog_rules
4. UPSERT prices (sku, tier, price_ht) pour chaque entrée matrice
5. Smoke : GET /catalog → comparer clés gammes/options/rules
6. Lancer les tests Vitest du moteur (fixtures peuvent rester JSON)
```

Ne mets **pas** la logique BOM dans des triggers SQL.

---

## 18. Liens

- [README](./README.md)
- [Architecture](./docs/architecture-configurateurs-xeilom.md)
- [Tarifs](./docs/systeme-tarifs-configurateurs-xeilom.md)
- [Oxatis](./docs/integration-oxatis-embed-tarifs.md)
- [Design](./docs/design-system-configurateurs-xeilom.md)
- [Kit](./kit-nouveau-configurateur/README.md)
- Golden : `src/__tests__/logicalRefGolden.test.js`
- BOM : `src/__tests__/bomBuilder.test.js`
