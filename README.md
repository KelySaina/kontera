# Kontera ⚡

PWA de **répartition équitable des frais d'électricité JIRAMA** entre appartements qui partagent un compteur principal, chacun disposant d'un sous-compteur.

De la **prévision** à la **régularisation réelle**, l'app calcule les contributions, les soldes, les crédits/dettes et les **transferts entre occupants** — en tenant compte de la tranche réduite (50 kWh) **partagée** par le compteur principal.

## Stack

- **Vue 3** (`<script setup>`) + **TypeScript** + **Vite**
- **Tailwind CSS**, interface en français, montants en **ariary (Ar)**
- **Pinia** pour l'état, **IndexedDB** (`idb-keyval`) pour la persistance locale
- **PWA** installable / hors-ligne (`vite-plugin-pwa`)
- **Vitest** pour les tests métier
- **Docker + Caddy** pour le déploiement, **GitHub Actions** pour le CI/CD

## Démarrer en local

```bash
npm install
npm run dev        # http://localhost:5173
```

Autres commandes :

```bash
npm test           # tests unitaires (Vitest)
npm run build      # typecheck (vue-tsc) + build de production
npm run preview    # prévisualise le build
```

## Architecture

```
src/
  domain/          # logique métier PURE (fonctions testées), zéro dépendance UI
    tariff.ts      #   cost(K) + répartition de la tranche réduite partagée
    prevision.ts   #   répartition prévisionnelle
    readings.ts    #   validation des relevés de sous-compteurs
    regularization.ts  # coût réel + écart compteur/sous-compteurs
    balances.ts    #   soldes et transferts entre occupants
    transactions.ts#   paiements vs topups vs remboursements (anti double-comptage)
    money.ts       #   arrondis ariary déterministes + répartition sans perte
  stores/          # modèle de données + store Pinia (persistance IndexedDB)
  components/      # UI (panneaux de saisie, tableau de bord)
  composables/     # accès réactif partagé au domaine
```

### Règle de tarification (centralisée, jamais dupliquée dans l'UI)

```
cout(K) = min(K, 50) * 500 + max(K - 50, 0) * 750     (Ar)
```

La tranche réduite de 50 kWh est **partagée par le compteur principal**, répartie
à parts égales entre A et B (25/25 kWh), sans jamais être attribuée à des kWh
inexistants : si l'un consomme moins que sa moitié, le reliquat revient à l'autre. Invariant garanti et testé : `coût_A + coût_B = coût_total`.

### Soldes & transferts

```
solde = paiements imputés − coût réel attribué
solde > 0 : crédit (trop payé)   |   solde < 0 : dette
```

On ne transfère entre occupants que le minimum entre le crédit de l'un et la
dette de l'autre ; aucun transfert artificiel n'est créé quand la facture n'est
pas couverte (la dette envers JIRAMA est alors affichée séparément). Un
remboursement n'est jamais recompté comme un paiement.

### Cycle de vie d'une période

`Prévision → Paiements → Relevés partiels → Relevés complets → Régularisée → Clôturée`

À la clôture, les calculs sont figés en **instantané**. Une réouverture est
explicite et tracée.

## Données & sauvegarde

Tout reste **local** dans le navigateur (IndexedDB). Pensez à **exporter**
régulièrement (Paramètres → Exporter JSON) ; l'import restaure l'intégralité de
l'état.

## Déploiement (VPS + Caddy + GitHub Actions)

À chaque push sur `main` :

1. **test** — `npm test` + `npm run build` (garde-fou).
2. **build-and-push** — image Docker (Caddy servant le build statique) poussée
   sur `ghcr.io/kelysaina/kontera`.
3. **deploy** — SSH vers le VPS, `scripts/deploy.sh` tire l'image et (re)lance le
   conteneur `kontera-web` sur `127.0.0.1:4330`.

Le **Caddy du host** fait le reverse-proxy HTTPS (certificat automatique) depuis
`https://kontera.75-119-136-160.nip.io` vers `127.0.0.1:4330`.

### Secrets GitHub attendus

| Secret     | Rôle                                            |
| ---------- | ----------------------------------------------- |
| `SSH_HOST` | IP/host du VPS                                  |
| `SSH_USER` | utilisateur SSH                                 |
| `SSH_KEY`  | clé privée de déploiement                       |
| `SSH_PORT` | (optionnel) port SSH, 22 par défaut             |
| `GHCR_PAT` | (optionnel) pour tirer une image GHCR *privée*  |

### Déploiement manuel

```bash
# sur le VPS, dans ~/kontera
IMAGE_TAG=latest bash scripts/deploy.sh
```

## Limites connues (MVP)

- Deux appartements (A/B) par compteur principal ; le modèle (étages multiples)
  est prêt pour une extension à N appartements.
- Pas de backend ni d'authentification : données locales par appareil
  (sauvegarde = export JSON).
- La répartition d'un écart compteur/sous-compteurs est proportionnelle par
  défaut (configurable : proportionnelle / égale / ignorée).
