# Ajouter au panier Oxatis depuis une autre app

Guide pratique pour connecter une application externe (iframe ou redirection) au panier [xeilom.fr](https://www.xeilom.fr/) (Oxatis).

Pour le contexte et le « pourquoi », voir aussi [`DEMARCHE.md`](./DEMARCHE.md).

---

## En résumé

| Méthode | Quand l’utiliser | UX |
| --- | --- | --- |
| **A. `postMessage` + bridge** (recommandé) | App en iframe sur xeilom.fr | Modal panier Oxatis, l’utilisateur reste sur la page |
| **B. Redirection URL** | Pas de bridge, ou app hors site | Navigation vers la page panier |

L’app **ne peut pas** appeler `AddToCart()` Oxatis depuis une autre origine : il faut le pont `oxatis-bridge.js` sur la page parent, ou une URL de secours.

---

## Prérequis

1. Connaître le **productId Oxatis** (entier), pas le SKU.
2. Pour la méthode A : coller [`oxatis-bridge.js`](../oxatis-bridge.js) sur xeilom.fr  
   (**Design → Code personnalisé → Fin de page**) et y autoriser l’origine de votre app.
3. Intégrer l’app dans une page Oxatis via iframe (méthode A).

### Retrouver un `productId`

- URL fiche : `https://www.xeilom.fr/…-c2x42291127` → `42291127`
- Ou URL stable :  
  `https://www.xeilom.fr/PBSCProduct.asp?PGFLngID=0&ItmID=42291127`

---

## Méthode A — iframe + `postMessage` (recommandée)

```
Votre app (iframe)                    Page xeilom.fr (Oxatis)
─────────────────                     ──────────────────────
postMessage XEILOM_ADD_TO_CART   →    oxatis-bridge.js
                                 ←    XEILOM_ADD_TO_CART_RESULT
                                      + OxAddToCart / AJAX panier
```

### 1. Message envoyé par l’app (iframe → parent)

```js
window.parent.postMessage(
  {
    type: "XEILOM_ADD_TO_CART",
    items: [
      { productId: 42291127, quantity: 1 }, // produit principal en premier
      { productId: 36433353, quantity: 2 }, // accessoires ensuite
    ],
    // Rétrocompatibilité (ancien format mono-produit)
    productId: 42291127,
    quantity: 1,
  },
  "https://www.xeilom.fr", // en prod : origine du parent, pas "*"
);
```

**Règles :**

- `productId` : entier Oxatis > 0
- `quantity` : entier ≥ 1
- Le **premier** item de `items` ouvre le modal panier natif
- Les items suivants sont ajoutés en AJAX **avant**, pour que le modal affiche tout le panier
- Format mono-produit encore accepté : `{ type, productId, quantity }`

### 2. Réponse du bridge (parent → iframe)

```js
{
  type: "XEILOM_ADD_TO_CART_RESULT",
  success: true,
  productId: 42291127,
  itemCount: 2,
  method: "ajax:36433353+OxAddToCart" // info debug
}
```

Écouter côté app :

```js
window.addEventListener("message", (event) => {
  if (event.origin !== "https://www.xeilom.fr") return;
  if (event.data?.type !== "XEILOM_ADD_TO_CART_RESULT") return;

  if (event.data.success) {
    // toast / UI « ajouté au panier »
  } else {
    // erreur ou fallback
  }
});
```

### 3. Autoriser l’origine de votre app dans le bridge

Dans `oxatis-bridge.js`, ajouter l’URL exacte de l’iframe (schéma + host, sans chemin) :

```js
var PROD_ORIGINS = [
  "https://configurateur-baie-19-pouces.vercel.app",
  "https://votre-autre-app.example.com", // ← à ajouter
];
```

Sans cette entrée, les messages sont **ignorés** (sécurité).

### 4. Snippet iframe côté Oxatis

```html
<iframe
  src="https://votre-app.example.com/parcours?embed=1"
  title="Mon outil"
  style="width:100%;min-height:720px;border:0;"
  loading="lazy"
></iframe>
```

### Exemple minimal (vanilla JS)

```js
const OXATIS_ORIGIN = "https://www.xeilom.fr";
const CART_TIMEOUT_MS = 3500;

function addToOxatisCart(items) {
  const payload = {
    type: "XEILOM_ADD_TO_CART",
    items,
    productId: items[0].productId,
    quantity: items[0].quantity || 1,
  };

  const inIframe = window.parent !== window;

  if (!inIframe) {
    window.location.href = buildFallbackUrl(items);
    return;
  }

  window.parent.postMessage(payload, OXATIS_ORIGIN);

  const timeoutId = setTimeout(() => {
    // Bridge absent / origine non autorisée → redirection panier
    window.top.location.href = buildFallbackUrl(items);
  }, CART_TIMEOUT_MS * items.length);

  function onResult(event) {
    if (event.origin !== OXATIS_ORIGIN) return;
    if (event.data?.type !== "XEILOM_ADD_TO_CART_RESULT") return;
    clearTimeout(timeoutId);
    window.removeEventListener("message", onResult);
  }

  window.addEventListener("message", onResult);
}

function buildFallbackUrl(items) {
  const params = items
    .map((i) => `ItmID=${i.productId}&itemQty=${i.quantity || 1}`)
    .join("&");
  return `https://www.xeilom.fr/PBShoppingCart.asp?${params}`;
}

