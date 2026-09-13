# Intégration Oxatis — iframe, catégories client et grilles tarifaires

Guide réutilisable pour intégrer une app React (ou autre) sur un site **Oxatis** via iframe, avec tarification par catégorie client et import depuis un export catalogue CSV.

> Projet d'origine : **Configurateur coffrets XH'system** (Xeilom).

---

## Vue d'ensemble

```
Site Oxatis (parent)                         App configurateur (iframe)
─────────────────────                        ───────────────────────────
window.oxInfos.oxUser.catid[0]  ──postMessage──►  resolvePricingTierCode()
       │                                              │
       │  ex. 3394219                                 ▼
       │                                         tarif Z
       ▼                                              │
Catégorie client Oxatis                               ▼
                                               pricingMatrix.json
                                               prix HT par SKU × tarif
```

**Principe :**

1. Le site Oxatis connaît la catégorie du client connecté (`catid`).
2. Il transmet cette catégorie à l'iframe via `postMessage` (ou paramètre d'URL).
3. L'app résout l'ID Oxatis → code tarif (S, M, B, A, Z).
4. Les prix affichés viennent d'une matrice JSON : **un prix HT par SKU et par tarif**.

---

## Grilles tarifaires Xeilom

| Code | Catégorie | ID Oxatis (`catid`) | Avantage |
|------|-----------|---------------------|----------|
| **S** | Particulier / public | `3394217` | Tarif de base (le moins avantageux) |
| **M** | Tarif M | `3394220` | |
| **B** | Tarif B | `3394218` | |
| **A** | Tarif A | `3394154` | |
| **Z** | Tarif Z | `3394219` | Le plus avantageux |

Fichier de config : `src/data/pricingTiers.json`

Visiteur non connecté → tarif **S** par défaut.

---

## Correspondance export Oxatis → tarifs app

Dans l'export CSV Oxatis « All products », les colonnes HT sont :

| Tarif Oxatis | Colonne CSV | Code app |
|--------------|-------------|----------|
| Tarif 2 | `Price2VATExcluded` | **S** |
| Tarif 3 | `Price3VATExcluded` | **M** |
| Tarif 4 | `Price4VATExcluded` | **B** |
| Tarif 5 | `Price5VATExcluded` | **A** |
| Tarif 6 | `Price6VATExcluded` | **Z** |

> Le **Tarif 1** (`Price1VATExcluded`) n'est pas utilisé ici — le tarif public client correspond au **Tarif 2** (= S).

---

## Fichiers clés du projet

```
data/import/                          # Exports Oxatis (CSV) — JAMAIS versionnés
  .gitignore                          # Ignore tout sauf .gitkeep
  Oxatis-All-xeilom-26993.csv         # Source locale (gitignore)

scripts/
  import-oxatis-pricing.mjs           # CSV → pricingMatrix.json
  sync-pricing-matrix.mjs             # catalog.json → prix S (fallback)
  lib/
    parseOxatisCsv.mjs                # Parser CSV Oxatis (;, champs quotés)
    oxatisPricingColumns.mjs          # Mapping colonnes Tarif 2–6

src/data/
  pricingTiers.json                   # IDs catégories Oxatis ↔ codes S/M/B/A/Z
  pricingMatrix.json                  # Prix HT par SKU × tarif (versionné, déployé)
  catalog.json                        # Produits, options, règles métier

src/hooks/
  useEmbedContext.js                  # Reçoit catid (URL + postMessage)
  useEmbedResize.js                 # Envoie hauteur iframe au parent

src/utils/
  pricingTier.js                      # resolvePricingTierCode(), labels
  pricingMatrix.js                  # getSkuTierPriceHT(sku, tier)
  pricing.js                        # getUnitPriceHT() → matrice
  embedOrigins.js                   # Origines parent autorisées (xeilom.fr)
  embedMode.js                      # ?embed=1
```

---

## Matrice de prix (`pricingMatrix.json`)

Structure :

