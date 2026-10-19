# TEMPLATIZATION — Architecture

Document de référence pour transformer `dashboard-template-frontend` d'un dépôt
d'application en un **template réutilisable et documenté**, distribuable à des
projets tiers.

Périmètre : distribution, couche données, système de tokens, site de
documentation, génération de pages par configuration, industrialisation.
Hors périmètre : évolutions fonctionnelles des features existantes (chart,
table, globe, filter, header).

---

## 0. État des lieux

Constats établis sur la branche `qb-templatization`. Ils motivent chacune des
sections qui suivent.

### 0.1 Distribution

| Constat | Impact |
|---|---|
| Le dépôt n'est pas marqué *template repository* GitHub | Le seul démarrage possible est le fork, qui crée un lien upstream parasite |
| 189 imports relatifs `../` contre 85 imports `@/` | Un fichier copié dans un autre projet casse immédiatement |
| `src/components/filter/{SelectMenu,TypeAwareInput,CalendarMonth}` et `src/components/ui/Tabs/Tab` importent `@/features/accessibility` | Violation de la règle de couche de `CLAUDE.md` ; copier `SelectMenu` embarque une feature entière |
| `src/components/common/VisuallyHidden/` existe mais est vide | Migration de couche entamée, jamais terminée |
| `three`, 12 paquets `@visx/*` et 6 paquets `d3-*` en `dependencies` racine | Qui ne veut que le header installe le moteur 3D |
| `README.md` = boilerplate `create-next-app` ; `CLAUDE.md` et `DESIGN_SYSTEM.md` sont dans `.gitignore` | La meilleure documentation du dépôt n'est pas publiée |

### 0.2 Couche données

| Constat | Impact |
|---|---|
| L'intégration GraphQL réelle est un **bloc commenté** dans chaque source (`src/features/table/sources/useFactTableWithMetadata.js`, `src/features/chart/sources/useFactTable.js`) | Code jamais exécuté, jamais linté, jamais testé — il pourrit ; brancher l'API impose d'éditer 3 à 4 fichiers |
| Aucun client GraphQL installé ; `factTableQuery.js` définit un tag `gql` d'identité local | Les documents de requête ne sont validés contre aucun schéma |
| Aucun `.env.example`, aucun schéma SDL committé | L'utilisateur tiers ne sait pas quoi configurer |

### 0.3 Configuration et génération de pages

| Constat | Impact |
|---|---|
| `config/navigation.json`, `config/navigation_new.json`, `config/navigation_new2.json` coexistent ; seul `navigation_new.json` est consommé (`src/app/layout.tsx:7`) | Le premier fichier qu'ouvre l'utilisateur existe en trois versions |
| Aucun JSON Schema, aucune validation | Une faute de frappe dans la config casse silencieusement le rendu |
| `config/` est **hors de `src/`**, donc non couvert par l'alias `@/*` (`tsconfig.json`) | Imports relatifs `../../config/…` obligatoires |
| Les suggestions de `SearchBar` sont un tableau de chaînes codé en dur (`src/features/header/components/SearchBar/SearchBar.jsx`, `handleInputChange`) | La recherche ne connaît pas l'arborescence réelle du site |
| Aucune route générée : chaque page est un dossier physique dans `src/app/` | « Ajouter 200 indicateurs » = créer 200 dossiers |

### 0.4 Système de tokens

| Constat | Impact |
|---|---|
| **Deux systèmes de couleurs parallèles** : `src/styles/globals/colors.scss` (monolithe, primitives + sémantiques mêlées) et `src/styles/globals/primitives/colors.scss` + `src/styles/globals/tokens/semantic-colors.scss` (cascade documentée dans `CLAUDE.md`) | Les mêmes propriétés sont déclarées deux fois, depuis deux sources |
| Le monolithe est celui chargé globalement (`globals.scss` → `resets.scss` → `custom-properties.scss` → `./colors`) ; la version scindée n'est atteinte que par 7 `_colors.scss` de composants qui la `@use`nt directement | Le résultat dépend de l'ordre de compilation ; un tiers qui surcharge « les primitives » peut ne rien voir changer |
| `scripts/check-palette-sync.js` lit le **monolithe** comme source de vérité | Le garde-fou pointe vers le fichier que la cascade documentée déclare obsolète |
| Alias legacy `--bg-color`, `--text-color`, `--card-bg`, `--code-bg` marqués « à migrer » dans `semantic-colors.scss` | Deux noms pour le même rôle |
| 818 propriétés personnalisées distinctes réparties sur 90 fichiers `_tokens.scss` / `_colors.scss` | Une page de documentation rédigée à la main serait obsolète en une semaine |

### 0.5 Qualité

Aucun test (unitaire, intégration ou visuel). Aucun workflow CI
(`.github/` absent). Aucun `CHANGELOG.md`, aucun versionnage sémantique.
Résidus : `src/features/.next/` (répertoire de build égaré dans les sources),
`src/app/components-test/` (vide).

