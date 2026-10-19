# Recette G0 — vitrine, sélecteur de langue et eject

Rapport du prompt **G0** de [POST_TEMPLATIZATION_PROMPTS.md](./docs-internal/POST_TEMPLATIZATION_PROMPTS.md),
exécuté le 2026-10-16 sur la branche `qb-templatization` (HEAD `d6012d9`), Windows 11,
Node 22, Next.js 16.2.9 (Turbopack), Playwright 1.62 (Chromium seul).

Aucun fichier du dépôt n'a été modifié pendant la recette : les mesures ont été faites sur
le dépôt lui-même (étapes 1 et 2), sur un clone intact à chemin court (`C:\dt`) et sur deux
clones éjectés (étape 4). Les **remédiations** sont dans les prompts **R1 à R8** de
`POST_TEMPLATIZATION_PROMPTS.md`, qui renvoient aux identifiants `C1` à `C26` ci-dessous.

## 1. Résumé

| Étape | Résultat |
|---|---|
| 1. `npm run verify` | **Vert** (lint, tests, palette, config, gql, i18n strict, registry, props, docs-index, tokens). Aucun fichier suivi modifié. |
| 1. `npm run test:e2e` (dépôt, `COD Code\…`) | **Dépôt** (`COD Code…`) : 49 réussis, 30 échecs, 8 flaky (33,6 min), presque tous dus à C1. **Clone sain** (`C:dt`) : **85 réussis, 2 échecs, 1 flaky** (5,1 min) — captures périmées du header (C13) et 404 des drapeaux locaux (C26). Voir §4. |
| 2. Pages Composants et Features | Playgrounds, code généré et copie : **fonctionnent** sur les 8 pages. Erreurs d'hydratation (C4), débordement à 375 px (C6), contrastes (C10, C11). |
| 2. Démo `/demo/fr` et `/demo/en` | Navigation, recherche, langue, filtre `=` et `IN`, graphique, tableau : **fonctionnent**. Thème sombre cassé (C2), liens morts (C8), `aria-current` (C9), débordement à 375 px (C7). |
| 3. Sélecteur de langue (P9) | Points 1 à 10 **conformes sur le fond** ; repli de drapeau **non conforme** (C5) ; deux points cosmétiques (C17, C18). |
| 4. Eject | `--yes` et `--keep-docs` **passent** (avec LF), puis `npm install`, `lint`, `build`, `dev` et `/fr` (resp. `/docs`) **verts**. Échec sur clone Windows par défaut (C3), CI à corriger (C12), reliquats (C14 à C16). |

## 2. Constats