```json
{
  "meta": {
    "tiers": ["S", "M", "B", "A", "Z"],
    "oxatisTierMapping": {
      "S": "Tarif 2 (Price2VATExcluded)",
      "M": "Tarif 3 (Price3VATExcluded)",
      "B": "Tarif 4 (Price4VATExcluded)",
      "A": "Tarif 5 (Price5VATExcluded)",
      "Z": "Tarif 6 (Price6VATExcluded)"
    }
  },
  "skus": {
    "XHG3M": {
      "S": 62,
      "M": 54.25,
      "B": 46.17,
      "A": 43.4,
      "Z": 37.07
    }
  }
}
```

- Clé = **SKU configurateur** (ex. `XHG3M`, `DTIMP4RJ45`).
- Chaque SKU a 5 prix HT. `null` = tarif non disponible pour ce produit.
- Le lot `KJ6AFSEF1-24` est calculé automatiquement : `KJ6AFSEF1 × 24` par tarif.

### Alias SKU configurateur ↔ Oxatis

Quand la référence Oxatis diffère du SKU app :

| SKU app | Référence Oxatis (export) | Mécanisme |
|---------|---------------------------|-----------|
| Châssis `XHG3M` | `XHG3M-4RJ` | Champ `imageSku` dans `catalog.json` |
| `DTIO4` | `DTIO-4` | Alias dans `scripts/lib/oxatisPricingColumns.mjs` |
| Autres options | même SKU | Correspondance directe |

Pour un nouveau projet : enrichir `OXATIS_SKU_ALIASES` ou ajouter un champ `oxatisSku` par produit dans le catalogue.

---

## Import des tarifs depuis Oxatis

### 1. Déposer l'export

Placer le CSV Oxatis dans :

```
data/import/Oxatis-All-xeilom-26993.csv
```

