# Prompts de correction — branche `qb-templatization`

Trois prompts indépendants, à lancer **chacun dans une session neuve**, dans l'ordre 1 → 2 → 3,
avec un commit entre chaque. L'ordre compte entre 2 et 3 : le prompt 3 déplace
`src/features/chart/utils/encoding.js` (palette, styles de trait) dans `src/utils/`, et le
prompt 2 y touche peut-être aussi.

| # | Sujet | Modèle | Effort | Plan mode |
|---|-------|--------|--------|-----------|
| 1 | Drapeaux du LanguageSwitcher : local d'abord | Sonnet 5.5 | medium | non : le périmètre est petit et la solution imposée |
| 2 | Chart : z en `bubble` ou `density` | Opus 5.5 | high | **oui** : beaucoup de fichiers concernés (détection, plan d'agrégation, marques, légende, survol, zoom, minimaps) |
| 3 | Globe : flèches pleines, avec hue | Opus 5.5 | high | **oui** : à reprendre dans les shaders (ruban en espace écran, morph globe↔plan, tuilage, survol) |
| 4 | Slider : bornes selon les autres critères (MultiCriterionMenu seulement) | Opus 5.5 | high | **oui**, plan court : la sémantique ET/OU et l'interaction avec la validation sont subtiles |
| 5a | **API** (dépôt `dashboard-template-api`) : `structuredFilters` sur `getSelectOptions` / `getSelectOptionsTree` | Sonnet 5.5 | high | non : on recopie un motif qui existe déjà (`getFieldStats`) |
| 5b | SelectMenu : options selon les autres critères (MultiCriterionMenu seulement) | Opus 5.5 | high | non : le prompt 4 a déjà posé la mécanique |

Les prompts 4 et 5 ne dépendent pas des trois premiers. L'ordre est imposé : 4 → 5a (dans le
dépôt de l'API, puis publication et `npm run sync:schema` côté front) → 5b.

Pour les prompts 2 et 3, relire le plan avant de l'accepter. Vérifier en particulier les points
listés sous « Décisions à trancher dans le plan ».

---

## Prompt 1 — LanguageSwitcher : drapeaux locaux d'abord, CDN en secours

```text
Contexte (vérifié dans le code, ne pas re-déduire autrement) :
- `src/features/i18n/components/LanguageSwitcher/languages.js` exporte `flagCdnSrc(country)`
  → `https://flagcdn.com/<iso2>.svg`. C'est la valeur par défaut de la prop `flagSrc` de
  `LanguageSwitcher`, transmise à `LanguageButton`, `LanguageOption` puis `FlagChip`.
- `FlagChip.jsx` ne charge qu'UNE url. Si elle échoue, `onError` retire l'<img> et laisse
  voir le code pays en texte. Il n'y a donc AUCUN repli vers les SVG locaux aujourd'hui.
- Les SVG `public/flags/{de,es,fr,gb,it,jp,nl,pt}.svg` ne servent qu'à l'exemple du
  registry `registry/examples/language-switcher-local-flags.jsx` (déclarés en `@asset`).
  `LocaleSwitcher` (le câblage utilisé par le site) ne passe pas de `flagSrc`.

Objectif : charger les drapeaux dans l'ordre fichier local → flagcdn.com → code pays en texte.

À faire :
1. `flagSrc` peut renvoyer `string | string[] | null`. Une chaîne seule garde son
   comportement actuel : les `flagSrc` personnalisés existants continuent de marcher.
2. Dans `languages.js`, ajouter et exporter `defaultFlagSrc(country)`. Elle renvoie
   `[withBasePath(`/flags/${iso2}.svg`), flagCdnSrc(country)]`, ou `null` sans pays.
   `withBasePath` vient de `@/utils/url/withBasePath` (import autorisé : couche `src/utils`).
   Garder l'export de `flagCdnSrc`. `defaultFlagSrc` devient la valeur par défaut de
   `flagSrc` dans `LanguageSwitcher` (et dans `FlagChip`), puis s'exporte depuis `index.js`.
3. `FlagChip` : normaliser la sortie de `flagSrc` en liste de candidats. Sur `onError`,
   passer au candidat suivant. Passer au repli texte seulement quand tous ont échoué.
   - Remplacer l'état `{ src, status }` par l'indice du candidat courant plus le statut,
     liés à la liste (clé = candidats joints). Une autre liste (autre pays, autre `flagSrc`)
     repart de l'indice 0 en 'pending', comme aujourd'hui pour une autre url.
   - Garder sans changement : le repli texte toujours rendu sous l'image, l'image cachée
     jusqu'au `load`, la lecture de `img.complete` dans la ref pour une image chargée avant
     l'hydratation, `key={src}` sur l'<img>, et l'<img> brut (décision D4, pas de next/image).
   - Garder `loading="lazy"` et `decoding="async"`.
   - Un candidat absent coûte une requête 404, et c'est accepté : on ne tient pas de liste
     codée en dur des drapeaux locaux disponibles. Ajouter un SVG dans `public/flags/` doit
     suffire.
4. Registry : les 8 SVG sont maintenant utilisés par défaut. Ils doivent donc être des
   assets de l'unité `language-switcher` elle-même, plus seulement de l'exemple. Regarder
   comment `scripts/build-registry.js` alimente `unit.assets` pour une unité (les textures
   du globe en sont un précédent) et déclarer les drapeaux de la même façon. L'exemple
   `language-switcher-local-flags` n'a plus de raison d'être sous cette forme : le
   transformer en exemple « drapeaux distants uniquement » (`flagSrc={flagCdnSrc}`), qui
   montre la couture dans l'autre sens. Mettre à jour son titre et sa description. Puis
   lancer `npm run build:registry` sans avertissement.
5. Docs : réécrire la section « Drapeaux » de `docs/content/composants/language-switcher.mdx`
   (ordre de résolution, forme `string[]`, ajout d'un drapeau = déposer
   `public/flags/<iso2>.svg`). Mettre à jour les docstrings `flagSrc` de `LanguageSwitcher`,
   `LanguageButton`, `LanguageOption` et `FlagChip` (« defaults to flagcdn.com » est faux).
   Ajouter une entrée au CHANGELOG.
6. Tests :
   - Vitest : `defaultFlagSrc` (ordre, basePath, null). Pour `FlagChip`, un test qui simule
     l'échec du 1er candidat puis le succès du 2e, et un autre pour l'échec de tous (texte
     visible, plus d'<img>).
   - Playwright `e2e/language-switcher.spec.ts` : le scénario C5 (« flagcdn.com
     injoignable ») doit maintenant montrer les drapeaux locaux. Ajouter un scénario où
     `**/flags/**` ET flagcdn.com sont bloqués → code pays. Ajouter aussi un scénario où
     seul le fichier local manque (route 404 sur un pays) → drapeau CDN.
7. Vérifier avec `npm run lint`, `npm run test`, `npx playwright test e2e/language-switcher.spec.ts`
   et `npm run build:registry`.

Conventions : CLAUDE.md (composants en arrow const + export default en fin de fichier,
docstrings Google en anglais, commentaires en français, pas de useMemo/useCallback).
```

---

## Prompt 2 — Chart : visualisation de z en `density` ou en `bubble`

```text
Contexte (vérifié dans le code) :
- `detectChart` (`src/features/chart/utils/typeDetection.js`) : avec `z` numérique,
  cat×cat → 'heatmap', cat×continu → 'violin-v' / 'violin-h', continu×continu → 'density'.
- `Chart.jsx` (≈1340 lignes) dispatche sur `chartKind` vers `HeatmapMarks`, `ViolinMarks`
  et `DensityMarks`. Il gère aussi le brush 2D, la couche de zoom, les minimaps
  (`MiniProjection`), le tooltip et la légende.
- `aggregationPlan.js` : 'heatmap' est agrégé côté serveur (`SERVER_KINDS`) ; violin et
  density reçoivent les lignes brutes.
- Les canaux hue sont `hue[0]` → couleur (`colorScale`), `hue[1]` → style (`styleScale`
  pour les pointillés en mode 'line', `hatchScale` pour les hachures en mode 'fill') et
  `hue[2]` → marqueur (`markerScale`, `markerPath(type, size)` où `size` est une AIRE en
  px², convention d3-shape). Tout cela vit dans `src/features/chart/utils/encoding.js`.
  `marks/shared/SeriesMarker.jsx` et `HatchPatterns.jsx` sont réutilisables.

Objectif : une prop `zMark: 'density' | 'bubble'` (défaut 'density' = comportement actuel,
aucun changement de rendu pour les usages existants). Avec 'bubble', chaque observation
devient un marqueur centré en (x, y), d'AIRE proportionnelle à z. Ça vaut pour les trois
cas qui ont un z.

Spécification :
1. Détection : `detectChart` reçoit `zMark`. Avec 'bubble', il renvoie le kind unique
   'bubble' pour les trois combinaisons (cat×cat, cat×continu, continu×continu). Les
   échelles se déduisent ensuite de xType / yType comme pour les autres kinds : bande pour
   un axe catégoriel, linéaire ou temporelle sinon. Ne pas créer 'bubble-v' / 'bubble-h' /
   'bubble-grid'.
2. Position : sur un axe en bande, le centre de la bande. Si le canal couleur est actif,
   décaler (dodge) les séries dans la bande, en reprenant la logique de dodge de
   `ViolinMarks` (à extraire dans un util partagé plutôt que dupliquer). Sur un axe continu,
   la valeur exacte.
3. Taille : `scaleSqrt` sur le rayon, domaine [0, max(z)] et range [0, rMax], si bien que
   l'aire est ∝ z. Ou, de façon équivalente, `markerPath(type, area)` avec une aire
   linéaire en z. Préférer cette seconde voie : elle rend le marqueur (`hue[2]`)
   applicable sans rien de spécial, et le disque est le marqueur 'circle'. rMax :
   - sur un axe en bande, ≤ la moitié de la largeur de bande (divisée par le nombre de
     séries dodgées) ;
   - sur deux axes continus, un token CSS `--chart-bubble-max-radius` à poser dans
     `marks/_tokens.scss` (en rem, lu comme les autres tokens de marques). Ne pas mettre
     de px en dur.
   z ≤ 0 ou null : rien n'est dessiné (une aire négative n'a pas de sens). Le documenter.
   Pas d'avertissement console.
4. Agrégation : en cat×cat, 'bubble' s'agrège côté serveur comme 'heatmap', avec un
   groupement par x, y ET les colonnes hue (une bulle par cellule et par série). Le
   prendre en compte dans `aggregationPlan.js` et `useAggregatedChart`. Dans les autres
   cas, on garde les lignes brutes (une bulle par ligne). Avec `aggregate` fourni, z est
   lu tel quel.
5. Encodage hue, identique aux autres marques :
   - couleur → remplissage (fill='fill') ou contour (fill='line') ;
   - style → hachures (fill='fill', via HatchPatterns) ou pointillés du contour (fill='line') ;
   - marqueur → forme (aire conservée) ;
   - fill='none' retombe sur 'fill', comme aujourd'hui pour z continu (Chart.jsx ~l.1106).
   Opacité de remplissage par un token, pour que les chevauchements restent lisibles.
   Dessiner les plus grandes bulles d'abord.
6. Survol et tooltip : `hovered` atténue les autres séries comme sur les autres marques.
   Le tooltip montre x, y, z formatés (`format` / `fields`) et les lignes hue. Sur deux
   axes continus, réutiliser le survol au plus proche (voronoi) du nuage de points.
7. Zoom, brush, minimaps : même comportement que le kind remplacé (continu×continu comme
   'density', cat×cat comme 'heatmap' avec `MiniProjection`, cat×continu comme le violon).
   Les tailles de bulles NE changent PAS au zoom.
8. Légende : ajouter une légende de taille (3 cercles de référence, valeurs formatées avec
   le format de z, titre = `labels.z` sinon le nom de colonne), à côté des légendes de
   canaux existantes dans `ChartLegend/`.
9. MultiChart : `zMark` sert de défaut, et chaque descripteur de dataset peut le
   surcharger (même mécanisme que `aggregate` / `categorical-x`).
10. Docs et vérification :
    - docstrings de `Chart` (prop `zMark`, et mettre à jour la ligne `z`) et de
      `detectChart` ;
    - `docs/content/features/chart.mdx` (section sur la 3e dimension, avec un exemple
      bubble pour chacun des trois cas) ;
    - un exemple registry par cas, ou un exemple montrant les trois ;
    - `npm run build:props -- --strict` ;
    - CHANGELOG.
    Tests Vitest : `detectChart`, `aggregationPlan` (bubble cat×cat = serveur avec hue),
    l'échelle d'aire (aire ∝ z, z ≤ 0 non dessiné), un rendu `Chart` bubble par cas. Puis
    `npm run verify`.

Contrainte de conception : 'bubble' doit s'ajouter comme UN kind et UNE marque
(`marks/BubbleMarks/`), branchés aux mêmes endroits que les autres. Pas de conditions
`zMark === 'bubble'` éparpillées dans Chart.jsx : la seule lecture de `zMark` est la
détection.

Décisions à trancher dans le plan (proposer, puis me les soumettre) :
- le nom final de la prop (`zMark` proposé) ;
- l'affichage par défaut d'un z sans aucune valeur > 0 (graphe vide + message ?) ;
- s'il faut une bascule density/bubble dans la barre d'outils (hors périmètre par défaut).
```

---

## Prompt 3 — Globe et planisphère : flèches pleines, colorées et stylées par hue

```text
Contexte (vérifié dans le code) :
- Les flux sont dessinés dans `src/features/globe/engine/GlobeEngine.js` (`_buildArcs`,
  `_arcGeometry`) en `THREE.LineSegments` avec un `ShaderMaterial` (`LINE_VERT` /
  `LINE_FRAG` dans `engine/shaders.js`).
  - Les lignes WebGL font 1 px, quelle que soit l'épaisseur demandée. Le commentaire de
    `demoData.js` (« value pilote épaisseur ») est donc faux aujourd'hui.
  - Le rendu est en fusion additive (`AdditiveBlending`), avec un dégradé origine →
    destination, une tête de « comète » animée (`arcsDynamic`, vrai par défaut) et un
    éclaircissement vers le blanc au survol.
  - Il n'y a pas de pointe de flèche.
  - La couleur est unique (`pal.arc`, lue dans `--globe-arc` par `engine/palette.js`) et
    l'opacité vient de `value`.
- Ces mécanismes sont à PRÉSERVER : le morph globe ↔ plan (`uMorph`), les copies tuilées en
  mode plan (`aShift` / `uShift`, rejet des copies en mode globe), la gestion de
  l'antiméridien (`midLon` issu de la géométrie dépliée), le test de survol (`arcHit`,
  échantillons repliés sur la tuile la plus proche), le tooltip `arcTooltipHtml`,
  `showArcs` et le nettoyage `_disposables`.

