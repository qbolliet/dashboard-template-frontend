# TEMPLATIZATION — Prompts de mise en œuvre

Prompts d'exécution de [TEMPLATIZATION_ARCHITECTURE.md](./TEMPLATIZATION_ARCHITECTURE.md).
Un prompt = une session, un commit, un périmètre vérifiable.

---

## Mode d'emploi

Chaque prompt indique un **modèle** et un usage du **mode plan**, selon les
critères suivants.

**Modèle**

| | Opus | Sonnet |
|---|---|---|
| **Quand** | Décision d'architecture non tranchée ; invariant transverse à préserver ; ambiguïté à arbitrer ; risque de régression silencieuse | Périmètre spécifié à l'avance ; transformation mécanique ; résultat vérifiable par lint, test ou script |
| **Exemples ici** | Unification des couleurs, transport injectable, routes générées, registry | Migration d'imports, tests unitaires, workflows CI, rédaction de pages |

**Mode plan** — à activer quand le prompt touche beaucoup de fichiers de façon
difficilement réversible, ou quand l'approche mérite d'être validée avant
écriture. À désactiver quand la tâche est mécanique et que le plan coûterait
plus cher que le travail.

**Convention commune** — à rappeler dans chaque session :

> Respecte `CLAUDE.md` : docstrings Google en anglais, commentaires inline en
> français et détaillés, composants en `const Name = (props) => {}` +
> `export default` en fin de fichier, pas de `useMemo`/`useCallback` de
> performance (React Compiler actif), tokens CSS jamais de `px` en dur,
> couleurs en `hsl(var(--token))`.

---

# LOT 0 — Hygiène et fondations

## P0.1 — Publier la documentation existante et nettoyer le dépôt

**Modèle : Sonnet** — périmètre entièrement défini, aucune décision.
**Mode plan : non.**

> Prépare le dépôt à son rôle de template public.
>
> 1. **`.gitignore`** : retire `CLAUDE.md` et `DESIGN_SYSTEM.md` de la liste des
>    fichiers ignorés — ce sont les documents de référence du template, ils
>    doivent être versionnés. Conserve l'exclusion de `.claude/*`,
>    `skills-lock.json`, `design-system/*` et des fichiers `*_PROMPTS.md` de
>    travail. Ajoute `TEMPLATIZATION_ARCHITECTURE.md` et
>    `TEMPLATIZATION_PROMPTS.md` au suivi.
> 2. **Nettoyage** : supprime `src/features/.next/` (répertoire de build égaré
>    dans les sources) et `src/app/components-test/` (vide). Ajoute
>    `src/**/.next/` au `.gitignore` pour empêcher la récidive.
> 3. **`README.md`** : réécris-le entièrement, il est encore au boilerplate
>    `create-next-app`. Structure attendue : ce que fait le template et à qui
>    il s'adresse ; capture ou description des trois features clés (navigation
>    configurable, menu de filtres GraphQL, graphique adaptatif) ; démarrage
>    rapide ; carte des cinq couches de `src/` avec un lien vers `CLAUDE.md` ;
>    lien vers `DESIGN_SYSTEM.md` ; renvoi vers
>    `TEMPLATIZATION_ARCHITECTURE.md` pour la feuille de route. Mentionne la
>    licence (MIT, `LICENSE` présent).
> 4. **`.env.example`** : crée-le avec `NEXT_PUBLIC_API_URL` commenté et une
>    explication d'une ligne (mode mock si absent).
>
> Ne touche à aucun fichier de `src/` autre que les deux suppressions.

Prépare le dépôt à son rôle de template public.

1. **Nettoyage** : supprime `src/features/.next/` (répertoire de build égaré
   dans les sources) et `src/app/components-test/` (vide). Ajoute
   `src/**/.next/` au `.gitignore` pour empêcher la récidive.
3. **`README.md`** : réécris-le entièrement, il est encore au boilerplate
   `create-next-app`. Structure attendue : ce que fait le template et à qui
   il s'adresse ; capture ou description des trois features clés (navigation
   configurable, menu de filtres GraphQL, graphique adaptatif). Mentionne la
   licence (MIT, `LICENSE` présent).
4. **`.env.example`** : crée-le avec `NEXT_PUBLIC_API_URL` commenté et une
    explication d'une ligne (mode mock si absent).

Ne touche à aucun fichier de `src/` autre que les deux suppressions.

---

## P0.2 — Unifier les deux systèmes de couleurs

**Modèle : Opus** — deux sources concurrentes déclarent les mêmes propriétés ;
la résolution demande de comprendre l'ordre de compilation et de préserver le
rendu à l'identique.
**Mode plan : oui** — établis d'abord la cartographie exacte des divergences
entre les deux fichiers avant d'écrire.

> Le dépôt contient **deux systèmes de couleurs parallèles** qui déclarent les
> mêmes propriétés personnalisées :
>
> - `src/styles/globals/colors.scss` — monolithe mêlant primitives et tokens
>   sémantiques. C'est celui **effectivement chargé globalement**, via la chaîne
>   `src/app/globals.scss` → `resets.scss` → `custom-properties.scss` →
>   `@use './colors'`. C'est aussi celui que lit `scripts/check-palette-sync.js`.
> - `src/styles/globals/primitives/colors.scss` +
>   `src/styles/globals/tokens/semantic-colors.scss` — la cascade décrite dans
>   `CLAUDE.md`, atteinte seulement par les 7 fichiers `_colors.scss` de
>   composants qui la `@use`nt directement.
>
> **Cible** : `primitives/` + `tokens/` deviennent la source unique ; le
> monolithe disparaît.
>
> Démarche :
> 1. Compare exhaustivement les trois fichiers. Le monolithe contient des
>    teintes absentes du fichier `primitives/` (notamment celles de la palette
>    de graphiques — `--color-navy`, `--color-brick`, `--color-violet`… — et les
>    surcharges `[data-theme="dark"]`). Produis d'abord la liste des tokens
>    présents ici et pas là, et des valeurs qui diffèrent entre les deux.
> 2. Reporte dans `primitives/colors.scss` toutes les valeurs brutes manquantes,
>    et dans `tokens/semantic-colors.scss` tous les alias de rôle manquants, en
>    respectant la règle de séparation inscrite en tête de chaque fichier :
>    aucun `var()` dans les primitives, aucune valeur HSL littérale dans les
>    tokens sémantiques. Les blocs `[data-theme="dark"]` suivent la même
>    répartition.
> 3. Fais pointer `custom-properties.scss` vers `./primitives/colors` et
>    `./tokens/semantic-colors`, puis supprime
>    `src/styles/globals/colors.scss`.
> 4. Repointe `scripts/check-palette-sync.js` vers
>    `src/styles/globals/primitives/colors.scss` et vérifie que son parseur
>    fonctionne toujours (il ne lit que le bloc `:root`, avant le premier
>    `[data-theme`).
> 5. Corrige les `@use` des fichiers qui référençaient `globals/colors` —
>    normalise-les tous en `@use '@/styles/globals/…'`, y compris le double
>    slash de `src/features/footer/components/Footer/Footer.scss`.
>
> **Critère d'acceptation : aucun changement visuel.** `npm run verify` passe.
> Vérifie en clair et en sombre sur `/`, `/test-header`, `/test-chart`,
> `/test-table` et `/test-stat-card` que le rendu est identique avant/après.
>
> Piège : les surcharges `[data-theme="dark"]` du monolithe et de la version
> scindée ne portent pas sur le même jeu de tokens — c'est la principale source
> de régression possible.