(n'importe quel nom — chemin par défaut du script)

### 2. Lancer l'import

```bash
npm run import:pricing
# ou avec un fichier explicite :
npm run import:pricing -- data/import/mon-export.csv
```

Génère / met à jour `src/data/pricingMatrix.json`.

### 3. Fallback catalogue (prix S uniquement)

Si pas de CSV disponible :

```bash
npm run sync:pricing
```

Recopie les `unitPriceHT` de `catalog.json` vers la colonne **S** de la matrice.

---

## Sécurité Git — exports tarifaires

**Règle : le CSV Oxatis ne doit jamais être public.**

`.gitignore` (racine) :

```gitignore
# Exports Oxatis (tarifs confidentiels) — jamais sur GitHub
data/import/*
!data/import/.gitkeep
!data/import/.gitignore
```

`data/import/.gitignore` :

```gitignore
*
!.gitkeep
```

Vérifier qu'un CSV est bien ignoré :

```bash
git check-ignore -v data/import/Oxatis-All-xeilom-26993.csv
```

### Ce qui est versionné vs ce qui ne l'est pas

| Fichier | Git | Déployé (Vercel) | Visible utilisateur |
|---------|-----|------------------|---------------------|
| CSV Oxatis | Non | Non | Non |
| `pricingMatrix.json` | Oui | Oui | Oui (bundle JS — DevTools) |
| `pricingTiers.json` | Oui | Oui | Oui |

> **Limite importante :** les prix compilés dans `pricingMatrix.json` sont inclus dans le bundle front. Un visiteur technique peut les lire même sans être client pro. Pour des tarifs strictement confidentiels, il faudrait une **API serveur** qui ne renvoie les prix qu'après validation de session Oxatis.

---

## Mode embed (`?embed=1`)

Paramètre URL : masque le header du site, active la communication iframe.

L'app envoie sa hauteur au parent :

```javascript
// Message sortant (app → parent)
{ type: "coffret-resize", height: 1234 }
```

Le parent redimensionne l'iframe pour éviter le double scroll.

---

## Récupérer la catégorie client sur Oxatis

En console (F12), client connecté :

```javascript
window.oxInfos.oxUser.catid[0]
// → ex. "3394219" (tarif Z)
```

- Retourne un **nombre ou une string** — les deux sont gérés.
- Si `oxUser` absent → visiteur non connecté → tarif **S**.

---

## Script page Oxatis (parent)

À insérer dans la **page sur mesure** Oxatis (bloc HTML), avec l'iframe du configurateur :

```html
<div class="configurateur-embed">
  <iframe
    id="configurateur-coffret"
    title="Configurateur"
    width="100%"
    style="border:0; min-height:720px; display:block; width:100%;"
    loading="lazy"
    allow="clipboard-write"
  ></iframe>
</div>

<script>
(function () {
  var IFRAME_ORIGIN = "https://VOTRE-APP.vercel.app";
  var frame = document.getElementById("configurateur-coffret");

  function buildIframeSrc() {
    var src = IFRAME_ORIGIN + "/?embed=1";
    var config = new URLSearchParams(window.location.search).get("config");
    if (config) {
      src += "&config=" + encodeURIComponent(config);
    }
    return src;
  }

  if (frame) {
    frame.src = buildIframeSrc();
  }

  function getOxatisCategoryId() {
    var user = window.oxInfos && window.oxInfos.oxUser;
    if (!user || !user.catid || !user.catid.length) return null;
    return user.catid[0];
  }

  var retryTimer = null;

  function sendPricingContext() {
    if (!frame || !frame.contentWindow) return;
    var categoryId = getOxatisCategoryId();
    if (categoryId == null) return;

    frame.contentWindow.postMessage(
      { type: "coffret-context", categoryId: categoryId },
      IFRAME_ORIGIN
    );
  }

  function startPricingContextRetry() {
    sendPricingContext();
    if (retryTimer) clearInterval(retryTimer);
    var attempts = 0;
    retryTimer = setInterval(function () {
      sendPricingContext();
      attempts += 1;
      if (attempts >= 20) clearInterval(retryTimer);
    }, 500);
  }

  if (frame) {
    frame.addEventListener("load", startPricingContextRetry);
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== IFRAME_ORIGIN) return;
    if (!event.data || !event.data.type) return;

    if (event.data.type === "coffret-request-context") {
      sendPricingContext();
      return;
    }

    if (event.data.type === "coffret-resize" && frame && event.data.height > 0) {
      frame.style.height = event.data.height + "px";
    }
  });
})();
</script>
```

### Messages `postMessage`

| Direction | Type | Payload | Rôle |
|-----------|------|---------|------|
| Parent → iframe | `coffret-context` | `{ categoryId: "3394219" }` ou `{ pricingTier: "Z" }` | Applique le tarif client |
| iframe → Parent | `coffret-request-context` | `{}` | Demande la catégorie (évite la course au chargement) |
| iframe → Parent | `coffret-resize` | `{ height: 1234 }` | Ajuste la hauteur iframe |

> **Important** : `oxInfos.oxUser.catid` peut ne pas être disponible au premier `load` de l'iframe, et l'app React peut ne pas encore écouter les messages. Le script parent réessaie pendant 10 s et répond aussi à `coffret-request-context` envoyé par l'iframe une fois prête.

### Lien de partage

Le bouton **Partager** copie une URL de la forme :

```
https://www.xeilom.fr/PBCPPlayer.asp?ID=2542607&config=…
```

La base est définie dans `catalog.json` → `meta.embed.sharePageUrl`. Le paramètre `config` est transmis à l'iframe par `buildIframeSrc()` ci-dessus (sans cela, l'ouverture du lien ne restaure pas la configuration).

Ajoutez `allow="clipboard-write"` sur l'iframe pour que le bouton **Partager** copie le lien directement ; sinon une fenêtre affiche le lien à copier manuellement.

### Alternative : paramètre URL

```
https://VOTRE-APP.vercel.app/?embed=1&categoryId=3394219
```

Plus simple, mais modifiable manuellement dans la barre d'adresse (acceptable pour une estimation, pas pour un contrôle contractuel strict).

---

## Côté app — réception du contexte

Hook `useEmbedContext` :