Les 8 pages `src/app/test-*/`, `src/app/filter-primitives/` et
`src/app/_playground/` sont des **bancs d'essai de développement** : elles ont
servi à valider le comportement des composants sous différentes combinaisons de
paramètres au moment de leur implémentation. Elles n'ont pas vocation à être
livrées dans le template — leur rôle est repris par le site de documentation
(§5.1), qui hérite au passage de leur motif de contrôles interactifs.

---

## 1. Modèle de distribution

### 1.1 Décision

Trois modes de réutilisation, servis par **deux mécanismes** et non trois.

| Besoin de l'utilisateur | Mécanisme | Statut |
|---|---|---|
| Démarrer un nouveau dashboard from scratch | *Template repository* GitHub (« Use this template ») | À activer |
| Piocher un composant ou une feature dans un projet **existant** | Registry façon `shadcn/ui`, servi par GitHub Pages | À construire |
| Consommer la logique pure sans le style | Paquet npm `@…/dashboard-core` | **Différé** (voir 1.4) |

### 1.2 Pourquoi pas le fork

Le fork crée un lien upstream permanent qui ne correspond pas à l'usage visé :
personne ne veut merger l'historique de refonte du globe dans le dashboard d'un
client. Il pollue l'historique, et sur GitHub les forks partagent le réseau du
dépôt parent (routage des issues et PR). Le fork est l'outil de la
**contribution en retour**, pas du démarrage de projet. Le *template
repository* donne exactement le résultat attendu — copie complète, historique
vierge, aucun lien parasite — pour une case à cocher dans les réglages.

### 1.3 Le registry

Le format de registry `shadcn` est ouvert : un `registry.json` décrit une liste
d'items, chacun déclarant ses fichiers, ses dépendances npm et ses dépendances
internes (`registryDependencies`). La CLI `shadcn` sait consommer un registry
tiers par URL. Conséquence : **aucune CLI à écrire**, et le registry se publie
sur les mêmes GitHub Pages que la documentation.

```
https://<user>.github.io/dashboard-template-frontend/
├── (site de documentation)
└── r/
    ├── registry.json          ← index
    ├── select-menu.json       ← item : fichiers + deps
    ├── chart.json
    └── …
```

Un item type :

```jsonc
{
  "name": "chart",
  "type": "registry:block",
  "dependencies": ["@visx/axis", "@visx/scale", "d3-array", "swr"],
  "registryDependencies": ["tokens-global", "select-menu", "hover-toolbar"],
  "files": [
    { "path": "src/features/chart/components/Chart/Chart.jsx", "type": "registry:component" },
    { "path": "src/features/chart/_tokens.scss", "type": "registry:file" }
  ]
}
```

Le registry résout mécaniquement le problème du poids des dépendances (0.1) :
`three` n'est plus une dépendance du template, c'est une dépendance de l'item
`globe`.

### 1.4 Pourquoi différer le paquet npm

Trois frictions cumulées : la distribution de SCSS non compilé, les frontières
`'use client'` / Server Components de Next 16 qui se négocient mal à travers
une frontière de paquet, et surtout le principe même du template — les
utilisateurs **doivent** pouvoir éditer les tokens et le SCSS, ce qu'un
`node_modules/` interdit. À reconsidérer plus tard pour la seule couche pure
(`src/utils/`, `src/hooks/`, moteurs de filtre), qui est stable et non stylée.

### 1.5 Prérequis bloquants

Le registry ne distribue du code utilisable que si ce code est **relocalisable**.
D'où l'ordre imposé : normalisation (§2) avant registry (§5).

---

## 2. Normalisation préalable

### 2.1 Imports

Règle unique : **tout import inter-dossiers passe par `@/`**. Les imports
relatifs ne subsistent que pour les fichiers frères d'un même composant
(`./Chart.scss`, `./useSeriesHover`).

Extension nécessaire de `tsconfig.json` — `config/` étant hors de `src/`, il
faut soit l'aliaser, soit le déplacer :

```jsonc
"paths": {
  "@/*": ["./src/*"],
  "@config/*": ["./config/*"]
}
```

### 2.2 Couches

La règle de `CLAUDE.md` — `src/components/` ne doit jamais importer depuis
`src/features/` — est violée par la feature `accessibility`. Résolution :
les primitives d'accessibilité descendent d'une couche.

```
src/features/accessibility/
├── components/VisuallyHidden   →  src/components/common/VisuallyHidden   (dossier déjà créé, vide)
├── components/AccessibleIcon   →  src/components/common/AccessibleIcon
├── components/SkipLink         →  src/components/common/SkipLink
├── hooks/useFocusTrap          →  src/hooks/accessibility/useFocusTrap
├── hooks/useAriaAnnounce       →  src/hooks/accessibility/useAriaAnnounce
├── hooks/useKeyboardNavigation →  src/hooks/accessibility/useKeyboardNavigation
└── services/AriaAnnouncer      →  src/utils/accessibility/AriaAnnouncer
```