Objectif : des flèches bien visibles sur le globe comme sur le planisphère. Trait plein,
monochrome par flèche, sans effet lumineux, avec une pointe à destination, et une couleur et
un style de trait pilotés par des colonnes hue, comme sur `Chart`.

Spécification :
1. Géométrie : remplacer la ligne de 1 px par un RUBAN d'épaisseur constante À L'ÉCRAN.
   Il s'élargit dans le vertex shader : attribut côté ±1, point suivant / précédent, les
   deux projetés APRÈS le morph, décalage perpendiculaire en clip space, avec `uResolution`.
   `Line2` / `LineMaterial` ne conviennent pas : ils ne connaissent ni le morph ni le
   tuilage. L'épaisseur va de `--globe-arc-width-min` à `--globe-arc-width-max` selon
   `value` (défaut 0.5). Les deux tokens sont en rem dans `src/features/globe/_tokens.scss`,
   lus et convertis en px comme la palette. Sans `value`, prendre la moyenne des deux.
2. Pointe : un triangle à la destination, orienté selon la tangente finale À L'ÉCRAN, avec
   une longueur et une largeur proportionnelles à l'épaisseur du trait (facteurs en
   tokens ou dérivés par calc). Le ruban s'arrête à la base de la pointe. La pointe suit le
   morph et le tuilage comme le reste de l'arc.