Gravité : **bloquant** (empêche l'usage ou la publication), **gênant** (défaut visible ou
d'accessibilité, contournable), **cosmétique**, **à trancher** (décision de conception).

### 2.1 Bloquants

#### C1 — Le serveur de dev panique dès qu'un navigateur se connecte au HMR (dans `COD Code\…`)

- **Symptôme** : `FATAL: An unexpected Turbopack error occurred … Failed to write app endpoint
  /(site)/demo/[locale]/[[...slug]]/page — Next.js package not found`, répété à chaque
  rechargement. Effets : boucle de rechargement de la page (≈ 1 par seconde), ou 404 sur toutes
  les routes quand le serveur démarre dans cet état (`/_not-found` est la seule route compilée).
  C'est la cause probable de la majorité des 30 échecs e2e (timeouts de `page.goto`).
- **Reproduction** : `npm run dev` dans `C:\Users\bolli\Documents\COD Code\dashboard-template-frontend`,
  ouvrir n'importe quelle page dans un navigateur (la sonde `curl` seule ne déclenche rien).
- **Contre-épreuve** : un clone intact `C:\dt` (même commit, `npm ci`) et deux copies éjectées
  (`C:\ej1`, `C:\ej2`) ne paniquent **jamais**, navigateur connecté, 0 `FATAL` sur plusieurs
  dizaines de chargements. Le facteur commun du dépôt fautif : son chemin (espace dans
  « COD Code ») ou un état local (`.next/` issu d'un `next build` antérieur dans le même
  dossier).
- **Cause : non tranchée.** Hypothèses, de la plus à la moins probable : racine Turbopack mal
  inférée avec un chemin à espace ; `.next/` périmé (un build de production et un `dev` partagent
  le dossier) ; bogue de Next 16.2.9 sous Windows.
- **Pistes** : (1) supprimer `.next/` puis relancer ; (2) fixer explicitement
  `turbopack: { root: __dirname }` dans `next.config.ts` ; (3) cloner dans un chemin sans
  espace et comparer ; (4) tester `next dev --webpack` ; (5) monter Next si un correctif est
  publié. Documenter la conclusion dans `CONTRIBUTING.md`.

#### C2 — Dans la démo, le thème sombre est cassé

- **Symptôme** (`/demo/fr/comptabilite-nationale/france/pib`, thème sombre) : fond de page
  **blanc** autour de cartes sombres ; le titre `h1` « PIB » est **blanc sur blanc**
  (invisible) ; les titres d'axe du graphique (« Croissance du PIB (%) », « Date
  d'observation ») sont **noirs sur la carte sombre**.
- **Mesures** : `body` et `main` : `background-color: rgba(0,0,0,0)`, `color: rgb(0,0,0)` ;
  `h1` : `color: rgb(255,255,255)` ; `text.chart-axis-label` : `fill: rgb(0,0,0)`. Les jetons
  sont bons (`--color-background: 220 39% 11%`, `--color-text-primary: 0 0% 100%`).
- **Cause** : `src/app/globals.scss` ne pose **aucun** fond ni couleur sur `body`
  (`tailwindcss`, `resets`, `accessibility` seulement). Seuls `DocsShell.scss:13` et
  `AboutPage.scss:31` appliquent `hsl(var(--color-background))`. Le défaut est probablement
  antérieur à la templatisation (aucun commit n'a jamais ajouté ce fond). La règle de
  `.chart-axis-label` (`ChartAxisLeft.scss:23`) ne s'applique pas au titre d'axe tel qu'il est
  rendu.
- **Pistes** : poser `body { background-color: hsl(var(--color-background)); color:
  hsl(var(--color-text-primary)); }` dans `globals.scss` (puis retirer les doublons de
  `DocsShell`/`AboutPage` s'ils deviennent inutiles) ; corriger le sélecteur du titre d'axe
  (ou déclarer `fill` sur le `<text>` rendu) ; ajouter un test e2e « aucun texte à contraste
  < 3:1 sur `/demo/fr/…/pib` en sombre » ; régénérer les captures concernées **en le disant**.

#### C3 — `scripts/eject.js` échoue sur un clone Windows par défaut

- **Symptôme** : `eject : motif introuvable dans src/app/not-found.jsx`. Un `git clone` sous
  Windows avec `core.autocrlf=true` (configuration système de Git for Windows) écrit les
  fichiers en CRLF ; les motifs du script contiennent des `\n`. Il n'existe pas de
  `.gitattributes`. L'index du dépôt est bien en LF (`i/lf`), seule la copie de travail dérive.
- **Contournement vérifié** : `git clone -c core.autocrlf=false` → eject OK (45 opérations en
  mode complet, 32 avec `--keep-docs`).
- **Pistes** : ajouter un `.gitattributes` (`* text=auto eol=lf`, plus `*.png binary`) ;
  rendre `patch()` tolérant (normaliser `\r\n` → `\n` pour la comparaison et restituer l'EOL
  d'origine à l'écriture) ; faire échouer le script **avant** toute modification quand une
  opération de déplacement a déjà eu lieu (aujourd'hui il s'arrête après avoir déplacé
  `src/app/(site)/demo/`, laissant un arbre à moitié éjecté) ; documenter dans le guide G3.

### 2.2 Gênants

#### C4 — Erreur d'hydratation et premier clic perdu sur les aperçus (thème sombre mémorisé)

- **Symptôme** : sur toute page à `ComponentPlayground`/`ComponentPreview`, avec
  `localStorage.theme = "dark"` : `A tree hydrated but some attributes of the server rendered
  HTML didn't match` (`data-theme`, `aria-pressed`, `title`, `aria-label` de `PreviewFrame`).
  Après hydratation, le DOM reste en `light` alors que l'état React est `dark` : **le premier
  clic sur le bouton de thème de l'aperçu ne fait rien**, le second bascule.
- **Cause** : `PreviewFrame.jsx:57` lit `useTheme()` ; `ThemeProvider` expose le thème
  mémorisé dès le premier rendu client, alors que le serveur rend `light`.
- **Pistes** : fournir au provider un snapshot serveur stable (`useSyncExternalStore` avec
  `getServerSnapshot`) ou différer l'état mémorisé après hydratation sans dupliquer l'état
  (le commentaire de `PreviewFrame` interdit la recopie `useState` + `useEffect`) ;
  `suppressHydrationWarning` seulement en dernier recours, sur `data-theme`. Test e2e :
  charger avec `localStorage.theme="dark"`, attendre l'hydratation, vérifier l'absence de
  `console.error` et qu'**un seul** clic change `data-theme`.

#### C5 — Le repli de drapeau ne s'active pas quand `flagcdn.com` est injoignable

- **Symptôme** (requêtes vers `flagcdn.com` abandonnées) : chaque pastille affiche l'**icône
  d'image cassée** de Chromium ; le code pays n'est pas visible. P9 §3 / décision D4 exigent le
  code pays centré, sans image cassée. Mise en page et CLS inchangés (CLS 0).
- **Cause** : `FlagChip.scss` suppose qu'une `<img alt="">` cassée n'est « pas peinte ».
  C'est faux dès que l'image reçoit des dimensions (`width/height: 100%`) : Chromium peint
  l'icône par-dessus le repli.
- **Pistes** : cacher l'image tant qu'elle n'est pas chargée (`opacity: 0` + `onLoad` qui
  l'affiche) ou la retirer sur `onError` (un état local minimal dans `FlagChip`, composant
  client) ; ou ne rendre l'`<img>` qu'après un test de chargement. Ajouter un test e2e
  Playwright qui abandonne `**/flagcdn.com/**` et vérifie la visibilité du texte du repli.
  Vérifier Firefox et Safari (non testés).

#### C6 — Défilement horizontal à 375 px sur trois pages de documentation

| Page | `scrollWidth` | Éléments |
|---|---|---|
| `/features/chart` | 403 px (viewport 360) | `div.ctrl-group`, `button.tp-ctrl-btn` |
| `/features/filter` | 401 px | idem |
| `/features/header` | 719 px | `ul.topbar-list` (375 px de large) de l'aperçu, et la rangée `docs-sidebar__section` |

Les cinq autres pages de la section (et les index) sont conformes. **Pistes** : `flex-wrap`
(ou `overflow-x: auto` borné) sur les groupes de contrôles du playground ; borner l'aperçu du
Header (`max-width: 100%`, `overflow: auto` sur le cadre) ; test e2e 375 px sur toutes les
routes de doc (`document.documentElement.scrollWidth <= clientWidth`).

#### C7 — Défilement horizontal à 375 px sur les pages indicateur de la démo

`/demo/fr/comptabilite-nationale/france/pib` et `/demo/en/finances-publiques/recettes-publiques` :
`scrollWidth` 597 px pour 360. Le `header.primary-header` (recherche incluse) s'élargit à 597 px,
c'est-à-dire à la largeur du contenu : un enfant (tableau ou graphique) ne se contraint pas.
Les autres pages de la démo sont conformes. **Pistes** : `min-width: 0` et `overflow-x: auto`
sur l'îlot `IndicatorExplorer` et sur le conteneur de la table ; vérifier la largeur du
graphique (`ParentSize`) ; test e2e 375 px sur `demoRoutes()`.

#### C8 — Accueil de la démo : lorem ipsum et sept liens morts (aussi après eject)

`config/content/home.json` : titre « Titre », paragraphe en lorem ipsum, et sept liens
(`/indicator`, `/analytics`, `/predictions`, `/network`, `/dashboards`, `/reports`, `/ai`) qui
répondent **404**, non préfixés par la langue ni par `/demo`. `scripts/eject.js` ne réinitialise
pas ce fichier (le commentaire de `resetManifest` le juge « déjà générique ») : le site éjecté
(`/fr` sur `C:\ej1`) affiche les mêmes liens morts. **Pistes** : contenu réaliste qui pointe
vers des nœuds du manifeste (liens relatifs résolus par `resolveNavigationTree`), et un test
`validate:config`/vitest qui vérifie que tout `link` de `home.json` existe dans le manifeste ;
réinitialiser `home.json` à l'eject ou le rendre cohérent avec `MINIMAL_SITE_CONFIG`.

#### C9 — `aria-current="page"` posé sur « Accueil » sur toutes les pages de la démo

Sur `/demo/fr/about`, deux liens portent `aria-current="page"` (« Accueil » et « À propos »).
Sur `/pib`, `/france` et `/finances-publiques`, « Accueil » est « courant » alors que
« Comptabilité Nationale » ne porte que la classe `--active`. Cause probable :
`isActivePath('/demo/fr')` est un test de préfixe qui matche tout. Impact : un lecteur d'écran
annonce « Accueil, page actuelle » partout. **Pistes** : égalité stricte pour la racine,
préfixe pour les groupes (`aria-current="true"` pour un ancêtre, `"page"` pour la page
elle-même) ; test vitest sur `isActivePath` ; test e2e sur `[aria-current="page"]` (un seul).

#### C10 — Contraste insuffisant en thème sombre (un seul jeton)

`--color-text-tertiary` = `--color-gray-400` sombre = `rgb(104,114,130)`, soit **3,65 à
3,91:1** sur le fond sombre (seuil AA : 4,5:1). Occurrences mesurées (10 pages) :
`docs-sidebar__link` (222), `ctrl-label` (36), `tab-label` (46), `docs-pagination__label` (20),
`docs-breadcrumb__link` (18), `doc-code__lang` (14), en-têtes de table, légendes de graphique,
etc. **Piste** : éclaircir `--color-gray-400` du bloc sombre de
`styles/globals/primitives/colors.scss:103` (≥ 4,5:1 sur `220 39% 11%`), resynchroniser
`encoding.js` (`npm run check:palette`), puis régénérer les captures concernées.

#### C11 — Contraste insuffisant en thème clair (quatre cas)

| Élément | Couleur | Ratio | Page |
|---|---|---|---|
| Badge positif de StatCard (`+12,5 %`) | `rgb(29,211,83)` sur vert pâle | **1,85:1** | `/composants/stat-card` |
| « requis » du tableau de props | `rgb(239,67,67)`, 10,2 px | 3,32:1 | `/composants/*` |
| Commentaires de code (`hl-c`) | `rgb(113,124,142)` | 3,85:1 | pages avec code |
| Nombres de code (`hl-n`) | `rgb(184,88,20)` | 4,31:1 | pages avec code |

**Pistes** : assombrir la teinte du texte de `stat-badge--positive` (garder le fond) ;
`props-table__required` ; ajuster `hl-c` et `hl-n` dans la palette de coloration
(`src/utils/highlight`). Ajouter un test e2e de contraste (voir C2).

#### C12 — Après eject, `verify.yml` garde le job `eject`

Le job appelle `node scripts/eject.js … --dry-run` ; le script s'est supprimé lui-même. La CI
du dépôt éjecté échoue au premier push. Le workflow n'exécute pas non plus `npm run verify`
(il enchaîne des commandes isolées, sans `check:i18n --strict`). **Pistes** : faire patcher
`.github/workflows/verify.yml` par l'eject (retrait du job, avec contrôle de chaîne attendue) ;
remplacer la liste d'étapes par `npm run verify`.

#### C13 — Captures périmées du header (sidebar) et suite e2e (voir §4)

Sur un serveur sain (clone `C:\dt`), la suite e2e donne **85 réussis, 2 échecs, 1 flaky**
(5,1 min, 1 worker). Les deux échecs sont `visual.spec.ts › Header — sidebar (chrome réel de la
démo)` en clair et en sombre : 4 294 et 4 237 pixels différents (ratio 0,03, seuil 0,02).
Deux causes lisibles sur l'image de différence : (1) le titre du header est **« Dashboard
Template »** alors que la capture attendue montre **« Mon Site »** : capture périmée ;
(2) la capture actuelle contient le badge rouge « 1 Issue » de l'overlay de développement de
Next, absent de l'attendue (non reproduit en sonde : cause non identifiée, à surveiller).
**Pistes** : régénérer ces deux captures (après R2, qui change aussi le fond) ; masquer ou
désactiver l'indicateur de développement dans les captures (`devIndicators: false` en mode
test, ou option `mask`). **Erratum** : une première version de ce rapport donnait
l'échec heatmap (610 → 624 px) pour déterministe ; il passe sur le clone sain, c'était un
effet du serveur instable (C1).

#### C26 — L'exemple « Drapeaux auto-hébergés » référence des fichiers inexistants

`/composants/language-switcher` répond avec une erreur console `Failed to load resource: 404`,
**à chaque chargement** : l'exemple `language-switcher-local-flags`
(`registry/examples/language-switcher-local-flags.jsx:19`) demande `/flags/<iso2>.svg`, mais
`public/flags/` n'existe pas. Le test `smoke › [docs] /composants/language-switcher` échoue
pour cette raison (reprise comprise) et l'exemple affiche des images cassées (qui masquent
aussi C5). **Pistes** : ajouter les cinq SVG utilisés (fr, gb, es, de, it) sous
`public/flags/` **ou** faire pointer l'exemple vers `data:` URI / des fichiers du registry ;
documenter l'item de registry qui les livre.