Un baril `src/components/common/index.js` + `src/hooks/accessibility/index.js`
préserve la forme d'import agrégée aujourd'hui offerte par
`@/features/accessibility`.

### 2.3 Inventaire des dépendances

Chaque item du futur registry doit déclarer ses dépendances npm réelles. Elles
se dérivent par analyse statique des imports du sous-arbre de fichiers de
l'item, pas à la main.

---

## 3. Couche données et intégration API

### 3.1 Principe : injection de transport

Le bloc commenté « à décommenter pour brancher l'API » est remplacé par un
**transport injectable**. Le mode se choisit par variable d'environnement, plus
par édition de fichiers.

```
src/lib/api/
├── client.js       # sélectionne le transport selon NEXT_PUBLIC_API_URL
├── transports/
│   ├── graphql.js  # POST vers l'endpoint réel
│   └── mock.js     # résout depuis les fixtures locales
└── documents/      # documents GraphQL partagés (déplacés depuis features/*/sources/)
```

Contrat : `client.request(document, variables, { catalog, schema }) → Promise`.

Les `sources/` de chaque feature conservent leur rôle exact — construire la clé
SWR et normaliser la forme de retour — et deviennent **identiques dans les deux
modes**. `useFactTableWithMetadata` passe de 95 lignes dont 24 de code mort à
un appel `client.request` unique.

Les fixtures actuelles (`mockFactTable.json`, `demoData.js`) sont conservées ;
elles cessent d'être un « repli » pour devenir la base de données du transport
mock.

### 3.2 Serveur mock : GraphQL réel, pas JSON statique

Le transport mock du 3.1 sert le développement de composants isolés. Pour la
démo et les tests d'intégration, le template expose un **vrai endpoint** :
`graphql-yoga` + `@graphql-tools/mock`, servant le **SDL exporté du dépôt API**
et committé ici en `schema.graphql`.

Trois bénéfices d'un seul mécanisme :

1. `npm run dev:mock` lance un endpoint réel sur données fictives — les
   composants s'y branchent sans aucune modification ;
2. les documents de requête sont **validés contre le vrai schéma** en CI
   (aujourd'hui rien ne garantit que `GET_FACT_TABLE_WITH_METADATA` compile
   côté serveur) ;
3. la porte est ouverte au codegen typé lors du passage en TypeScript.

Scripts cibles :

```jsonc
"dev"       : "next dev",                              // transport mock en mémoire
"dev:mock"  : "concurrently \"npm:mock:api\" \"next dev\"",  // + endpoint GraphQL local
"mock:api"  : "node scripts/mock-api-server.js",
"dev:api"   : "cross-env NEXT_PUBLIC_API_URL=http://localhost:4000/graphql next dev",
"check:gql" : "graphql-inspector validate ..."         // documents vs schema.graphql
```

### 3.3 Documentation associée

`.env.example` + une page « Brancher l'API » dans le site de doc. La
documentation se réduit à une variable d'environnement — c'est le bon niveau de
détail, et il ne peut pas diverger du code.

---

## 4. Système de tokens

Section de référence : c'est le mécanisme par lequel un utilisateur tiers
change l'apparence des composants **sans en modifier le code**. Elle décrit la
cible ; le 4.6 liste la dette à résorber pour que la cible soit la réalité.

### 4.1 La cascade en quatre niveaux

```
┌─ Niveau 1 ─ PRIMITIVES ──────────────────────────────────────────────┐
│ src/styles/globals/primitives/colors.scss                            │
│ Triplets HSL bruts. Aucun var(), aucun alias.                        │
│   --color-primary-500: 209 79% 24%;                                  │
└──────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ Niveau 2 ─ TOKENS SÉMANTIQUES ──────────────────────────────────────┐
│ src/styles/globals/tokens/semantic-colors.scss  (couleurs par rôle)  │
│ src/styles/globals/typography.scss   (tailles, espacements, rayons,  │
│                                       ombres, transitions, z-index)  │
│   --color-text-primary: var(--color-gray-900);                       │
│   --spacing-lg: 1rem;   --z-dropdown: 1000;                          │
└──────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ Niveau 3 ─ TOKENS DE FEATURE ───────────────────────────────────────┐
│ src/features/[feature]/_tokens.scss  +  _colors.scss                 │
│ Préfixe --[feature]-*. Mutualisé entre les composants de la feature. │
│   --header-height: 4rem;                                             │
│   --header-control-size: 2.25rem;                                    │
└──────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─ Niveau 4 ─ TOKENS DE COMPOSANT ─────────────────────────────────────┐
│ src/features/[feature]/components/[C]/_tokens.scss  +  _colors.scss  │
│ Préfixe --[composant]-*. Valeur par défaut = token de feature.       │
│   --sidebar-toggle-size: var(--nav-toggle-size);                     │
└──────────────────────────────────────────────────────────────────────┘
```

Le même schéma s'applique aux composants de `src/components/` (niveaux 1, 2, 4 —
pas de niveau feature).

### 4.2 Les invariants du système