1. Lit `?categoryId=` ou `?pricingTier=` au chargement.
2. Écoute `postMessage` avec vérification d'origine (`xeilom.fr`, referrer en dev).
3. Expose `pricingTierCode` (`"S"` … `"Z"`) passé au moteur de prix et à l'UI.

> **Note développement** : en mode `DEV` (`import.meta.env.DEV`), `isAllowedEmbedOrigin` dans `embedOrigins.js` accepte toute origine pour faciliter les tests locaux (`embed-test.html`, Vitest). En production, seules les origines Xeilom (et le referrer) sont autorisées.

Résolution ID → code (`pricingTier.js`) :

```javascript
resolvePricingTierCode("3394219")  // → "Z"
resolvePricingTierCode("3394217")  // → "S"
resolvePricingTierCode(undefined)  // → "S" (défaut)
```

---

## Chaîne tarifaire dans l'app

```
pricingTierCode (ex. "Z")
        ↓
getUnitPriceHT(sku, "Z")
        ↓
getSkuTierPriceHT(sku, "Z")  →  pricingMatrix.json
        ↓
BOM / récap / PDF / devis email
```

Disclaimer affiché : `Tarif appliqué : Tarif Z.`

---

## Adapter à un autre projet

### Checklist

- [ ] Copier `src/data/pricingTiers.json` (adapter les `categoryId` Oxatis)
- [ ] Copier `src/utils/pricingTier.js`, `pricingMatrix.js`, `pricing.js`
- [ ] Copier `src/hooks/useEmbedContext.js`, `useEmbedResize.js`, `embedOrigins.js`
- [ ] Copier `scripts/import-oxatis-pricing.mjs` + `scripts/lib/*`
- [ ] Configurer `.gitignore` pour `data/import/*`
- [ ] Lister les SKU du projet → remplir la matrice via `npm run import:pricing`
- [ ] Mettre à jour `EMBED_PARENT_ORIGINS` dans `embedOrigins.js`
- [ ] Changer `IFRAME_ORIGIN` dans le script Oxatis
- [ ] Tester avec `/embed-test.html` en local

### Personnalisation fréquente

| Élément | Fichier |
|---------|---------|
| IDs catégories Oxatis | `src/data/pricingTiers.json` |
| Mapping colonnes CSV | `scripts/lib/oxatisPricingColumns.mjs` |
| Alias SKU | `OXATIS_SKU_ALIASES` + `imageSku` dans catalogue |
| Origines iframe autorisées | `src/utils/embedOrigins.js` |
| Type message postMessage | `EMBED_CONTEXT_MESSAGE_TYPE` dans `useEmbedContext.js` |

---

## Commandes npm

```bash
npm run import:pricing    # CSV Oxatis → pricingMatrix.json
npm run sync:pricing      # catalog.json → colonne S de la matrice
npm run dev               # Dev local
npm run build             # Build production
npm run test:run          # Tests (dont import CSV et tarifs)
```

---

## Test local

Fichier `public/embed-test.html` : simule une page Oxatis avec sélecteur de catégorie et envoi `postMessage`.

```bash
npm run build && npm run preview
# Ouvrir /embed-test.html
```

---

## Notes Oxatis spécifiques Xeilom

- Site : [www.xeilom.fr](https://www.xeilom.fr)
- Intégration : page sur mesure Oxatis, iframe pleine largeur
- App déployée : `https://configurateur-coffret-de-com.vercel.app`
- Connexion client pro : les tarifs pro s'affichent après login ; `catid[0]` identifie la grille

---

## Évolutions possibles

1. **API tarifs serveur** — ne pas exposer M/B/A/Z dans le bundle ; valider session Oxatis côté backend.
2. **Token signé** — le parent envoie un JWT `{ categoryId, exp }` signé pour limiter la falsification.
3. **Re-import CI** — pipeline privé avec CSV en secret GitHub Actions → génère `pricingMatrix.json` au deploy.
4. **Mapping DTIO2** — ajouter alias si référence Oxatis trouvée (actuellement absent de l'export).

---

*Dernière mise à jour : juin 2026 — Configurateur coffrets XH'system*