---

## P0.3 — Supprimer les alias de couleurs legacy

**Modèle : Sonnet** — remplacement mécanique une fois P0.2 fait.
**Mode plan : non.**

> Dans `src/styles/globals/tokens/semantic-colors.scss`, le bloc « VARIABLES
> GLOBALES POUR LES PAGES » définit six alias marqués *legacy — à migrer* :
> `--bg-color`, `--text-color`, `--heading-color`, `--card-bg`,
> `--border-color`, `--code-bg`.
>
> Remplace chaque usage par le token de rôle correspondant
> (`--color-background`, `--color-text-primary`, `--color-text-primary`,
> `--color-gray-100`/`--color-surface` selon le cas, `--color-border`,
> `--color-gray-100`), puis supprime les alias — y compris leurs redéfinitions
> dans le bloc `[data-theme="dark"]`.
>
> Attention : `--card-bg` et `--code-bg` sont redéfinis en mode sombre avec des
> valeurs qui ne suivent pas la même primitive qu'en clair. Vérifie le rendu
> sombre de chaque composant touché plutôt que de supposer l'équivalence.
>
> `npm run verify` passe ; aucun changement visuel en clair ni en sombre.

---

# LOT 1 — Normalisation pour la réutilisation

## P1.1 — Migrer tous les imports vers l'alias `@/`

**Modèle : Sonnet** — transformation mécanique, vérifiable par lint et build.
**Mode plan : non**, mais demande un récapitulatif des fichiers touchés avant
commit.

> Le dépôt compte 189 imports relatifs remontants (`from '../`) contre 85
> imports alias (`from '@/`). Pour que le code soit copiable dans un projet
> tiers, tout import inter-dossiers doit passer par `@/`.
>
> 1. Ajoute `"@config/*": ["./config/*"]` aux `paths` de `tsconfig.json` —
>    `config/` est hors de `src/` et n'est donc pas couvert par `@/*`.
> 2. Convertis tous les imports remontants (`../`) en `@/…`, dans les fichiers
>    `.js`, `.jsx`, `.tsx` **et** dans les `@use`/`@import` SCSS.
> 3. **Conserve les imports relatifs de fichiers frères** (`./Chart.scss`,
>    `./useSeriesHover`, `../../toolbar-features/channelAssign` à l'intérieur
>    d'une même feature reste acceptable si tu préfères — mais sois cohérent :
>    règle à appliquer, remontée hors de la feature ⇒ `@/`).
> 4. Mets à jour `src/app/layout.tsx` et `src/app/test-header/page.js` qui
>    importent `../../config/navigation_new.json` → `@config/…`.
>
> `npm run lint` et `next build` passent. Aucun changement de comportement.

---

## P1.2 — Remonter les primitives d'accessibilité hors de `features/`

**Modèle : Opus** — corrige une violation de couche avec des consommateurs
croisés ; demande de juger ce qui est primitive et ce qui reste feature.
**Mode plan : oui.**

> `CLAUDE.md` interdit à `src/components/` d'importer depuis `src/features/`.
> Cette règle est violée par quatre composants qui importent
> `@/features/accessibility` : `src/components/filter/SelectMenu`,
> `src/components/filter/TypeAwareInput`, `src/components/filter/CalendarMonth`
> et `src/components/ui/Tabs/Tab`. Conséquence : copier `SelectMenu` dans un
> projet tiers y traîne une feature entière.
>
> Démantèle `src/features/accessibility/` selon la nature de chaque élément :
>
> | Actuel | Cible |
> |---|---|
> | `components/VisuallyHidden` | `src/components/common/VisuallyHidden` *(dossier déjà créé, vide)* |
> | `components/AccessibleIcon` | `src/components/common/AccessibleIcon` |
> | `components/SkipLink` | `src/components/common/SkipLink` |
> | `hooks/useFocusTrap` | `src/hooks/accessibility/useFocusTrap` |
> | `hooks/useAriaAnnounce` | `src/hooks/accessibility/useAriaAnnounce` |
> | `hooks/useKeyboardNavigation` | `src/hooks/accessibility/useKeyboardNavigation` |
> | `services/AriaAnnouncer` | `src/utils/accessibility/AriaAnnouncer` |
>
> Inspecte `src/features/accessibility/utils/` et arbitre au cas par cas :
> ce qui est générique descend en `src/utils/accessibility/`, ce qui est lié à
> un composant précis rejoint ce composant.
>
> Contraintes :
> - Crée des barils `src/components/common/index.js` et
>   `src/hooks/accessibility/index.js` pour préserver la forme d'import
>   agrégée aujourd'hui offerte par `@/features/accessibility`
>   (`import { SkipLink } from …`, `import { useFocusTrap, useAriaAnnounce } from …`).
> - `src/styles/globals/accessibility.scss` reste où il est (c'est un global de
>   style, pas une feature).
> - `AriaAnnouncer` est un **singleton à état** : vérifie que le déplacement ne
>   crée pas une seconde instance de module (double montage du live region).
> - Supprime `src/features/accessibility/` une fois vide.
>
> Met à jour tous les consommateurs (`Header.jsx`, `NavigationSideBar`,
> `SidebarGroup`, `SidebarSwitcher`, les 4 composants cités, et tout autre
> trouvé par recherche). `npm run verify` passe, la navigation clavier et les
> annonces ARIA fonctionnent toujours sur `/test-header` et
> `/test-multi-criterion-menu`.

---

## P1.3 — Inventorier les dépendances par unité distribuable

**Modèle : Opus** — travail d'analyse dont la sortie conditionne tout le lot 4.
**Mode plan : oui.**

> Prépare le futur registry (cf. §1.3 et §5.1 de l'architecture) en produisant
> l'inventaire des unités distribuables et de leurs dépendances **réelles**.
>
> Pour chaque composant de `src/components/` et chaque feature de
> `src/features/`, détermine par analyse statique des imports :
> - la liste complète des fichiers de l'unité (`.jsx`, `.scss`, `_tokens.scss`,
>   `_colors.scss`, hooks et utils propres) ;
> - ses **dépendances npm** effectives (ex. `chart` → `@visx/*`, `d3-*`, `swr` ;
>   `globe` → `three` ; `header` → aucune hors React/Next) ;
> - ses **dépendances internes** vers d'autres unités du dépôt ;
> - ses **dépendances de tokens** : quels fichiers globaux de
>   `src/styles/globals/` lui sont indispensables.
>
> Produis `registry/inventory.json` (forme intermédiaire, pas encore le format
> shadcn) et un tableau récapitulatif dans le compte rendu.
>
> Signale explicitement :
> - les unités dont le graphe de dépendances internes forme un **cycle** ;
> - celles qui dépendent de plus de 3 autres unités (candidates à un
>   regroupement en un seul item de registry) ;
> - toute dépendance résiduelle de `src/components/` vers `src/features/`
>   après P1.2 (il ne devrait plus y en avoir).
>
> N'écris aucun code de production dans cette tâche : c'est un inventaire.