Quatre règles rendent la cascade prévisible. Elles sont déjà appliquées dans le
code ; la documentation doit les énoncer explicitement.

**(a) Les couleurs sont stockées en triplets HSL sans fonction.**

```scss
--color-primary-500: 209 79% 24%;   /* et non hsl(209 79% 24%) */
```

Consommation obligatoire en `hsl(var(--token))`. C'est ce qui rend l'opacité
possible sans dupliquer le token :

```scss
background: hsl(var(--color-primary-500) / 0.12);
```

**(b) Un token n'est déclaré qu'au niveau où il est partagé.**

Règle inscrite en tête de chaque fichier de tokens : *si une variable n'est
utilisée que dans UN composant, elle descend au niveau 4*. Cela borne le nombre
de tokens visibles à chaque niveau et garantit qu'un token de niveau 3 a
toujours au moins deux consommateurs.

**(c) `calc()` plutôt qu'un nouveau token.**

```scss
--header-logo-height: calc(var(--header-height) - 2 * var(--header-padding-y));
```

La relation entre deux dimensions est exprimée, pas recopiée. Changer
`--header-height` propage correctement.

**(d) Pilote unique.**

Une dimension partagée par plusieurs éléments a **un seul** token source, dont
les autres dérivent. Exemples en vigueur : `--header-control-size` pilote la
taille du logo, la hauteur de la barre de recherche et le bouton de thème ;
`--nav-toggle-size` pilote la hauteur de rangée de navigation (le padding
vertical en est dérivé, de sorte que toute rangée parente mesure exactement la
taille du toggle).

### 4.3 Le thème sombre

La bascule se fait par un attribut `data-theme` sur `<html>`, posé avant le
premier paint par le script anti-FOUC de `src/app/layout.tsx`, puis relu par
`ThemeProvider` comme source unique de vérité.

Point important pour un tiers : **le mode sombre se joue aux niveaux 1 et 2
uniquement**. Les niveaux 3 et 4 n'ont pas à connaître le thème — ils
consomment des rôles, et les rôles changent de valeur sous `[data-theme="dark"]`.

```scss
:root                 { --color-gray-900: 220 39% 11%; }  /* niveau 1 clair  */
[data-theme="dark"]   { --color-gray-900: 210 40% 96%; }  /* niveau 1 sombre */
:root                 { --color-text-primary: var(--color-gray-900); }  /* niveau 2, inchangé */
```

Un token de niveau 3 ou 4 qui doit être redéfini sous `[data-theme]` signale
presque toujours qu'il consomme une primitive au lieu d'un rôle.

État réel, mesuré par `scripts/build-tokens-doc.js` (champ
`darkOverridesBelowLevel2` de `public/tokens.json`, et filtre « Exceptions —
niveaux 3-4 » de la page Tokens) : **82 propriétés de niveau 3–4 portent une
surcharge sombre**, contre 21 aux niveaux 1–2. Deux familles :

- **légitime** — la palette WebGL du globe (7 propriétés) : ce ne sont pas des
  couleurs de chrome dérivables d'un rôle, mais celles d'une scène 3D ;
- **dette** — l'essentiel du reste, concentré sur `features/header` (42
  propriétés), qui consomme des nuances au lieu de rôles.

`--chart-bar-normalize` n'est plus une exception : il consomme `--color-violet`,
primitive qui bascule au niveau 1. C'est le motif à généraliser.

### 4.4 Comment un utilisateur tiers change l'apparence

Quatre niveaux d'intervention, du moins au plus invasif. Les trois premiers ne
touchent **aucun fichier du template** : ce sont des surcharges, appliquées à
l'exécution, et scopables à un sous-arbre du DOM.

**Niveau A — Rebranding global (≈ 10 lignes).**
Surcharger les primitives dans une feuille chargée après les globals. Toute
l'interface suit, thème sombre compris.

```scss
/* app/theme-override.scss, importé après globals.scss */
:root {
  --color-primary-500: 271 76% 53%;
  --color-primary-200: 271 76% 85%;
}
[data-theme="dark"] {
  --color-primary-500: 271 76% 72%;
}
```

**Niveau B — Ajustement d'un rôle.**
Quand le mappage primitive → rôle ne convient pas (surfaces plus contrastées,
texte secondaire plus sombre) sans toucher à la palette.

```scss
:root {
  --color-surface: var(--color-white);
  --color-border:  var(--color-gray-300);
}
```

**Niveau C — Personnalisation d'un composant, éventuellement locale.**
Les tokens étant des propriétés personnalisées CSS (et non des variables SCSS),
la surcharge **hérite** : elle peut être limitée à un sous-arbre.

```scss
/* un header compact sur cette page uniquement */
.page-dense {
  --header-height: 3rem;
  --header-control-size: 1.75rem;
  --nav-link-font-size: var(--font-size-xs);
}
```

C'est le mode d'emploi le plus important à documenter : il permet **deux
apparences du même composant sur la même page**, sans variante de code, sans
prop supplémentaire, sans rebuild.