3. Rendu : `NormalBlending`, couleur pleine (opacité ~1, via token), pas de dégradé le long
   de l'arc, pas d'éclaircissement vers le blanc. Survol : le trait s'épaissit (×1,5) et
   les autres flèches s'atténuent. Les arcs de la face cachée du globe restent masqués par
   la Terre, comme aujourd'hui : vérifier l'occultation après le passage en NormalBlending.
4. Animation : `defaultArcsDynamic` passe à `false` (le bouton de la barre d'outils
   reste). Quand elle est active, la comète devient une simple modulation d'opacité
   le long du trait, sans fusion additive. Changement de défaut → CHANGELOG.
5. Hue :
   - nouvelle prop `arcHue: string | string[]` sur `<Globe>`, qui nomme des clés des objets
     `arcs` (ex. `{ from, to, value, mode: 'rail' }`) : `arcHue[0]` → couleur (palette
     catégorielle `PALETTE` / `colorScale` du chart), `arcHue[1]` → style de trait
     (`LINE_STYLES` / `styleScale` du chart : '6 4' = 6 px de tiret, 4 px de vide) ;
   - sans `arcHue`, une seule couleur `--globe-arc` et un trait plein ;
   - les pointillés s'appliquent au ruban, pas à la pointe (toujours pleine). Leur période
     doit rester régulière à l'écran (±30 %) dans les deux modes et pendant la rotation :
     longueur d'arc à l'écran recalculée sur CPU par frame (il y a peu d'arcs) ou en
     shader, au choix du plan, mais justifié.
   - Partage du code : `PALETTE`, `LINE_STYLES`, `colorScale`, `styleScale` ont maintenant
     un second consommateur sans lien avec le chart. Les promouvoir de
     `src/features/chart/utils/encoding.js` vers `src/utils/encoding/` (règle de CLAUDE.md),
     mettre à jour les imports du chart et vérifier `npm run check:palette`. Le moteur
     three.js reçoit des couleurs résolues (THREE.Color), jamais des chaînes CSS à parser
     par frame.
   - Couleurs : ne pas casser la bascule thème clair / sombre. Vérifier comment la palette
     actuelle est relue et faire pareil.
6. Légende : une légende des flux quand `arcHue` est actif (pastille de couleur et
   échantillon de trait, titres via la nouvelle prop `arcHueLabels: { color?, style? }`,
   sinon le nom de la clé). Réutiliser `ChartLegend/ChannelLegend` s'il peut être promu dans
   `src/components/` sans dépendre des internes du chart. Sinon, créer
   `components/GlobeLegend/` en suivant la structure de dossier standard.
7. Tooltip : `arcTooltipHtml` affiche les valeurs hue de l'arc.
8. Démo, docs et tests :
   - `sources/demoData.js` : ajouter des colonnes hue aux `GLOBE_ARCS` et corriger le
     commentaire « épaisseur » ;
   - `docs/content/features/globe.mdx`, un exemple registry `arcHue`, les docstrings de
     `Globe`, le CHANGELOG ;
   - Vitest : la résolution hue → couleur / dash, et la géométrie du ruban et de la pointe
     sur des cas simples, antiméridien compris ;
   - e2e : les snapshots visuels du globe changent. Les regénérer
     (`npm run test:e2e:update`) seulement APRÈS une vérification à l'œil des deux modes,
     en clair et en sombre, dans le navigateur (skill `run`) ;
   - puis `npm run verify`.

Décisions à trancher dans le plan (proposer, puis me les soumettre) :
- les valeurs par défaut des tokens d'épaisseur et de pointe ;
- la méthode de calcul des pointillés (CPU par frame ou shader) ;
- promouvoir ChannelLegend ou créer une GlobeLegend.
```

---

## Prompt 4 — Slider du MultiCriterionMenu : bornes calculées sous les autres critères

```text
Contexte (vérifié dans le code) :
- `useRangeBounds` (`src/components/filter/ConstraintField/useRangeBounds.js`) lit
  min / max via getFieldStats, sur toute la colonne ou sur `scopeFilters` (un FilterNode)
  quand on lui en donne un. `ConstraintField` expose déjà la prop `scopeFilters`.
- Depuis le commit 79c387b, `MultiCriterionMenu` → `CriterionMenu` → `ValueField` →
  `ConstraintField` ne transmettent plus aucun filtre : les bornes portent sur toute la
  colonne. Le slider ne se referme donc plus sur sa propre sélection, mais il ignore aussi
  les AUTRES critères.
- `ConstraintField` valide aussi la valeur contre ces bornes (`validFor`, « Hors de
  bornes », `minDate` / `maxDate` du calendrier). Le verdict remonte par
  `onValidityChange`, et un critère jugé invalide est omis du FilterNode
  (`complete === false` dans `filterEngine.convertNode`).
- `filterEngine.js` : `buildTree(items)` → arbre profondeur/groupe ; `toFilterNode(tree,
  { balanced, dateOrder })` → FilterNode (critères incomplets omis). Dans un groupe, les
  connecteurs se lisent avec la précédence SQL : ET avant OU
  (`docs/content/guides/api-graphql.mdx` ~l.270).

Objectif : DANS le MultiCriterionMenu uniquement, le slider (piste et poignées) d'une
carte numérique ou date montre l'étendue des valeurs encore atteignables compte tenu des
AUTRES critères. Le critère en cours d'édition est exclu. PARTOUT AILLEURS, rien ne change :
`ConstraintField` isolé, `CriterionMenu` seul, filtres du tableau, exemples du registry.
Les bornes y restent celles de toute la colonne (ou de `scopeFilters` quand un appelant
le fournit, comme aujourd'hui).

Spécification :
1. Sémantique du périmètre d'une carte C : c'est l'expression complète dans laquelle C est
   remplacé par VRAI, puis simplifiée. On ne se contente pas de « retirer C », qui serait
   faux avec OU :
   - `A ET B` : la carte A est bornée par B ;
   - `A OU B` : VRAI OU B = VRAI, donc aucun filtre et bornes globales ;
   - `(A OU B) ET D` : la carte A est bornée par D ;
   - `A ET B OU D` (= `(A ET B) OU D`) : (VRAI ET B) OU D = B OU D.
   La simplification respecte la précédence ET > OU à l'intérieur d'un groupe et les
   parenthèses entre groupes, exactement comme l'API. Les critères incomplets ou invalides
   sont omis comme dans `toFilterNode`. Une expression déséquilibrée (crochet non fermé)
   donne `null` (bornes globales).
2. Fonction pure dans `src/features/filter/utils/filterEngine.js` :
   `scopeWithout(criteria, excludedId, { dateOrder })` → `?FilterNode`. Elle prend la liste
   plate des cartes (avec `id`), réutilise `buildTree` et la conversion existante, puis
   renvoie `null` quand le périmètre se réduit à VRAI. Docstring Google avec les exemples
   ci-dessus. C'est elle qui porte toute la logique : les composants ne font que
   transmettre.
3. Câblage :
   - Nouvelle prop de `MultiCriterionMenu` : `dependentValues` (booléen, défaut `true`).
     Avec `true`, chaque carte est restreinte par les autres critères. Avec `false`, les
     valeurs possibles sont globales, comme aujourd'hui. Cette prop gouvernera aussi les
     options des menus catégoriels (prompt 5b) : la nommer et la documenter pour les deux
     usages dès maintenant (« les valeurs proposées — bornes du slider, options des
     menus — dépendent des autres critères »).
   - Avec `dependentValues`, `MultiCriterionMenu` calcule le périmètre de chaque carte et
     le passe à `CriterionMenu` par une nouvelle prop `valuesScope` (`?FilterNode`), puis
     à `ValueField`, puis à `ConstraintField` (`trackScope`, cf. §4). Défaut `undefined`
     partout, si bien que `CriterionMenu` seul et les autres consommateurs restent sur
     les bornes globales.
   - Le périmètre se calcule sur les critères DÉBOUNCÉS, c'est-à-dire ceux émis par
     `onChange`, pas à chaque frappe. Sinon chaque caractère tapé dans B relancerait
     getFieldStats pour A.
   - Pas de `useMemo` (React Compiler). La clé SWR de getFieldStats sérialise le
     FilterNode : vérifier qu'un périmètre identique en contenu ne relance pas de requête.
4. Piste et validation sont SÉPARÉES. C'est le point critique. Ne pas réutiliser
   `scopeFilters` tel quel, car il borne aussi la validation. Ajouter à `ConstraintField`
   une prop distincte `trackScope` (`?FilterNode`) :
   - la PISTE du slider (min / max des poignées) vient de `trackScope` ;
   - la VALIDATION (« Hors de bornes », `validFor`) et le `minDate` / `maxDate` du
     calendrier restent sur les bornes globales (ou `scopeFilters`), comme aujourd'hui.
   Sinon, modifier B pourrait rendre A « invalide » : A serait alors retiré du filtre, le
   périmètre de B s'élargirait, et ainsi de suite (oscillation).
   - La piste est élargie pour contenir la valeur courante de la carte. Les poignées ne
     sortent jamais de la piste, même si les autres critères excluent cette valeur.
   - Périmètre vide (min / max null : aucune ligne ne satisfait les autres critères) :
     la piste retombe sur les bornes globales.
   - Le pas (`stepFor`) se calcule sur les bornes globales, pour ne pas changer de
     granularité au fil des filtres.
   - Concrètement, `ConstraintField` appelle `useRangeBounds` deux fois quand
     `trackScope` est fourni (global + périmètre), et une seule fois sinon. La requête
     globale est déjà en cache SWR.
5. Pendant le chargement des bornes du périmètre, garder la piste précédente. Pas de
   clignotement vers la piste globale.
6. Docs :
   - docstrings de `useRangeBounds`, `ConstraintField` (`trackScope` vs `scopeFilters`),
     `ValueField`, `CriterionMenu` (`boundsScope`) et `MultiCriterionMenu` ;
   - `docs/content/features/filter.mdx` : nouveau paragraphe « Bornes du slider », avec
     les exemples ET / OU et la phrase « en dehors du MultiCriterionMenu, les bornes
     portent sur toute la colonne » ;
   - `docs/content/guides/api-graphql.mdx` (~l.343) si la phrase sur `scopeFilters` devient
     ambiguë ;
   - CHANGELOG ;
   - `npm run build:props -- --strict`.
7. Tests :
   - Vitest pour `scopeWithout` : les quatre exemples du §1, des groupes imbriqués, un
     critère incomplet ignoré, une expression déséquilibrée → null, la carte exclue seule
     → null, et des dates converties en ISO. `MultiCriterionMenu` avec
     `dependentValues={false}` : aucun périmètre n'est transmis.
   - Vitest pour `ConstraintField` : la piste suit `trackScope`, la validation suit les
     bornes globales, la piste est élargie à la valeur courante, et un périmètre vide
     retombe sur les bornes globales.
   - Un test d'intégration `MultiCriterionMenu` avec deux cartes en ET (le transport mock
     doit appliquer `structuredFilters` dans getFieldStats : le vérifier dans
     `src/lib/api/transports/mock.js` et le compléter si besoin).
   - Puis `npm run verify`.

Décisions à trancher dans le plan (proposer, puis me les soumettre) :
- les noms `dependentValues` / `valuesScope` / `trackScope`.
Les options des menus catégoriels sont traitées à part, par les prompts 5a et 5b : ne pas
y toucher ici.

---

## Prompt 5a — API : filtrer les options des menus (`dashboard-template-api`)

À lancer **dans le dépôt `dashboard-template-api`**, pas dans le front.

```text
Contexte : le front veut que les options d'un menu de valeurs dépendent des autres filtres
du tableau de bord. Aujourd'hui `getSelectOptions(fieldName, limit, searchTerm, labelField,
catalog, schema)` et `getSelectOptionsTree(fieldName, maxDepth, searchTerm, catalog,
schema)` n'acceptent pas de filtre. `getFieldStats`, `getFactTable` et `getAggregates`
acceptent déjà `structuredFilters: FilterNode`.

À faire :
1. Ajouter l'argument optionnel `structuredFilters: FilterNode` aux deux requêtes.
   Réutiliser EXACTEMENT la validation et la compilation en WHERE paramétré de
   `getFieldStats` : même fonction, aucune copie. Le filtre s'applique aux lignes AVANT le
   `SELECT DISTINCT`. Pour l'arbre, il s'applique aux lignes avant la remontée de la chaîne
   `parentName`. On n'obtient donc que les branches qui ont au moins une ligne
   satisfaisant le filtre.
2. Absent ou `null` : le comportement est strictement identique à aujourd'hui (même SQL,
   même cache).
3. Combinaison avec `searchTerm` / `limit` / `maxDepth` / `labelField` : le filtre
   restreint les lignes, la recherche et la limite s'appliquent ensuite, sans changement.
   `TREE_MAX_NODES` se compte après le filtre.
4. Clés de cache, analyseur de complexité, mêmes erreurs BAD_USER_INPUT que les autres
   requêtes qui prennent un FilterNode (variable inconnue, opération non admise…).
5. Descriptions SDL des deux requêtes, avec un exemple. Régénérer les types
   (`src/generated`) et la doc du schéma (docs-site). Ajouter une entrée au CHANGELOG
   (fonctionnalité, non cassante).
6. Tests : filtre ET / OU sur une autre colonne, combinaison avec `searchTerm`, un arbre
   élagué, un filtre invalide → BAD_USER_INPUT, et l'absence de filtre → résultat
   identique à avant.
7. Suivre le flux de release du dépôt (release-please) pour que le front puisse ensuite
   lancer `npm run sync:schema`.
```

---

## Prompt 5b — SelectMenu du MultiCriterionMenu : options selon les autres critères

Prérequis : le prompt 4 est fusionné, l'API du prompt 5a est publiée, et `npm run sync:schema`
a mis à jour `scripts/schema.graphql`.

```text
Contexte (vérifié dans le code) :
- Le prompt 4 a ajouté à `MultiCriterionMenu` la prop `dependentValues` (défaut `true`),
  la fonction `scopeWithout(criteria, excludedId)` dans `filterEngine.js`, et la prop
  `valuesScope` transmise de `CriterionMenu` à `ValueField`. Aujourd'hui, `valuesScope`
  ne sert qu'aux champs numériques et dates (`ConstraintField.trackScope`).
- Les menus catégoriels passent par `ValueField` (IN / NOT_IN en multi, égalité en
  simple), puis `SelectMenu` (`src/components/filter/SelectMenu/SelectMenu.jsx`), puis
  `useSelectOptions`. Ce hook lance `getSelectOptions` (plat, recherche serveur au-delà de
  la liste de base non exhaustive) ou `getSelectOptionsTree` (groupé). La clé SWR vaut
  `[…, fieldName, catalog, grouped, searchTerm, schema]`.
- L'API accepte maintenant `structuredFilters: FilterNode` sur ces deux requêtes (vérifier
  `scripts/schema.graphql`).

Objectif : dans le MultiCriterionMenu, avec `dependentValues` (défaut), les options d'un
menu catégoriel se limitent aux valeurs présentes dans les lignes qui satisfont les
AUTRES critères. On utilise le même périmètre que le slider (`scopeWithout`, critère
édité remplacé par VRAI). Avec `dependentValues={false}`, et partout ailleurs (SelectMenu
isolé, CriterionMenu seul, filtres du tableau), les options restent globales, comme
aujourd'hui.

À faire :
1. API côté front : ajouter `$structuredFilters: FilterNode` aux documents
   `GET_SELECT_OPTIONS` et `GET_SELECT_OPTIONS_TREE` (`src/lib/api/documents/selectOptions.js`),
   puis passer `npm run check:gql`. Le transport mock (`src/lib/api/transports/mock.js`)
   doit appliquer le filtre aux fixtures, avec le même évaluateur que `getFieldStats` en
   mock s'il existe (sinon le factoriser).
2. `useSelectOptions` : nouveau paramètre `scopeFilters` (`?FilterNode`), envoyé en
   `structuredFilters` et inclus dans la clé SWR (sérialisation stable). Absent : requête
   et clé strictement identiques à aujourd'hui, ce qui préserve le cache partagé. La
   recherche serveur et la recherche locale fonctionnent comme avant, à l'intérieur du
   périmètre.
3. `SelectMenu` : nouvelle prop `scopeFilters`, transmise au hook. Ne PAS la nommer
   autrement que dans `ConstraintField` / `useRangeBounds`, où `scopeFilters` désigne déjà
   « le périmètre des valeurs proposées ». Ici, contrairement au slider, il n'y a pas de
   validation à séparer, donc une seule prop suffit. Le vérifier : `SelectMenu` ne doit
   rien invalider sur la base des options chargées.
4. `ValueField` transmet `valuesScope` à `SelectMenu` en `scopeFilters`, dans les deux
   branches catégorielles (multi et simple).
5. Valeurs déjà sélectionnées : elles ne sont JAMAIS retirées ni invalidées parce qu'un
   autre critère les a exclues du périmètre. Elles restent affichées et sélectionnées
   (elles sont dans `value`). Si `SelectMenu` ne sait afficher une sélection qu'à partir
   des options chargées, ajouter les sélectionnées absentes en tête de liste. En mode
   groupé, les mettre dans un groupe « Hors périmètre » (libellé dans DEFAULT_LABELS et les
   dictionnaires, `npm run check:i18n`). Cela évite l'oscillation décrite au prompt 4
   (un critère retiré élargirait le périmètre des autres).
6. Périmètre vide (aucune option) : afficher le message vide existant du menu. Ne pas
   basculer sur les options globales, car un menu vide est ici une information juste.
   Comportement différent du slider, à documenter.
7. Pendant le chargement d'un nouveau périmètre, garder la liste précédente
   (`keepPreviousData`, déjà utilisé).
8. Le périmètre vient des critères DÉBOUNCÉS (même source que le prompt 4). Ouvrir un menu
   ne doit pas relancer de requête si le périmètre n'a pas changé.
9. Docs :
   - docstrings de `useSelectOptions`, `SelectMenu`, `ValueField` et de la prop
     `dependentValues` de `MultiCriterionMenu`, qui couvre maintenant les deux types de
     champ ;
   - `docs/content/features/filter.mdx` : étendre le paragraphe du prompt 4 en « Valeurs
     proposées », avec un exemple catégoriel et un exemple `dependentValues={false}` ;
   - `docs/content/guides/api-graphql.mdx` (les deux requêtes acceptent `structuredFilters`) ;
   - un exemple registry `multi-criterion-menu-independent-values` ;
   - `npm run build:props -- --strict` ;
   - CHANGELOG.
10. Tests :
    - Vitest `useSelectOptions` : la clé change avec le périmètre, la requête sans
      périmètre est identique à avant, et le filtre est bien transmis (plat et arbre) ;
    - `SelectMenu` : une sélection hors périmètre reste visible et sélectionnée ;
    - intégration `MultiCriterionMenu` (mock) : pays IN (…) ET continent = Europe → le
      menu des pays ne propose que des pays européens, et avec `dependentValues={false}`
      il les propose tous ;
    - puis `npm run verify`.
```