---

# LOT 2 — Couche données et intégration API

## P2.1 — Remplacer les blocs commentés par un transport injectable

**Modèle : Opus** — définit le contrat central de la couche données, consommé
par toutes les features.
**Mode plan : oui.**

> Aujourd'hui, brancher l'API GraphQL impose de décommenter un bloc dans chaque
> `sources/` (voir `src/features/table/sources/useFactTableWithMetadata.js`
> lignes 25–48, et l'équivalent dans `src/features/chart/sources/useFactTable.js`
> et `src/components/filter/SelectMenu/useSelectOptions.js`). Ce code n'est
> jamais exécuté, jamais linté, jamais testé.
>
> Remplace ce motif par un **transport injectable**, sélectionné par variable
> d'environnement :
>
> ```
> src/lib/api/
> ├── client.js            # expose request(document, variables, options)
> ├── transports/
> │   ├── graphql.js       # POST vers NEXT_PUBLIC_API_URL
> │   └── mock.js          # résout depuis les fixtures locales
> └── documents/           # documents GraphQL, déplacés depuis features/*/sources/
> ```
>
> Contrat :
> `client.request(document, variables, { catalog, schema }) → Promise<data>`.
> Les en-têtes `X-Catalog-Id` / `X-Schema-Id` sont posés par le transport
> GraphQL à partir des options (voir le bloc commenté existant pour la
> convention exacte).
>
> Règles :
> - Sélection du transport : `NEXT_PUBLIC_API_URL` défini ⇒ GraphQL, sinon
>   mock. **Une seule** condition, à un seul endroit (`client.js`).
> - Le transport mock résout depuis les fixtures **existantes**
>   (`src/features/table/sources/mockFactTable.json`,
>   `src/features/chart/sources/demoData.js`), de façon asynchrone pour
>   exercer le même cycle `loading → données` que l'API. Il route sur le nom de
>   l'opération du document.
> - Les hooks `sources/` conservent exactement leur rôle et leur signature
>   publique : construire la clé SWR, appeler `client.request`, normaliser la
>   forme de retour. Ils deviennent **identiques dans les deux modes**.
> - Supprime la sémantique actuelle de « repli sur le mock » : en erreur, on
>   renvoie l'erreur (le commentaire de `useFactTableWithMetadata.js` l.80–82
>   dit déjà que le mock n'est pas un repli d'erreur — applique-le sans
>   ambiguïté).
> - Utilise `graphql-request` (léger, sans cache concurrent de SWR) plutôt
>   qu'Apollo : SWR assure déjà la mise en cache et la déduplication.
>
> Vérifie que `/test-table`, `/test-chart` et `/test-multi-criterion-menu`
> rendent exactement les mêmes données qu'avant. Aucun bloc de code commenté ne
> doit subsister dans les `sources/`.

---

## P2.2 — Serveur GraphQL de démonstration sur données fictives

**Modèle : Sonnet** — le contrat est fixé par P2.1 ; il reste du câblage.
**Mode plan : non.**
**Prérequis : le SDL du dépôt API doit être committé en `schema.graphql`** (à
exporter côté API avant de lancer ce prompt).

> Ajoute au template une commande qui lance un **vrai endpoint GraphQL** sur
> données fictives, pour que l'utilisateur voie les features fonctionner sans
> déployer l'API réelle.
>
> 1. `scripts/mock-api-server.js` : `graphql-yoga` + `@graphql-tools/mock`,
>    servant `schema.graphql` (SDL réel du dépôt API) sur
>    `http://localhost:4000/graphql`.
> 2. Les résolveurs mock renvoient les fixtures existantes plutôt que des
>    données aléatoires pour les opérations que le template consomme
>    (`getFactTableWithMetadata`, `getCatalogSchema`, et les opérations de
>    `useVariableMetadata` / `useSelectOptions`). Les autres peuvent rester en
>    mock automatique.
> 3. Honore `limit`, `offset` et `sort` côté mock — la pagination de `<Table>`
>    doit être réellement exerçable.
> 4. Scripts `package.json` :
>    ```jsonc
>    "mock:api" : "node scripts/mock-api-server.js",
>    "dev:mock" : "concurrently \"npm:mock:api\" \"npm:dev:api\"",
>    "dev:api"  : "cross-env NEXT_PUBLIC_API_URL=http://localhost:4000/graphql next dev"
>    ```
>    (`concurrently` et `cross-env` en devDependencies ; `cross-env` est
>    nécessaire, le développement se fait sous Windows.)
> 5. Documente les trois modes dans `README.md` : `dev` (mock en mémoire),
>    `dev:mock` (endpoint GraphQL local), `dev:api` (API réelle via
>    `.env.local`).
>
> Critère : `npm run dev:mock` puis `/test-table` affiche les données servies
> par l'endpoint, vérifiable dans l'onglet réseau.

---

## P2.3 — Valider les documents GraphQL contre le schéma

**Modèle : Sonnet** — outillage, sans décision.
**Mode plan : non.**

> Ajoute un garde-fou qui vérifie que tous les documents GraphQL du dépôt
> (`src/lib/api/documents/`) sont valides vis-à-vis de `schema.graphql`.
>
> Utilise `@graphql-inspector/cli` (ou une validation maison via
> `graphql`/`validate` si tu préfères éviter la dépendance). Ajoute
> `"check:gql"` aux scripts et intègre-le à la chaîne `verify` existante,
> à côté de `check:palette`.
>
> Fais échouer volontairement un document (champ inexistant) pour vérifier que
> le script détecte l'erreur, puis rétablis.

---

# LOT 3 — Configuration et génération de pages

## P3.1 — Manifeste de site unique, schématisé et validé

**Modèle : Opus** — définit le contrat de configuration, socle de tout le lot.
**Mode plan : oui.**

> Le dépôt contient trois versions concurrentes de sa configuration centrale :
> `config/navigation.json`, `config/navigation_new.json` (le seul consommé, cf.
> `src/app/layout.tsx`) et `config/navigation_new2.json`. Aucune n'est validée.
>
> 1. Compare les trois et fusionne-les en un **manifeste unique**
>    `config/site.config.json`, en retenant la forme la plus riche. Structure
>    attendue :
>    ```jsonc
>    {
>      "$schema": "./schema/site.schema.json",
>      "site": { "title": "…", "description": "…", "locale": "fr" },
>      "navigation": { "type": "sidebar", "useSwitcher": false, "tree": [ … ] }
>    }
>    ```
>    Les nœuds de l'arbre conservent `path`, `name`, `type`, `children`, et
>    gagnent un `searchable` optionnel (défaut `true`) et un `description`
>    optionnel qui alimentera la recherche.
> 2. Écris `config/schema/site.schema.json` (JSON Schema draft 2020-12) :
>    arbre récursif, `type` restreint à l'énumération des types de page connus,
>    `path` contraint par motif, `additionalProperties: false` aux niveaux
>    stricts. Soigne les `description` de chaque propriété — elles apparaissent
>    en infobulle dans l'éditeur de l'utilisateur tiers, c'est le principal
>    bénéfice de la démarche.
> 3. `scripts/validate-config.js` (ajv, avec `ajv-formats`), exposé en
>    `"validate:config"` et ajouté à `verify`.
> 4. Met à jour les consommateurs (`src/app/layout.tsx`,
>    `src/app/test-header/page.js`) et supprime les trois anciens fichiers.
>
> Ne modifie pas encore le rendu des pages — ce prompt ne fait que déplacer la
> source de configuration. Le rendu doit rester identique.