**Niveau D — Édition des fichiers.**
Réservé au changement structurel (nouvelle disposition, nouveau sous-composant).
C'est le mode assumé pour qui installe via le registry : le code lui appartient.

Corollaire de conception à respecter dans tout nouveau composant : **aucune
valeur d'apparence ne doit être atteignable uniquement par une prop JS**. Toute
dimension, couleur, durée ou élévation passe par un token, sinon les niveaux
A–C perdent leur pouvoir.

### 4.5 Les échappatoires JavaScript

**Une seule** échappatoire subsiste. Elle doit être documentée explicitement —
sans quoi un tiers change la palette et constate que ses graphiques n'ont pas
bougé.

| Consommateur | Fichier | Statut |
|---|---|---|
| Échelles de couleur des graphiques | `src/features/chart/utils/encoding.js` (`PALETTE`, `SEQUENTIAL`) | **Échappatoire.** d3/visx exigent des chaînes concrètes, résolues au chargement du module (SSR compris) et parsables par `d3-color` pour l'export canvas ; un `var(--…)` non résolu y échoue |
| Palette WebGL du globe | `src/features/globe/_colors.scss` → `--globe-*` | Cas **résolu** : `engine/palette.js::readGlobePalette` lit les tokens sur le conteneur via `getComputedStyle` et les relit à chaque bascule de thème. `FALLBACK_PALETTE` n'est qu'un repli si la feuille de la feature n'est pas chargée — le recoloriage se fait en SCSS, sans toucher au JS |
| Seuils de points de rupture | `src/styles/globals/typography.scss` → `--breakpoint-*` | Cas **résolu** : les seuils sont exposés en propriétés CSS et relus en JS via `getComputedStyle` (`src/features/header/hooks/useNavigation.js`) |

Contrat pour l'échappatoire restante : le SCSS reste la source de vérité, le JS
en est un **miroir numérique**, et `npm run check:palette`
(`scripts/check-palette-sync.js`) fait échouer `npm run verify` en cas de
dérive. La documentation indique les deux fichiers à éditer conjointement
(`primitives/colors.scss` + `encoding.js`), ainsi que les deux pièges du
fichier : la syntaxe `hsl(h, s%, l%)` **à virgules** est obligatoire (`d3-color`
lit la syntaxe CSS Color 4 comme du noir), et le commentaire `// --color-<nom>`
en fin de ligne est **lu par le script**.

Les deux lignes « résolues » sont le modèle à imiter : exposer la valeur en
propriété CSS et la relire en JS, plutôt que de la dupliquer.

### 4.6 Dette à résorber (prérequis à la documentation)

1. **Unifier les deux systèmes de couleurs.** `src/styles/globals/colors.scss`
   (monolithe chargé globalement) et le couple `primitives/colors.scss` +
   `tokens/semantic-colors.scss` (cascade documentée, `@use`é par 7 composants)
   déclarent les mêmes propriétés. Cible : supprimer le monolithe, faire
   pointer `custom-properties.scss` vers `primitives/` + `tokens/`, et
   repointer `check-palette-sync.js` vers `primitives/colors.scss`.
2. **Supprimer les alias legacy** `--bg-color`, `--text-color`,
   `--heading-color`, `--card-bg`, `--border-color`, `--code-bg` au profit des
   rôles de niveau 2, comme annoncé en commentaire dans `semantic-colors.scss`.
3. **Normaliser les `@use`** : `@use '@/styles/globals/…'` partout (aujourd'hui
   mélange de chemins relatifs à profondeur variable, dont un
   `'../../../../styles//globals/typography'` à double slash dans
   `Footer.scss`).
4. **Sortir `DESIGN_SYSTEM.md` du `.gitignore`** : c'est la documentation de
   référence du système, elle doit être publiée.

---

## 5. Registry et site de documentation

### 5.1 Principe fondateur : la documentation remplace les pages de test

Les 8 pages `/test-*` et `src/app/_playground/` ont rempli leur office —
vérifier le comportement des composants sous différentes combinaisons de
paramètres pendant leur implémentation. Elles sont **supprimées** : la
documentation reprend intégralement ce rôle, et devient par la même occasion
la surface de développement du template.

Conséquence à assumer explicitement : le site de documentation vit **dans
l'application** (segment `(docs)` de l'App Router, cf. §5.4), pas dans un
projet séparé. `npm run dev` sert la documentation ; ajouter un composant se
fait en écrivant sa page de documentation, qui est aussi son banc d'essai.
C'est du dogfooding, et c'est ce qui garantit que la documentation ne se
périme pas : elle casse en même temps que le code.

### 5.2 Deux artefacts distincts, à ne pas confondre

Le remplacement demande **deux** mécanismes, qui répondent à deux questions
différentes. Les fondre en un seul les rendrait tous deux médiocres.