// Usage
addToOxatisCart([
  { productId: 42291127, quantity: 1 },
  { productId: 36433353, quantity: 2 },
]);
```

Dans ce dépôt, l’équivalent React est le hook [`useAddToCart`](../xeilom-kit/hooks/useAddToCart.js).

---

## Méthode B — redirection URL (sans bridge)

Ouvre directement le panier Oxatis. Aucun script custom sur le site.

```
https://www.xeilom.fr/PBShoppingCart.asp?ItmID=42291127&itemQty=1
```

Plusieurs lignes :

```
https://www.xeilom.fr/PBShoppingCart.asp?ItmID=42291127&itemQty=1&ItmID=36433353&itemQty=2
```

```js
window.location.href =
  "https://www.xeilom.fr/PBShoppingCart.asp?ItmID=42291127&itemQty=1";

// Depuis une iframe, pour quitter l’iframe :
window.top.location.href =
  "https://www.xeilom.fr/PBShoppingCart.asp?ItmID=42291127&itemQty=1";
```

| Paramètre | Rôle |
| --- | --- |
| `ItmID` | ID produit Oxatis |
| `itemQty` | Quantité (**pas** `Qty` — ignoré à l’ajout) |

---

## Ce que fait le bridge en interne

Ordre pour plusieurs articles :

1. Accessoires (`items[1…]`) :  
   `GET /PBShoppingCart.asp?ajaxmode=1&cartRelatedProducts=1&ItmID=…&itemQty=…`  
   (délai ~400 ms entre chaque)
2. Produit principal (`items[0]`) : API native Oxatis, dans cet ordre de priorité :
   - `OxAddToCart(id, "ItmID=…&itemQty=…")`
   - `oxCart.oxAddToCart(…)`
   - `AddToCart(id)`
   - sinon redirect vers `PBShoppingCart.asp?…`

---

## Checklist d’intégration

- [ ] Récupérer les `productId` Oxatis des SKU ciblés
- [ ] Héberger l’app en HTTPS
- [ ] Créer une page Oxatis avec l’iframe
- [ ] Coller / mettre à jour `oxatis-bridge.js` (fin de page)
- [ ] Ajouter l’origine de l’app dans `PROD_ORIGINS`
- [ ] Au clic « Ajouter au panier », envoyer `XEILOM_ADD_TO_CART`
- [ ] Écouter `XEILOM_ADD_TO_CART_RESULT` + prévoir un timeout → URL fallback
- [ ] Tester connecté / déconnecté, 1 produit, puis plusieurs quantités

---

## Pièges fréquents

| Problème | Cause probable |
| --- | --- |
| Rien ne se passe au clic | Origine iframe absente de `ALLOWED_ORIGINS` / `PROD_ORIGINS` |
| Redirection systématique vers le panier | Bridge non collé, ou timeout trop court |
| Quantité toujours à 1 | Utiliser `itemQty`, pas `Qty` |
| Modal ne montre que la baie | Mettre le produit principal en **premier** dans `items` |
| Mauvais produit | SKU ≠ `productId` Oxatis |

---

## Fichiers de référence dans ce repo

| Fichier | Rôle |
| --- | --- |
| [`oxatis-bridge.js`](../oxatis-bridge.js) | Pont à coller sur xeilom.fr |
| [`xeilom-kit/hooks/useAddToCart.js`](../xeilom-kit/hooks/useAddToCart.js) | Envoi + fallback côté app |
| [`xeilom-kit/utils/embedMessages.js`](../xeilom-kit/utils/embedMessages.js) | Constantes `XEILOM_ADD_TO_CART*` + URL panier |
| [`docs/oxatis-iframe.html`](./oxatis-iframe.html) | Snippet iframe prêt à coller |
| [`host/index.html`](../host/index.html) | Mock local du bridge pour tests |