---

## P3.2 — Générer les routes depuis le manifeste

**Modèle : Opus** — c'est le cœur de la templatisation ; touche au routage
Next 16, au rendu statique et à la frontière serveur/client.
**Mode plan : oui.**

> Remplace les pages en dossiers physiques par une génération pilotée par
> `config/site.config.json` (cf. §6.2 de l'architecture).
>
> 1. `src/config/pageTypes.js` — registre associant chaque `type` de nœud à un
>    composant de page et, optionnellement, à un document GraphQL :
>    ```js
>    export const PAGE_TYPES = {
>      home:      { component: HomePage,      query: null },
>      person:    { component: EntityPage,    query: GET_ENTITY },
>      indicator: { component: IndicatorPage, query: GET_FACT_TABLE_WITH_METADATA },
>    };
>    ```
>    Les types `home`, `person` et `indicator` existent **déjà** dans la
>    configuration de navigation — la structure de données anticipe ce
>    mécanisme, seule la résolution manque.
> 2. `src/app/[...slug]/page.jsx` — route attrape-tout :
>    - `generateStaticParams()` aplatit l'arbre du manifeste en chemins ;
>    - `generateMetadata()` dérive titre et description du nœud ;
>    - la page résout `node.type` via `PAGE_TYPES`, récupère les données côté
>      serveur quand c'est possible, et rend le composant ;
>    - un type inconnu déclenche `notFound()`.
> 3. Crée des composants de page **minimaux mais réels** pour les trois types
>    (`src/features/pages/`), assemblant les features existantes : une page
>    indicateur affiche par exemple un `StatCard` + un `Chart` + une `Table`
>    filtrables.
> 4. Conserve `src/app/page.tsx` (accueil) tel quel si le type `home` doit y
>    rester, ou fais-le passer par le mécanisme — arbitre et justifie.
>
> Contraintes Next 16 :
> - les pages générées doivent rester des **Server Components** ; seuls les
>   sous-composants interactifs portent `'use client'` ;
> - `params` est asynchrone en Next 15+ — `const { slug } = await params`.
>
> Ne touche pas aux pages `/test-*` : elles seront traitées en P4.6.
>
> Critère : ajouter un nœud dans `site.config.json` suffit à faire apparaître
> une page navigable, sans créer aucun fichier.

---

## P3.3 — Dériver l'index de recherche du manifeste

**Modèle : Sonnet** — mécanisme simple une fois P3.1 et P3.2 en place.
**Mode plan : non.**

> Les suggestions de `src/features/header/components/SearchBar/SearchBar.jsx`
> sont un tableau de cinq chaînes codé en dur dans `handleInputChange`, avec le
> commentaire « à remplacer par une vraie API de recherche ».
>
> 1. `scripts/build-search-index.js` : aplatit l'arbre de
>    `config/site.config.json` en entrées `{ title, path, type, description,
>    keywords }`, en excluant les nœuds `searchable: false`, et émet
>    `public/search-index.json`. Prévois un point d'extension commenté pour
>    enrichir l'index d'entités remontées de l'API au build (via
>    `src/lib/api/client.js`).
> 2. Branche le script en `prebuild` et sur `dev` (ou expose `"build:search"`
>    et documente-le).
> 3. `SearchBar` charge l'index une fois (fetch au premier focus, pas au
>    montage) et filtre dessus. Conserve strictement le comportement clavier
>    existant (flèches, Entrée, Échap, index de sélection). Chaque suggestion
>    devient un lien navigable vers `path`, remplaçant le `console.log` de
>    `handleSubmit`.
> 4. Filtrage : correspondance insensible à la casse et aux accents, sur
>    `title` puis `description`, résultats bornés (10 max), avec surlignage du
>    fragment correspondant.
>
> Navigation et recherche partagent désormais la même source et ne peuvent plus
> diverger. Vérifie l'accessibilité de la liste de suggestions
> (`role="listbox"`, `aria-activedescendant`) — vérifie ce qui existe déjà
> avant d'ajouter.

---

# LOT 4 — Registry et site de documentation

## P4.1 — Construire le registry

**Modèle : Opus** — définit le format et le mécanisme de build qui alimentent
à la fois l'installation, la documentation et les aperçus.
**Mode plan : oui.**
**Prérequis : P1.3 (inventaire).**

> À partir de `registry/inventory.json`, construis un registry au format
> `shadcn` (ouvert et consommable par la CLI `shadcn` via URL — aucune CLI à
> écrire de notre côté).
>
> 1. `registry/registry.json` : index des items. Types utilisés —
>    `registry:ui` pour les composants de `src/components/`, `registry:block`
>    pour les features, `registry:file` pour les fichiers de tokens globaux.
>    Chaque item déclare `dependencies` (npm), `registryDependencies`
>    (internes) et `files`.
> 2. Crée un item socle `tokens-global` regroupant
>    `src/styles/globals/primitives/`, `tokens/`, `typography.scss`,
>    `utils/breakpoints.scss` et `utils/functions.scss`. **Tout** autre item en
>    dépend : c'est ce qui garantit qu'un composant installé isolément a ses
>    tokens.
> 3. `scripts/build-registry.js` :
>    - lit `registry.json`, résout et inline le contenu de chaque fichier,
>      émet `public/r/<name>.json` (format attendu par la CLI) ;
>    - émet en parallèle un module `registry/__registry__.js` associant chaque
>      exemple à son composant **et à son code source brut** (lu via `fs` au
>      build) — c'est ce module qui alimentera `<ComponentPreview>` en P4.3 ;
>    - échoue si un item référence un fichier inexistant ou une
>      `registryDependency` non déclarée.
> 4. `registry/examples/` : crée les premiers exemples en extrayant les cas
>    d'usage **canoniques** des pages `/test-*` actuelles — un fichier autonome
>    et exécutable par exemple, nommé `<item>-<variante>.jsx`
>    (`chart-basic.jsx`, `chart-hue.jsx`, `table-sortable.jsx`,
>    `select-menu-multi.jsx`…).
>
>    N'y transpose pas l'exploration paramétrique des pages `/test-*` : elle
>    relève du **playground** (P4.3/P4.6), pas des exemples. Un exemple est un
>    cas d'usage figé et installable ; deux ou trois par composant suffisent.
> 5. Script `"build:registry"`, branché en `prebuild`.
>
> Critère de recette : sur un projet Next vierge,
> `npx shadcn add http://localhost:3000/r/select-menu.json` installe le
> composant, ses tokens et ses dépendances npm, et il se rend correctement.

---

## P4.2 — Infrastructure du site de documentation

**Modèle : Opus** — export statique et `basePath` interagissent avec les
Server Components, les polices et les composants clients existants.
**Mode plan : oui.**