| | **Playground** | **Exemple** |
|---|---|---|
| Question posée | « que fait ce composant si je change ce paramètre ? » | « à quoi ressemble l'usage canonique ? » |
| Forme | contrôles interactifs pilotant les props | fichier `.jsx` autonome et figé |
| Code affiché | **généré** depuis l'état courant des contrôles | source du fichier, lu au build |
| Nombre par composant | un | plusieurs (un par cas d'usage) |
| Sert aussi à | l'exploration, le développement | l'installation par le registry |
| Emplacement | `docs/playgrounds/[composant].jsx` | `registry/examples/*.jsx` |

Le playground est ce que tu avais construit en haut des pages `/test-*` avec
`PlaygroundControls` — c'est ce motif qui monte dans la documentation. Les
exemples, eux, restent nécessaires : un item de registry doit pointer vers des
fichiers concrets, et une configuration de playground n'en est pas un.

### 5.3 Le playground : contrôles + code généré

La combinaison choisie par l'utilisateur doit être **copiable telle quelle**.
Le code affiché n'est donc pas un fichier source : il est sérialisé depuis
l'état courant des contrôles.

```
┌─ Contrôles ────────────────────────────────────────────────┐
│  x  [ age ▾ ]   y  [ revenu ▾ ]   hue  [ région ▾ ]        │
│  Type   ( auto ) ( scatter ) ( line )    Légende  [✓]      │
└────────────────────────────────────────────────────────────┘
┌─ Rendu ────────────────────────┬─ Code ────────────────────┐
│                                │  <Chart                   │
│        (le composant)          │    data={data}            │
│                                │    x="age"                │
│                                │    y="revenu"             │
│                                │    hue="region"           │
│                                │    showLegend              │
│                                │  />           [ Copier ]  │
└────────────────────────────────┴───────────────────────────┘
```

Mécanisme : chaque playground déclare un **schéma de contrôles** — pour chaque
prop pilotable, son type, ses valeurs possibles et sa valeur par défaut. Ce
schéma alimente à la fois le rendu des contrôles et un sérialiseur JSX
générique.

```js
// docs/playgrounds/chart.jsx
export const controls = {
  x:          { type: 'select', options: ['age', 'revenu', 'date'], default: 'age' },
  y:          { type: 'select', options: ['age', 'revenu'],         default: 'revenu' },
  hue:        { type: 'select', options: [null, 'region', 'sexe'],  default: null },
  showLegend: { type: 'boolean',                                    default: true },
};

// Gabarit : ce qui entoure les props sérialisées (imports, données, wrapper).
export const scaffold = { component: 'Chart', imports: […], data: 'demoData' };
```

Deux règles pour que le code généré soit réellement utilisable :

1. **Les props à leur valeur par défaut sont omises** de la sortie. Sans cela,
   l'utilisateur copie quinze props dont deux l'intéressent.
2. **Le code inclut ses imports et son jeu de données**, via le `scaffold`.
   Un fragment `<Chart x="age" />` non collable dans un fichier vierge rate sa
   cible.

Le sérialiseur est **générique** : il transforme un objet de props en JSX
(chaînes entre guillemets, booléens `true` en attribut nu, objets et tableaux
en accolades, `null`/`undefined` omis). Un sérialiseur par composant serait
ingérable sur 30 composants.

### 5.4 Le registry et les exemples

Un script de build (`scripts/build-registry.js`) émet un module `__registry__`
associant à chaque exemple **le composant et son code source brut** (lu par
`fs` au build). C'est le mécanisme de `shadcn/ui`, et il alimente le composant
`<ComponentPreview>` (onglets rendu / code) utilisé pour les cas d'usage
canoniques et dans les guides.

```
registry/examples/chart-hue.jsx
        │
        ├──→ rendu + code figé dans la doc (<ComponentPreview>)
        └──→ listé dans registry.json (installation par CLI)
```

### 5.5 Structure du site

Site statique exporté vers GitHub Pages : `output: 'export'` + `basePath` dans
`next.config.ts`.

```
Introduction
├── Pourquoi ce template / à qui il s'adresse
├── Installation (template repo | registry CLI)
└── Structure du projet (les 5 couches de src/)

Fondations
├── Design system — vue d'ensemble de la cascade (§4.1–4.3)
├── Tokens — référence GÉNÉRÉE depuis le SCSS (§5.3)
├── Theming — les 4 niveaux d'intervention (§4.4), avec exemples éditables
├── Thème sombre — data-theme, anti-FOUC, où redéfinir quoi
└── Accessibilité — conventions ARIA, focus, navigation clavier

Composants        (un par item de registry)
├── Playground — contrôles interactifs + code généré copiable (§5.3)
├── Installation (commande CLI)
├── Table des props — GÉNÉRÉE depuis les JSDoc (react-docgen)
├── Tokens du composant — GÉNÉRÉE depuis son _tokens.scss / _colors.scss
└── Cas d'usage (un ComponentPreview par exemple du registry)

Features          (chart, table, filter, header, globe)
└── idem + section « Données » : forme attendue, requête GraphQL associée

Blocks            ← assemblages complets : page indicateur, page entité,
                    filtre + chart + table câblés

Guides
├── Brancher l'API GraphQL
├── Générer des pages depuis un JSON
├── Alimenter la barre de recherche
└── Internationalisation
```

La section **Blocks** est celle qui a le plus de valeur d'usage : c'est ce que
les gens copient réellement, plus que les atomes.

### 5.6 Les contenus générés

Quatre contenus doivent être **dérivés du code**, jamais rédigés :

| Contenu | Source | Outil |
|---|---|---|
| Référence des tokens | les 90 fichiers `_tokens.scss` / `_colors.scss` (818 propriétés) | parseur SCSS maison → JSON au build |
| Tables de props | les JSDoc Google déjà présentes dans chaque composant | `react-docgen` |
| Code des exemples | `registry/examples/*` | `scripts/build-registry.js` |
| Code des playgrounds | l'état courant des contrôles | sérialiseur JSX générique, au runtime (§5.3) |

Pour la page tokens, le rendu attendu va au-delà d'un tableau : chaque token
affiche son **nom**, sa **valeur résolue en clair et en sombre**, sa
**pastille** s'il s'agit d'une couleur, son **niveau de cascade**, et sa
**chaîne de dérivation** (`--sidebar-toggle-size` → `--nav-toggle-size` →
`calc(--spacing-xl + --spacing-xs)`). C'est cette chaîne qui apprend à un tiers
*à quel niveau surcharger* pour obtenir l'effet voulu.

---

## 6. Génération de pages par configuration

C'est le cœur fonctionnel du template, et la partie la moins avancée.

### 6.1 Manifeste unique et validé

Un manifeste versionné remplace les trois `navigation*.json` :

```
config/
├── site.config.json          # manifeste unique
├── content/home.json
├── filter/operations.json
└── schema/
    ├── site.schema.json      # JSON Schema (draft 2020-12)
    └── content.schema.json
```

Le manifeste déclare son propre schéma :

```jsonc
{
  "$schema": "./schema/site.schema.json",
  "site": { "title": "…", "locale": "fr" },
  "navigation": { "type": "sidebar", "useSwitcher": false, "tree": [ … ] },
  "pageTypes": { … }
}
```

`npm run validate:config` (ajv) rejoint la chaîne `verify`. Le gain principal
est le **DX de l'utilisateur tiers** : avec `$schema`, son éditeur lui donne
l'autocomplétion et signale ses fautes de frappe pendant qu'il édite. Pour un
template, cela vaut plus qu'un chapitre de documentation.

### 6.2 Routes générées

Les pages ne sont plus des dossiers physiques mais une **route attrape-tout**
alimentée par le manifeste :

```
src/app/[...slug]/page.jsx
  ├── generateStaticParams()  → aplatit l'arbre du manifeste en chemins
  └── résout node.type → registry de types de page
```

```js
// src/config/pageTypes.js — mappe un type déclaré en JSON vers un rendu
export const PAGE_TYPES = {
  home:      { component: HomePage,      query: null },
  person:    { component: EntityPage,    query: GET_ENTITY },
  indicator: { component: IndicatorPage, query: GET_FACT_TABLE_WITH_METADATA },
};
```

Les types `home`, `person`, `indicator` sont **déjà présents** dans
`config/navigation.json` — la structure de données anticipe ce mécanisme, seule
la résolution manque. Un nouveau type de page = une entrée dans ce registre.
Deux cents indicateurs = un tableau JSON, éventuellement produit par un appel
API au build.

### 6.3 Index de recherche dérivé

Au build, un script fusionne les nœuds du manifeste et, optionnellement, des
entités remontées de l'API, puis émet `public/search-index.json`. `SearchBar`
le consomme à la place de ses suggestions codées en dur.

Nav et recherche deviennent alors **structurellement incapables de diverger** :
elles ont la même source.

---

## 7. Qualité et industrialisation

### 7.1 Tests

Pour du code que des tiers embarquent, la priorité va aux parties pures et aux
contrats publics :

| Niveau | Cible | Outil |
|---|---|---|
| Unitaire | `features/table/utils/defaultFilterEngine`, `formatCell`, `features/chart/toolbar-features/channelAssign`, `features/filter/utils/filterTypes`, `utils/format/*` | Vitest |
| Composant | contrats d'accessibilité (rôles ARIA, navigation clavier, focus trap) | Vitest + Testing Library |
| Validation | manifeste de config vs JSON Schema ; documents GraphQL vs `schema.graphql` | ajv, graphql-inspector |
| Fumée | les pages de démo se chargent sans erreur console | Playwright |
| Visuel | régression sur les composants clés, en clair **et** en sombre | Playwright screenshots |

La régression visuelle est le filet réellement pertinent pour un template dont
le produit est l'apparence.

### 7.2 CI

`.github/workflows/` :

- `verify.yml` — `lint` + `check:palette` + `validate:config` + `check:gql` +
  tests + build, sur PR et push.
- `docs.yml` — build du site + du registry, déploiement GitHub Pages sur `main`.

Point de vigilance : vérifier que `next build` passe sur un arbre propre avant
d'en faire une barrière CI (le répertoire `design-system/`, gitignoré, a
historiquement fait échouer le build complet).

