# Plateforme configurateurs

Monolithe Next.js modulaire : hub de navigation + configurateurs isolés + core partagé (Oxatis tarifs, Supabase stocks, payload standardisé).

## Démarrage

```bash
cp .env.example .env.local
# Renseigner NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY (optionnel en V1)

npm install
npm run dev
```

- Hub : [http://localhost:3000](http://localhost:3000)
- Stub : [http://localhost:3000/configurators/stub](http://localhost:3000/configurators/stub)
- Simulateur iframe Oxatis : [http://localhost:3000/embed-test.html](http://localhost:3000/embed-test.html)

## Structure

```
src/core/            # Partagé uniquement (supabase, embed, pricing, design-system, payload)
src/configurators/   # Un dossier = un configurateur, zéro import croisé
src/app/             # Hub + routes ; loaders des modules
data/import/         # CSV Oxatis (gitignored)
scripts/             # import:pricing
```

Règle d’isolation : un configurateur n’importe jamais un autre (`eslint` `no-restricted-imports`).

## Tarifs Oxatis

Voir [integration-oxatis-embed-tarifs.md](./integration-oxatis-embed-tarifs.md) et [docs/architecture.md](./docs/architecture.md).

- Contexte : `postMessage` `coffret-context` + `?categoryId=` / `?pricingTier=` / `?embed=1`
- Codes : S M B A Z (défaut S)
- Prix : `src/core/pricing/pricingMatrix.json`

```bash
# Déposer le CSV dans data/import/ puis :
npm run import:pricing
# ou : npm run import:pricing -- data/import/mon-export.csv
```

## Supabase

Variables dans `.env.local` et panneau Vercel :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Sans ces variables, l’app tourne ; le stock renvoie `unknown`. Table attendue plus tard : `stocks (sku, qty)` avec RLS.

## Déploiement Vercel

Connecter le dépôt GitHub : push sur `main` → prod ; branches → preview. Configurer les variables Supabase dans Vercel.

## Ajouter un configurateur

1. Créer `src/configurators/<id>/` (state, UI, `buildPayload` → `ConfigPayload`)
2. Ajouter l’entrée dans `src/core/registry.ts`
3. Ajouter un `case` dans `ConfiguratorSlot` (`src/app/configurators/[slug]/page.tsx`)
4. Ne rien importer depuis un autre dossier `configurators/`