> Mets en place le site de documentation déployable sur GitHub Pages
> (cf. §5.5 de l'architecture).
>
> **Décision déjà tranchée** (§5.1) : la documentation vit dans l'application
> existante, en segment `(docs)` de l'App Router, même build. Elle remplace les
> pages `/test-*` et devient **la surface de développement du template** —
> `npm run dev` sert la documentation. Une application séparée dupliquerait la
> configuration SCSS, l'alias `@/` et le `ThemeProvider`, et les aperçus
> doivent de toute façon importer les vrais composants.
>
> 1. Configuration : `output: 'export'`, `basePath` et `assetPrefix` dérivés du
>    nom du dépôt, `images.unoptimized: true`. Le tout conditionné à une
>    variable d'environnement pour que `npm run dev` reste inchangé en local.
> 2. Layout de documentation : sidebar de navigation dans les sections, fil
>    d'Ariane, sommaire de page, et **réutilisation du `ThemeToggle` existant**
>    — la documentation doit se lire en clair et en sombre, c'est aussi une
>    démonstration du système de tokens.
> 3. Contenu en MDX (`@next/mdx`) pour que les pages puissent incorporer des
>    composants React ; coquilles vides pour l'instant, remplies aux prompts
>    suivants.
> 4. Vérifie que l'export statique n'échoue pas sur les composants lourds :
>    isole `Globe` derrière `dynamic(..., { ssr: false })` si nécessaire, et
>    surveille la taille du bundle (`three` ≈ 600 kB).
> 5. `npm run build:docs` produisant `out/`.
>
> Vérifie que la sortie fonctionne servie depuis un sous-chemin (`npx serve out`
> derrière le `basePath`) — c'est le mode de service de GitHub Pages, et les
> chemins absolus cassent typiquement là.

---

## P4.3 — Playground interactif et aperçu de code

**Modèle : Opus** — le schéma de contrôles et le sérialiseur JSX sont une API
interne réutilisée par les ~30 pages de composants ; s'en apercevoir trop tard
coûte une réécriture de toute la documentation.
**Mode plan : oui.**

> Implémente les deux composants centraux de la documentation (cf. §5.2 et §5.3
> de l'architecture). Ils répondent à deux questions différentes et ne doivent
> pas être fondus.
>
> ### a) `<ComponentPlayground name="chart" />` — le cœur du dispositif
>
> Il remplace les pages `/test-*` : contrôles interactifs pilotant les props du
> composant, rendu en direct, et **code généré depuis l'état courant des
> contrôles**, copiable tel quel.
>
> Chaque playground est déclaré par un schéma dans `docs/playgrounds/` :
>
> ```js
> // docs/playgrounds/chart.jsx
> export const controls = {
>   x:          { type: 'select',  options: ['age', 'revenu', 'date'], default: 'age' },
>   hue:        { type: 'select',  options: [null, 'region', 'sexe'],  default: null },
>   showLegend: { type: 'boolean',                                     default: true },
>   height:     { type: 'number',  min: 200, max: 800, step: 50,       default: 400 },
> };
> export const scaffold = { component: 'Chart', imports: [...], data: 'demoData' };
> ```
>
> Ce schéma alimente **à la fois** le rendu des contrôles et le sérialiseur.
> Écris un **sérialiseur JSX générique** — un par composant serait ingérable sur
> 30 composants : chaînes entre guillemets, booléen `true` en attribut nu,
> objets et tableaux entre accolades, valeurs `null`/`undefined` omises.
>
> Deux règles non négociables sur le code généré :
> 1. **Les props à leur valeur par défaut sont omises.** Sinon l'utilisateur
>    copie quinze props dont deux l'intéressent.
> 2. **Le code inclut ses imports et son jeu de données** (via `scaffold`). Un
>    fragment `<Chart x="age" />` non collable dans un fichier vierge rate sa
>    cible.
>
> Réutilise **`src/app/_playground/PlaygroundControls.jsx`** : les contrôles y
> sont déjà écrits, mutualisés et accessibles (`role="group"` +
> `aria-labelledby` + `aria-pressed`, motif volontairement préféré à
> `radiogroup` — lis le commentaire d'en-tête avant de le modifier). Migre-le
> vers l'infrastructure de documentation et étends-le des types manquants
> (`number`, `text`, `color`) plutôt que d'écrire un second jeu de contrôles.
>
> Précédent à suivre pour la génération de code :
> `src/features/table/utils/querySnippets.js` fait déjà exactement cela pour les
> requêtes GraphQL — `buildQueryDocument(vars, operation)` sérialise un état en
> code affichable. Même intention, même conventions.
>
> ### b) `<ComponentPreview name="chart-hue" />` — cas d'usage figés
>
> Deux onglets : **Aperçu** (le composant rendu) et **Code** (le source du
> fichier `registry/examples/`, lu via le module `registry/__registry__.js`
> produit en P4.1). Sert les cas d'usage canoniques et les extraits de guides ;
> prévois une variante `<ComponentPreviewSource>` affichant le code seul.
>
> ### Contraintes communes
>
> - Réutilise `src/components/ui/Tabs` pour les onglets et
>   `src/components/icons/CopyIcon` pour la copie : la documentation d'un
>   template se bâtit avec ses propres composants.
> - **Coloration syntaxique** : `highlight(code, lang)` existe déjà dans
>   `src/features/table/utils/querySnippets.js` (l. 174) — sans dépendance, au
>   runtime, ce qui est **indispensable pour le playground** dont le code
>   n'existe pas au build. Promeus-la en `src/utils/highlight/` (second
>   consommateur non lié ⇒ règle de promotion de `CLAUDE.md`) et ajoute-lui un
>   mode `jsx`. N'introduis pas `shiki` : il ne couvrirait que le cas figé et
>   ferait coexister deux coloriseurs.
> - Le cadre d'aperçu expose une **bascule clair/sombre locale**, en posant
>   `data-theme` sur son conteneur plutôt que sur `<html>` : c'est la
>   démonstration la plus parlante du fait que les tokens sont scopables
>   (§4.4 niveau C).
> - Un nom inexistant produit un message explicite, pas un écran blanc.

---

## P4.4 — Page « Design system » et référence de tokens générée

**Modèle : Opus** — c'est la pièce maîtresse pour l'utilisateur tiers, et elle
demande d'écrire un parseur SCSS et de résoudre des chaînes de dérivation.
**Mode plan : oui.**
**Prérequis : P0.2 et P0.3 (sinon la cascade documentée n'est pas celle en
vigueur).**

> Produis la section « Fondations » du site de documentation. Elle a un objectif
> précis : **permettre à un utilisateur tiers de changer l'apparence des
> composants sans modifier leur code.**
>
> ### a) Page « Design system » (rédigée)
>
> Reprends §4.1 à §4.3 de `TEMPLATIZATION_ARCHITECTURE.md` : le schéma de la
> cascade en quatre niveaux, les quatre invariants (HSL sans fonction pour
> permettre `hsl(var(--t) / 0.5)` ; déclaration au niveau de partage ; `calc()`
> plutôt qu'un nouveau token ; pilote unique), et le fonctionnement du thème
> sombre (`data-theme`, script anti-FOUC, redéfinition aux niveaux 1–2
> seulement). Illustre chaque invariant par un exemple **réel** tiré du dépôt —
> `--header-control-size` et `--nav-toggle-size` sont les meilleures
> illustrations du pilote unique.
>
> ### b) Page « Theming » (rédigée, l'essentiel du bénéfice)
>
> Les quatre niveaux d'intervention de §4.4, chacun avec un extrait copiable et
> un `<ComponentPreview>` montrant l'effet :
> - **A — Rebranding global** : surcharger les primitives (≈ 10 lignes), toute
>   l'interface suit, thème sombre compris ;
> - **B — Ajustement d'un rôle** : remapper primitive → rôle sans toucher la
>   palette ;
> - **C — Personnalisation locale** : surcharger `--[composant]-*` dans un
>   scope CSS. **C'est le point le plus important à démontrer** — deux
>   apparences du même composant sur la même page, sans variante de code, sans
>   prop, sans rebuild. Prévois un exemple interactif où l'utilisateur ajuste
>   des tokens et voit le composant changer en direct.
> - **D — Édition des fichiers** : le mode assumé après installation par le
>   registry.
>
> Documente aussi les **échappatoires JavaScript** de §4.5 sans les enterrer :
> `src/features/chart/utils/encoding.js` (`PALETTE`, `SEQUENTIAL`) et les
> couleurs du globe ne sont pas pilotés par les tokens CSS — d3 et Three.js
> exigent des chaînes résolues hors DOM. Indique les deux fichiers à éditer
> conjointement et mentionne que `npm run check:palette` fait échouer le build
> en cas de dérive. Un tiers qui change sa palette et voit ses graphiques
> inchangés doit trouver la réponse ici.
>
> ### c) Référence des tokens (générée)
>
> `scripts/build-tokens-doc.js` parcourt `src/styles/globals/` et les 90
> fichiers `_tokens.scss` / `_colors.scss` (≈ 818 propriétés) et émet un JSON
> consommé par la page. Pour chaque token :
>
> | Colonne | Contenu |
> |---|---|
> | Nom | `--sidebar-toggle-size` |
> | Niveau | 1 primitive / 2 sémantique / 3 feature / 4 composant *(déduit du chemin du fichier)* |
> | Portée | fichier de déclaration |
> | Valeur clair / sombre | valeur déclarée, et valeur sous `[data-theme="dark"]` s'il y a surcharge |
> | Aperçu | pastille pour les couleurs, barre à l'échelle pour les espacements |
> | Chaîne de dérivation | `--sidebar-toggle-size → --nav-toggle-size → calc(--spacing-xl + --spacing-xs) → 24px` |
>
> La **chaîne de dérivation est la colonne à ne pas sacrifier** : c'est elle qui
> apprend au lecteur *à quel niveau surcharger* pour obtenir l'effet voulu.
>
> Contraintes du parseur : il lit du SCSS, pas du CSS — gère `@use`, les
> commentaires `//`, les blocs `[data-theme="dark"]` et les valeurs `calc()`
> imbriquées. Une propriété déclarée dans plusieurs fichiers doit être signalée
> comme **conflit** en sortie de script (après P0.2 il ne devrait plus y en
> avoir : c'est aussi un test de non-régression de l'unification).
>
> La page offre une recherche et un filtre par niveau et par feature ; 818
> lignes non filtrables seraient inutilisables.

---

## P4.5 — Tables de props générées depuis les JSDoc

**Modèle : Sonnet** — outillage cadré.
**Mode plan : non.**

> Les composants du dépôt portent des docstrings Google complètes (`@param`
> typés et décrits). Exploite-les plutôt que de retaper les props à la main,
> qui divergeraient.
>
> `scripts/build-props-doc.js` : `react-docgen` sur chaque composant du
> registry, émission d'un JSON `{ name, props: [{ name, type, required,
> defaultValue, description }] }`, consommé par un `<PropsTable name="…" />`
> dans les pages de composants.
>
> Points d'attention :
> - le style `const Name = (props) => {}` + `export default` en fin de fichier
>   demande parfois d'aider `react-docgen` (resolver personnalisé) ;
> - les descriptions sont en anglais (convention du dépôt) — ne les traduis
>   pas ;
> - liste en sortie de script les composants dont les props ne sont pas
>   documentées, pour servir de check-list.

---

## P4.6 — Retirer les pages de test au profit des playgrounds

**Modèle : Sonnet** — travail de portage étendu mais cadré par P4.3.
**Mode plan : oui**, à cause du volume (9 pages) et du risque de perte de
couverture.
**Prérequis : P4.1 et P4.3.**

> Les pages `/test-*` sont des bancs d'essai de développement : elles ont servi
> à valider le comportement des composants sous différentes combinaisons de
> paramètres. Elles n'ont pas vocation à être livrées dans le template — la
> documentation reprend ce rôle (§5.1).
>
> **Étape 1 — Inventaire, avant toute suppression.** Pour chacune des pages
> `src/app/test-chart`, `test-table`, `test-header`, `test-tabs`,
> `test-stat-card`, `test-globe`, `test-criterion-menu`,
> `test-multi-criterion-menu` et `src/app/filter-primitives`, relève :
> - les paramètres pilotables et leurs valeurs possibles (c'est le futur
>   `controls` du playground) ;
> - les combinaisons figées qui méritent de devenir un exemple de registry ;
> - les cas limites délibérément couverts (état vide, données manquantes,
>   valeurs extrêmes, `prefers-reduced-motion`, arbre de navigation profond…).
>
> Ce dernier point est le vrai enjeu : ces cas limites sont la mémoire de ce qui
> a cassé pendant l'implémentation. Ils doivent réapparaître soit comme option
> de playground, soit comme exemple, soit — le meilleur destin pour beaucoup
> d'entre eux — comme **test** en P5.1/P5.2. Classe chaque cas dans l'une de ces
> trois destinations et n'en abandonne aucun sans le signaler.
>
> **Étape 2 — Portage.**
> - un `docs/playgrounds/<composant>.jsx` par composant, reprenant les
>   paramètres inventoriés ;
> - les combinaisons remarquables en `registry/examples/` ;
> - `src/app/_playground/PlaygroundControls.{jsx,scss}` migre vers
>   l'infrastructure de documentation (déjà fait en P4.3 si tu l'y as déplacé —
>   sinon, fais-le ici) ; il ne doit exister qu'**un seul** jeu de contrôles
>   dans le dépôt.
>
> **Étape 3 — Suppression** des 9 pages et du dossier `src/app/_playground/`.
> Vérifie qu'aucun lien du dépôt ne pointe encore vers elles (navigation,
> `config/`, README, `src/app/page.tsx`).
>
> Rends compte du tableau de correspondance complet
> *page de test → playground / exemple / test*, avec la mention explicite de ce
> qui n'a pas été reporté et pourquoi.

### Constat d'exécution

Playgrounds créés : `table`, `header`, `globe`, `tooltip`, `select-menu`,
`type-aware-input`, `constraint-field` (7 nouveaux, en plus des 5 déjà
portés). ~32 nouveaux exemples de registry, répartis sur chart/table/header/
globe/filtre/tabs/stat-card. Décision actée avec l'utilisateur : les 4
primitives de filtre reçoivent chacune un playground complet plutôt qu'une
couverture par exemples seuls.

Aucune infrastructure de test (Vitest/Playwright) n'existe encore — les cas
suivants sont **documentés mais pas encore testés**, à reprendre par P5.1/P5.2
avec le pointeur indiqué :

- **Chart** — coercition de date ISO et branchement loading/error/success :
  démontré dans `registry/examples/chart-api.jsx` (commentaire dédié), à
  couvrir par un test de fumée Playwright. Les deux layouts de légende de
  heatmap (verticale repliée / horizontale pleine largeur) : régression
  visuelle candidate sur `chart-heatmap.jsx`.
- **Table** — aucune couverture loading/error/lignes-vides nulle part
  (ni avant, ni après ce lot) : à créer en P5.2 (smoke test). Piège RSC/import
  de barrel (`@/features/table` vs `@/features/table/components/Table`) :
  commenté dans `docs/playgrounds/table.jsx`, à reprendre dans le guide
  "Structure du projet" de P4.7.
- **Header** — responsive mobile, suggestions de recherche, navigation
  clavier (Tab/Entrée/Échap) : aucun test dédié nécessaire, exercés en continu
  par le vrai `<Header>` du site de documentation lui-même (dogfooding, §5.1).
  Le flag `searchable: false` n'a plus aucun nœud réel qui l'exerce dans
  `config/site.config.json` depuis le retrait du nœud `/filter-primitives` —
  signalé, non bloquant.
- **Globe** — `prefers-reduced-motion` (arrêt de la rotation et du fond
  étoilé, documenté dans `src/features/globe/engine/GlobeEngine.js`) n'est
  démontré nulle part : candidat Playwright P5.2 (émulation de la media
  feature). Épuisement des contextes WebGL sous montages/démontages répétés
  (~16 contextes max par onglet Chrome) : candidat de régression P5.2 (navigation
  cliente répétée vers/depuis une page avec `<Globe>`). Les références à
  `GLOBE_ARCHITECTURE.md` (décisions D2/D10/D11, §8) trouvées dans les
  commentaires de l'ancienne page `test-globe` pointaient vers un fichier
  inexistant dans le dépôt — leur substance a été recopiée dans les nouveaux
  commentaires, le pointeur cassé a été abandonné.
- **Filtre** — options vides sur `SelectMenu`, état forcé-erreur autonome sur
  `TypeAwareInput`, bornes inversées (`min > max`) sur `ConstraintField` :
  aucun des trois n'était démontré avant ce lot ; candidats de test composant
  P5.1 (Testing Library) une fois Vitest installé.
- **Tabs** — les 5 nouveaux exemples (`tabs-disabled`, `tabs-keep-mounted`,
  `tabs-controlled`, `tabs-no-default`, `tabs-overflow`) sont chacun le futur
  fixture direct d'un test P5.2 ciblé (état disabled, persistance d'état,
  mode contrôlé, repli roving-tabindex, défilement horizontal).
- **StatCard** — la section 5 de l'ancienne page (`LinkCardsSection`/
  `getCardsConfig`) n'a pas été reportée : c'est une autre famille de
  composant, déjà exercée en production par la vraie page d'accueil générée
  (`HomePage.jsx` + `homeConfig.js`).
- **MultiCriterionMenu** — `connectorOptions`, `lockedVariables`,
  `lockedOperations`, `catalog` : props jamais exercées nulle part avant ce
  lot (ni page de test, ni playground, ni exemple) — non régressées, non
  portées, à couvrir lors d'un futur ajout d'exemple si le besoin apparaît.

---

## P4.7 — Rédiger les guides

**Modèle : Opus** — rédaction technique demandant une compréhension complète du
dépôt.
**Mode plan : non.**
**Prérequis : lots 2 et 3.**

> Rédige les pages de guides du site de documentation :
>
> - **Installation** — les deux voies : *Use this template* pour un nouveau
>   projet, CLI de registry pour un projet existant. Explique en une phrase
>   pourquoi le fork n'est pas recommandé.
> - **Structure du projet** — les cinq couches de `src/` (`styles`,
>   `components`, `hooks`, `utils`, `features`), les règles de dépendance entre
>   elles et le critère de promotion d'un hook ou d'un util vers la couche
>   partagée. Reprends `CLAUDE.md` sans le paraphraser mécaniquement : le
>   lecteur ici est un utilisateur, pas un contributeur.
> - **Brancher l'API GraphQL** — `NEXT_PUBLIC_API_URL`, les trois modes de
>   développement, la forme des données attendue par chaque feature, et
>   comment ajouter un document GraphQL.
> - **Générer des pages depuis un JSON** — anatomie de `site.config.json`,
>   ajout d'un type de page dans `PAGE_TYPES`, alimentation de l'arbre depuis
>   un appel API au build.
> - **Alimenter la barre de recherche** — index dérivé, point d'extension pour
>   les entités venant de l'API.
> - **Internationalisation** — état des lieux et mode d'emploi (dépend de P5.4 ;
>   si ce prompt est joué avant, rédige la page en dernier).
>
> Chaque guide se termine par un exemple complet et copiable. Pas de section
> « pour aller plus loin » sans contenu réel.

---

# LOT 5 — Qualité et industrialisation

## P5.1 — Tests unitaires des fonctions pures

**Modèle : Sonnet** — périmètre explicite, résultat binaire.
**Mode plan : non.**

> Installe Vitest (+ `@testing-library/react` pour la suite) et couvre les
> fonctions pures les plus exposées, celles dont dépend le comportement des
> features :
>
> - `src/features/table/utils/defaultFilterEngine.js` — chaque opérateur, par
>   type SQL, avec les cas limites (`null`, chaîne vide, dates) ;
> - `src/features/table/utils/formatCell.js` ;
> - `src/features/chart/toolbar-features/channelAssign.js` — `nextFreeChannel`
>   et les marqueurs `REAL_DIST_MARKER` / `PROJ_DIST_MARKER` ;
> - `src/features/filter/utils/filterTypes.js` — `isNumericSqlType`,
>   `isDateSqlType` ;
> - `src/utils/**` — l'ensemble.
>
> Tests en anglais, colocalisés (`*.test.js` à côté du module). Script `"test"`
> et `"test:watch"` ; ajoute `test` à la chaîne `verify`.
>
> Signale en compte rendu tout comportement qui te paraît douteux plutôt que
> d'écrire un test qui entérine un bug.

---

## P5.2 — Tests de fumée et régression visuelle

**Modèle : Sonnet.**
**Mode plan : non.**

> Installe Playwright et ajoute deux filets :
>
> 1. **Fumée** : chaque page de documentation et chaque route générée depuis
>    `config/site.config.json` se charge sans erreur console ni requête en
>    échec. Le test itère sur les routes issues du manifeste et de l'index de
>    la documentation, jamais sur une liste figée.
> 2. **Régression visuelle** : capture des composants clés (header sidebar et
>    topbar, chart, table, stat card, menu de critères) **en clair et en
>    sombre**, via leur playground de documentation figé sur ses valeurs par
>    défaut. C'est le filet réellement pertinent pour un template dont le
>    produit est l'apparence.
> 3. **Cas limites hérités des pages `/test-*`** : reprends la colonne
>    « destination : test » du tableau de correspondance produit en P4.6 et
>    couvre ces cas ici. C'est ce qui justifie d'avoir supprimé les pages de
>    test sans perdre ce qu'elles vérifiaient.
>
> Neutralise les sources d'instabilité : animations (`prefers-reduced-motion`),
> données à horodatage, et le globe (WebGL — exclus-le ou tolère un seuil de
> différence élevé). Documente dans le README comment régénérer les
> instantanés.

---

## P5.3 — Intégration continue et déploiement de la documentation

**Modèle : Sonnet.**
**Mode plan : non.**

> Crée `.github/workflows/` :
>
> 1. `verify.yml` — sur `pull_request` et `push` : `npm ci`, `lint`,
>    `check:palette`, `validate:config`, `check:gql`, `test`, `next build`.
>    Cache npm et cache Next.
> 2. `docs.yml` — sur `push` vers `main` : build du site et du registry,
>    déploiement GitHub Pages (`actions/deploy-pages`), avec les permissions
>    `pages: write` et `id-token: write`.
>
> Vérifie **d'abord en local** que `next build` passe sur un arbre propre : le
> répertoire gitignoré `design-system/` a historiquement fait échouer le build
> complet. Si le problème persiste, exclus-le explicitement plutôt que de
> désactiver la barrière.
>
> Ajoute les badges de statut au `README.md`.

---

## P5.4 — Externaliser les libellés

**Modèle : Opus** — décision d'API publique affectant tous les composants.
**Mode plan : oui.**

> Un template destiné à des tiers ne peut pas imposer des libellés français
> codés en dur (textes visibles, `aria-label`, annonces ARIA, formats de date et
> de nombre).
>
> 1. Recense tous les libellés codés en dur dans `src/components/` et
>    `src/features/`, en distinguant texte visible, texte d'accessibilité et
>    formatage locale-dépendant (`d3-format`, `d3-time-format`, `toLocaleString`).
> 2. Propose **une** stratégie et justifie-la. Ma préférence : un dictionnaire
>    par composant, surchargeable par une prop `labels`, avec le français en
>    valeur par défaut — pas de librairie i18n imposée au consommateur, qui a
>    peut-être déjà la sienne. Écarte explicitement les alternatives.
> 3. Applique-la d'abord à **une** feature complète (`header` est le meilleur
>    candidat : navigation, recherche, bascule de thème, et beaucoup de texte
>    d'accessibilité), documente le motif, puis propose l'ordre de migration
>    des autres.
> 4. Les formats de date et de nombre passent par la `locale` déclarée dans
>    `site.config.json`.
>
> Aucune régression d'accessibilité : les `aria-label` doivent rester présents
> et non vides dans tous les cas, y compris quand un dictionnaire partiel est
> fourni.

J'aimerais à terme que l'utilisateur puisse changer de langue grâce à un bouton situé dans le header dont la valeur par défaut vaudrait la valeur système. Je ne m'intéresse pas ici au design du bouton ou à la construction du composant de bouton mais plutôt à toute l'infrastructure sous-jacente. Je souhaite utiliser la logique standard pour les sites multilingues en nexts js . Je souhaite mettre à disposition les langues standard et documenter les éventuelles opérations qu'un futur utilisateur doit faire pour maintenir cela s'il était à modifier le contenu du site où s'il venait à l'enrichir.

---

## P5.5 — Versionnage et contribution

**Modèle : Sonnet.**
**Mode plan : non.**

> Dernière étape avant publication :
>
> 1. `CHANGELOG.md` (format Keep a Changelog). Reconstitue rétrospectivement
>    les entrées majeures depuis l'historique git — les branches `qb-*`
>    (header, charts, table, tabs, cards, globe, filter-primitives,
>    next16-migration, performance) donnent le découpage. Quand on distribue par
>    copie, le changelog est le **seul** moyen pour un utilisateur de savoir ce
>    qui a bougé depuis sa copie.
> 2. Tag `v1.0.0` et convention SemVer documentée, en précisant ce qui compte
>    comme rupture pour ce template : renommage ou suppression d'un token,
>    changement de forme du manifeste de configuration, changement de signature
>    d'un composant du registry.
> 3. `CONTRIBUTING.md` : structure des couches, conventions de `CLAUDE.md`,
>    chaîne `verify`, procédure d'ajout d'un composant au registry (fichiers,
>    tokens, exemple, entrée `registry.json`, page de documentation).
> 4. Active le dépôt comme *template repository* GitHub (Settings → Template
>    repository) — indique-le en compte rendu, c'est une action manuelle.

---

## Récapitulatif

| Prompt | Lot | Modèle | Plan | Dépend de |
|---|---|---|---|---|
| P0.1 Docs publiées et nettoyage | 0 | Sonnet | non | — |
| P0.2 Unification des couleurs | 0 | **Opus** | **oui** | — |
| P0.3 Suppression des alias legacy | 0 | Sonnet | non | P0.2 |
| P1.1 Imports `@/` | 1 | Sonnet | non | P0.1 |
| P1.2 Remontée d'accessibilité | 1 | **Opus** | **oui** | P1.1 |
| P1.3 Inventaire des dépendances | 1 | **Opus** | **oui** | P1.2 |
| P2.1 Transport injectable | 2 | **Opus** | **oui** | P1.1 |
| P2.2 Serveur GraphQL de démo | 2 | Sonnet | non | P2.1 + SDL |
| P2.3 Validation des documents | 2 | Sonnet | non | P2.2 |
| P3.1 Manifeste + JSON Schema | 3 | **Opus** | **oui** | P1.1 |
| P3.2 Routes générées | 3 | **Opus** | **oui** | P3.1, P2.1 |
| P3.3 Index de recherche | 3 | Sonnet | non | P3.2 |
| P4.1 Registry | 4 | **Opus** | **oui** | P1.3 |
| P4.2 Infrastructure du site | 4 | **Opus** | **oui** | P1.1 |
| P4.3 Playground + aperçu de code | 4 | **Opus** | **oui** | P4.1, P4.2 |
| P4.4 Design system + tokens | 4 | **Opus** | **oui** | P0.2, P0.3, P4.3 |
| P4.5 Tables de props | 4 | Sonnet | non | P4.2 |
| P4.6 Retrait des `/test-*` | 4 | Sonnet | **oui** | P4.1, P4.3 |
| P4.7 Guides | 4 | **Opus** | non | lots 2 et 3 |
| P5.1 Tests unitaires | 5 | Sonnet | non | P1.2 |
| P5.2 Fumée + visuel | 5 | Sonnet | non | P4.6 |
| P5.3 CI et déploiement | 5 | Sonnet | non | P5.1, P4.2 |
| P5.4 Libellés externalisés | 5 | **Opus** | **oui** | P3.1 |
| P5.5 Versionnage | 5 | Sonnet | non | tout |

**Chemin critique** : P0.1 → P0.2 → P1.1 → P1.2 → P1.3 → P4.1 → P4.2 → P4.3 →
P4.4. Les lots 2 et 3 se mènent en parallèle du lot 4 une fois le lot 1
terminé.

**Ordre recommandé pour un premier résultat visible** : P0.1, P0.2, P1.1, P1.2,
puis P4.2 + P4.3 + P4.4 — la documentation du système de tokens est le livrable
qui apporte le plus de valeur à un utilisateur tiers, et il ne dépend ni de
l'API ni des pages générées.