### 7.3 Versionnage

`CHANGELOG.md` + tags SemVer. Lorsqu'on distribue par copie, le changelog est
le **seul** moyen pour un utilisateur de savoir ce qui a bougé depuis sa copie :
il remplace la mise à jour automatique qu'un paquet npm offrirait.

`CONTRIBUTING.md` si le dépôt s'ouvre aux contributions externes.

### 7.4 Internationalisation

Un template destiné à des tiers ne peut pas imposer des libellés français
codés en dur. Cible minimale : un dictionnaire de labels par composant,
surchargeable par prop, avec le français en valeur par défaut — pas
nécessairement une librairie i18n complète.

---

## 8. Arborescence cible

```
dashboard-template-frontend/
├── .github/workflows/          ← NOUVEAU  verify.yml, docs.yml
├── config/
│   ├── site.config.json        ← REMPLACE navigation{,_new,_new2}.json
│   └── schema/*.schema.json    ← NOUVEAU
├── docs/                       ← NOUVEAU  contenu du site de documentation
│   ├── content/*.mdx           ← pages rédigées
│   └── playgrounds/*.jsx       ← schémas de contrôles (REMPLACE src/app/test-*)
├── registry/                   ← NOUVEAU
│   ├── registry.json
│   └── examples/*.jsx          ← cas d'usage figés, installables
├── scripts/
│   ├── check-palette-sync.js
│   ├── build-registry.js       ← NOUVEAU
│   ├── build-tokens-doc.js     ← NOUVEAU
│   ├── build-search-index.js   ← NOUVEAU
│   └── mock-api-server.js      ← NOUVEAU
├── src/
│   ├── app/
│   │   ├── (docs)/             ← NOUVEAU  routes du site de documentation
│   │   └── [...slug]/page.jsx  ← NOUVEAU  routes générées
│   ├── components/
│   │   └── common/             ← accueille les primitives d'accessibilité
│   ├── config/pageTypes.js     ← NOUVEAU  registre type → composant
│   ├── features/               ← accessibility/ démantelée
│   ├── hooks/accessibility/    ← NOUVEAU
│   ├── lib/api/                ← NOUVEAU  transport injectable
│   ├── styles/
│   │   └── globals/
│   │       ├── primitives/     ← seule source des valeurs brutes
│   │       └── tokens/         ← seule source des rôles
│   └── utils/accessibility/    ← NOUVEAU
├── schema.graphql              ← NOUVEAU  SDL du dépôt API
├── .env.example                ← NOUVEAU
├── CHANGELOG.md                ← NOUVEAU
├── DESIGN_SYSTEM.md            ← à sortir du .gitignore
└── README.md                   ← à réécrire
```