### 2.3 Cosmétiques

| # | Constat | Fichier ou page |
|---|---|---|
| C14 | `--keep-docs` conserve `CHANGELOG.md` et `CONTRIBUTING.md` du **template** (le second se présente comme « pour qui travaille sur le template lui-même » et renvoie à `CLAUDE.md`, ignoré par git). | racine de la copie éjectée |
| C15 | Reliquats à la racine après eject : `POST_TEMPLATIZATION_ARCHITECTURE.md`, `POST_TEMPLATIZATION_PROMPTS.md` (suivis par git), `assets/` (aucune référence dans `src/`, `config/`, `next.config.ts`), et ce rapport `RECETTE_G0.md`. `.gitignore` garde les entrées `registry`, `docs/__docs__.js`, `TEMPLATIZATION_*`, etc. Dans le dépôt de travail, `TEMPLATIZATION_*`, `LANGUAGE_SWITCHER_*`, `TODO`, `design-system/` sont ignorés par git donc absents d'un clone : sans objet pour un tiers, mais présents dans votre copie locale. | racine |
| C16 | Une trentaine de commentaires et docstrings citent encore « registry », `src/features/docs/…`, `docs/__docs-pages__.js`, `docs/playgrounds/…` dans une copie éjectée ; `.env.example`, `eslint.config.mjs`, `playwright.config.ts` aussi. | `src/**`, config |
| C17 | Playground LanguageSwitcher : « Nombre de langues » est borné à 8 et ne modifie pas le code généré ; playground Tabs : la bascule « Icônes » change l'aperçu mais pas le code. | `docs/playgrounds/language-switcher.jsx`, `tabs.jsx` |
| C18 | LanguageSwitcher (P9 point 7) : avec `menuAlign=Droite`, le menu se colle au bord droit du **conteneur** (x = 632–822) alors que le bouton est à x = 183–255, donc détaché ; et le cadre d'aperçu (192 px) est plus court que le menu ouvert (280 px) : double barre de défilement, bouton masqué. | `/composants/language-switcher` |
| C19 | *(à trancher)* Les cartes KPI restent à « 18 observations » quand le filtre réduit tableau et graphique à 12 lignes. Le libellé dit « Lignes renvoyées par la requête », donc peut-être voulu ; sinon, les calculer sur `chartData`. | `IndicatorExplorer.jsx` |
| C20 | Filtre : cliquer à nouveau sur l'opération déjà choisie (IN par défaut) la désélectionne ; cliquer dans le champ variable n'ouvre pas la liste (seuls le chevron `tabindex=-1` ou la frappe l'ouvrent). | `CriterionMenu` / `SelectMenu` |
| C21 | Avertissement dev : `…src_….css was preloaded using link preload but not used within a few seconds`. | `/composants/tabs` |
| C22 | `npm run lint` : 9 avertissements (10 avec `--keep-docs`) — déjà couverts par **G1**. | divers |
| C23 | Le bouton de thème de l'aperçu du Header partage l'état du thème **global** (trois boutons « pressés » en même temps sur `/features/header`). Peut être voulu. | `/features/header` |
| C24 | *(à trancher)* La disposition `topbar`/`sidebar` se choisit par `navigation.type` dans le manifeste, **pas** automatiquement selon la profondeur comme le décrit `CLAUDE.md`. La sidebar n'affiche que le premier niveau (les enfants sont proposés par la navigation « Sous-pages » de chaque page). | `config/site.config.json` |
| C25 | Sous Windows, `next build` échoue (`path length … too long`) dans un chemin profond (> MAX_PATH) ; le même build passe à `C:\ej1`. À noter dans le guide d'installation. | environnement |

## 3. Ce qui est conforme

- **Playgrounds** (8 pages) : chaque type de contrôle (select natif, bouton à bascule,
  nombre, texte) modifie le code généré et/ou l'aperçu ; le bouton de copie place le code dans
  le presse-papiers (hors espaces) ; aucune erreur console hors C4 et C21.
- **P9, points 1 à 10** : drapeau rond (`border-radius: 50%`), code pays, chevron droit puis
  pivoté de 90° (`matrix(0,1,-1,0)`), bordure **inchangée** à l'ouverture, survol visible dans
  les deux thèmes, coche bleue (`rgb(13,63,110)` clair, `rgb(117,184,255)` sombre) et graisse
  600 sur la langue active, tailles 30/34/38 px avec drapeau d'option à **20 px**, mode compact
  34×34 px sans code ni chevron, menu limité à 280 px et défilant (`overflow-y: auto`), clavier
  (`Tab`, `↓` ouvre, `↓↑` sans bouclage — `…7,7,7` et `0,0,0` —, `Entrée` sélectionne et rend le
  focus au bouton, `Échap` referme de même, `Début`/`Fin`), et dans le header de `/demo/fr` :
  même page, `<html lang>` suit, `NEXT_LOCALE` posé, `/demo` redirige vers la langue mémorisée.
- **Démo** : recherche (`Ctrl+K`, résultat navigable), thème, langue, filtre `=` (6 lignes),
  `IN` avec une puis deux valeurs (6 puis 12 lignes, légende du graphique mise à jour),
  graphique et tableau, 0 erreur console.
- **Eject complet** : README produit écrit à la racine (3 gestes exacts, `.env.example`
  présent), `docs/`, `registry/`, `scripts/build-*.js`, `e2e/visual*` supprimés ;
  `npm install` (580 paquets), `lint` (0 erreur), `validate:config`, **379 tests vitest**,
  `build` (10 pages), `dev`, `/fr`, `/fr/indicateur` (18 lignes, graphique), `/` → `/fr`.
- **Eject `--keep-docs`** : `npm install` (703 paquets), `lint`, `build` (12 pages),
  `/fr`, `/docs`, `/docs/exemple` en 200, `/demo/fr` en 404, 0 erreur console.

## 4. Chaîne e2e

**Sur le dépôt (`COD Code\…`, 2 workers)** — 49 réussis, 30 échecs, 8 flaky, 1 non exécuté.

| Famille | Échecs | Lecture |
|---|---|---|
| `smoke` (docs et démo) | 15 | `page.goto: Test timeout` pendant les paniques de C1 ; 8 passent à la reprise (flaky) |
| `i18n` | 6 | `ERR_ABORTED`, `waitForURL` : serveur instable (C1) |
| `edge-cases` Tabs (4) et Table « Données API », Globe reduced-motion | 6 | éléments non rendus : serveur instable et/ou C4 |
| `edge-cases` heatmap `etroit`, `large` | 2 | 624 px au lieu de 610 px : **ne se reproduit pas** sur le clone sain, effet de C1 |
| `visual` (8) | 8 | dimensions différentes (688×578 reçu pour 192 attendu) ou `data-theme` non basculé : effet de C4 et de C1 |

**Sur le clone sain (`C:\dt`, 1 worker, 0 `FATAL`)** — **85 réussis, 2 échecs, 1 flaky**, 5,1 min.

| Test | Résultat | Cause |
|---|---|---|
| `smoke › [docs] /composants/language-switcher` | échec (reprise comprise) | 404 de `/flags/*.svg` (C26) |
| `visual › Header — sidebar › light` / `dark` | échecs (reprise comprise) | captures périmées + badge « 1 Issue » (C13) |
| `visual › Header — sidebar › dark` | flaky au premier essai | — |
| les 82 autres, dont `i18n` (12), `edge-cases` (heatmap, Tabs, Table, Globe), `visual` (hors sidebar) | réussis | — |

**Lecture** : sur un serveur sain la chaîne est presque verte ; les 30 échecs du dépôt venaient
essentiellement de C1. Ce que la suite ne voit **pas** : C2 (contraste, fond de page), C4
(hydratation avec thème mémorisé : le test charge en clair), C6 et C7 (aucun test à 375 px), C9,
C5 (aucun test avec `flagcdn.com` bloqué). Ces absences sont comblées par R2 à R6.

## 5. Ce qui n'a pas pu être vérifié

- La **cause** de C1 (chemin à espace, `.next/` périmé, ou bogue Turbopack).
- Le comportement de la **barre haute** dans la démo via le manifeste (modification de config
  refusée dans le clone jetable) ; seul le playground Header la couvre en partie. La
  disposition « selon la profondeur » (C24) n'est pas démontrée.
- **Firefox et Safari** : repli de drapeau (C5) et rendu des aperçus non testés (Chromium seul).
- Le **contraste calculé** (texte sur fond opaque ou composé) n'a pas été relu à l'œil ; les
  éléments sur images, canvas et SVG sont exclus du calcul.
- Les 30 échecs e2e du dépôt n'ont pas été rejoués **dans le dépôt lui-même** une fois C1
  contourné : ils l'ont été sur le clone sain `C:dt` (même commit).
- Le badge « 1 Issue » de l'overlay de développement dans la capture du header (C13) n'a pas
  été reproduit ni expliqué.
- `git stash` n'a pas été utilisé : la question « cet échec précède-t-il le chantier ? » est
  tranchée par lecture du test et du code, et par rejeu sur le clone intact.
- `registry add`/CLI et le déploiement Pages ne sont pas couverts par ce prompt.

## 6. Environnement de la recette

| | |
|---|---|
| Dépôt de travail | `C:\Users\bolli\Documents\COD Code\dashboard-template-frontend` |
| Clone intact (`autocrlf=false`) | `C:\dt` — `npm ci`, `npm run dev`, Playwright |
| Copies éjectées | `C:\ej1` (`--yes`), `C:\ej2` (`--keep-docs --yes`), clonées avec `core.autocrlf=false` |
| Navigateur | Chromium (Playwright), fenêtres 1280×900 et 375×800 |
| Mémoire | un run e2e à 2 workers a été arrêté par le système (mémoire critique) ; rejoué à 1 worker |
