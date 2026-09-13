# Architecture

## Responsabilités

| Zone | Rôle |
|------|------|
| `src/app` | Hub, routing, loaders (seul endroit qui importe les modules configurateurs) |
| `src/core` | Transverse : Supabase, embed Oxatis, pricing, design system, payload, registry |
| `src/configurators/*` | Modules métier isolés (state + UI + workflow propres) |

Aucun import croisé entre configurateurs.

## Flux tarifaire (Oxatis)

```
Parent Oxatis (catid)
  → postMessage coffret-context | ?categoryId=
  → resolvePricingTierCode → S|M|B|A|Z
  → getUnitPriceHT(sku, tier) via pricingMatrix.json
  → ConfigPayload.clientTariffCode + pricing.total
```

Guide détaillé : [integration-oxatis-embed-tarifs.md](../integration-oxatis-embed-tarifs.md).

## Flux stocks / catalogue (Supabase)

```
Configurateur → getStockStatus(refs) → public.products (sku, qty_in_stock)
getSupabaseLinkStatus() → badge UI hub/stub
```

Projet lié : **Product DB** (`products` ~6k lignes, `qty_in_stock`, prix dans `product_prices`).

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