Suppressions : les 8 pages `src/app/test-*/` et `src/app/filter-primitives/`
(rôle repris par les playgrounds de documentation, §5.1),
`src/app/_playground/` (`PlaygroundControls` migre vers l'infrastructure de
documentation), `src/features/.next/`, `src/app/components-test/`,
`src/styles/globals/colors.scss`, `config/navigation_new*.json`.

---

## 9. Séquencement

Le chemin critique passe par la **normalisation** avant la distribution :
un registry qui distribue du code non relocalisable ne sert à rien.

```
Lot 0  Hygiène & fondations
  └─→ Lot 1  Normalisation (imports, couches, tokens unifiés)
        ├─→ Lot 2  Couche données                    ┐
        ├─→ Lot 3  Configuration & pages générées    ├─ parallélisables
        └─→ Lot 4  Registry & site de documentation  ┘
              └─→ Lot 5  Qualité & industrialisation
```

| Lot | Contenu | Dépend de |
|---|---|---|
| 0 | README, docs publiées, nettoyage, unification des couleurs | — |
| 1 | Imports `@/`, remontée d'accessibilité, inventaire des deps | 0 |
| 2 | Transport injectable, serveur mock GraphQL, validation des documents | 1 |
| 3 | Manifeste + schéma, routes générées, index de recherche | 1 |
| 4 | Registry, site de doc, page tokens générée, migration des `/test-*` | 1 (2 et 3 pour les pages de guides) |
| 5 | Tests, CI, i18n, versionnage | 4 |

**Contrainte d'ordre à respecter** : les pages `/test-*` sont supprimées en
toute fin de lot 4, pas avant. Elles restent jusque-là la seule surface de
vérification visuelle du dépôt — les lots 0 à 3 s'appuient dessus pour contrôler
l'absence de régression (l'unification des couleurs du lot 0, en particulier, a
pour unique critère d'acceptation un rendu inchangé). Elles ne disparaissent
qu'une fois les playgrounds de documentation capables de les remplacer.

Le détail d'exécution — un prompt par tâche, avec modèle recommandé et usage du
mode plan — est dans [TEMPLATIZATION_PROMPTS.md](./TEMPLATIZATION_PROMPTS.md).
