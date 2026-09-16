# Architecture

## Responsabilités

| Zone | Rôle |
|------|------|
| `src/app` | Hub, routing, loaders (seul endroit qui importe les modules configurateurs) |
| `src/core` | Transverse : Supabase, embed Oxatis, pricing, design system, payload, registry |
| `src/configurators/*` | Modules métier isolés (state + UI + workflow propres) |

Aucun import croisé entre configurateurs.

## Flux tarifaire (Oxatis + Supabase)

```
Parent Oxatis (catid)
  → postMessage coffret-context | ?categoryId=
  → resolvePricingTierCode → S|M|B|A|Z
  → product_prices.level (2→S … 6→Z) via fetchTierPricesByProductIds
  → ConfigPayload.clientTariffCode + pricing.total
```

Panier : `docs/AJOUT-PANIER-OXATIS.md` — `useAddToCart` → `XEILOM_ADD_TO_CART` (bridge parent).

Guide tarifs historique / CSV : [integration-oxatis-embed-tarifs.md](../integration-oxatis-embed-tarifs.md).

## Flux stocks / catalogue (Supabase)

```
Configurateur cordons → arbre `categories` (« Cordons de brassage RJ45 »)
  → product_categories → products (+ facets)
  → withoutExcludedCategoryProducts (Anciens Produits)
getStockStatus(refs) → public.products (sku, qty_in_stock)
getSupabaseLinkStatus() → badge UI hub
```

Projet lié : **Product DB** (`products` ~6k lignes, `qty_in_stock`, prix dans `product_prices`).

**Règle catalogue :** ne jamais inclure les produits rattachés à la catégorie **Anciens Produits** (`product_categories` → `categories`).  
Implémentation centralisée : `src/core/catalog/excludedCategories.ts` — à utiliser pour toute lecture `products`.  
Parcours d’arbre : `src/core/catalog/categoryTree.ts`.

**RLS :** lecture catalogue autorisée pour `anon` (configurateur public / iframe).  
Écriture + `product_prices` restent réservés à `authenticated` (admin).

Si le badge affiche 0 produit : policy anon absente ou mauvaise clé projet.

## Payload standardisé

Tout configurateur valide vers `ConfigPayload` (`src/core/payload/types.ts`) : nomenclature, options/dimensions, prix, stock, code tarif S–Z.

## Ajouter un configurateur

Checklist :

1. Dossier `src/configurators/<slug>/` autonome
2. Adapter interne → `ConfigPayload` (ne pas inventer un autre contrat de sortie)
3. Entrée meta dans `registry.ts`
4. Composant : `case` dans `ConfiguratorSlot` (`app/configurators/[slug]/page.tsx`)
5. Consommer uniquement `@/core/*` + fichiers locaux du module
