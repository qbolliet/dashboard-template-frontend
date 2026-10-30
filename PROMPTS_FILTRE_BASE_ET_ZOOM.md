# Prompts — filtre latent du MultiCriterionMenu, zoom initial et axe des valeurs

Trois prompts à lancer **chacun dans une session neuve**, avec un commit entre chaque.
Le prompt 1 est indépendant des deux autres. Les prompts 2 et 3 touchent tous deux
`useBrushZoom.js`, `Chart.jsx` et `MultiChart.jsx` : les lancer dans l'ordre **2 → 3**.

| # | Sujet | Modèle | Effort | Plan mode |
|---|-------|--------|--------|-----------|
| 1 | MultiCriterionMenu : filtre latent `baseFilter` (concaténé à la sortie, borne les périmètres) | Opus 5.5 | high | non : la sémantique est fixée ci-dessous, le périmètre est circonscrit au filtre |
| 2 | Chart : axe des valeurs sans zéro obligatoire (`zeroBaseline`) et recadrage au zoom (`fitOnZoom`) | Opus 5.5 | high | **oui** : `Chart.jsx` (1 400 lignes), `MultiChart`, marks, survol, mini-vues et overlays sont concernés |
| 3 | Chart : zoom initial (`defaultZoom`, ex. 5 dernières observations) | Opus 5.5 | high | non : la conception est imposée, le piège (données asynchrones) est décrit |

## Constat (vérifié dans le code le 30/10/2026)

**Filtre latent du MultiCriterionMenu : absent.** Le composant n'a aucune prop de ce
type. Ce qu'il émet (`{ criteria, tree, balanced, serial }`) ne contient que les cartes
affichées. Le périmètre de chaque carte vaut `scopeWithout(scopeItems, c.id)`
(`MultiCriterionMenu.jsx` l.401) et ne dépend que des autres cartes. Aucun utilitaire ne
combine deux FilterNode : `andNodes(node, leaves)` attend des feuilles.

**Zoom par défaut : impossible aujourd'hui.** `useBrushZoom` démarre sur
`useState(null)` (l.176-177). `MultiChart` fait de même (l.297). Aucune prop ne permet de
fixer une fenêtre initiale. Défaut connexe : la sélection n'est jamais réinitialisée quand
les données changent. Après un changement de filtre, une ancienne sélection peut donc
tomber hors des nouvelles données, et le graphique s'affiche vide.

**Zéro sur l'axe des valeurs : correct pour les courbes, imposé pour les barres.**
- `<Chart>` en courbe non empilée : domaine = étendue des données (`nice`), sans ancrage à 0.
  Une série en milliards n'est donc pas écrasée. ✔
- `<Chart>` en barres (`bar` / `bar-h`) : `if (ext[0] > 0) ext = [0, ext[1]]`, sans option
  (`Chart.jsx` l.485 et l.502, `utils/scales.js` l.52-53). Les piles partent toujours de 0.
- `<MultiChart>` : ancre à 0 les barres **et les aires** (`fill: 'fill'`) (l.398-409).
- Point manquant, et c'est lui qui écrase les variations : au zoom sur l'axe des x,
  `<Chart>` ne recadre **pas** l'axe y. `yScale` reste `baseYScale` tant qu'il n'y a pas de
  `ySel` (l.213-214), et la molette ne zoome que l'axe principal (l.305). Zoomer sur les 5
  dernières observations garde donc l'amplitude de toute la série. `<MultiChart>`, lui,
  recalcule déjà y sur les lignes visibles : les deux composants se comportent différemment.
- Si on autorise des barres sans 0, il faut corriger leur ligne de base.
  `zero = valScale(0)` (`BarMarks.jsx` l.95, cibles de survol `Chart.jsx` l.166) tomberait
  hors du tracé.

---

## Prompt 1 — MultiCriterionMenu : filtre latent `baseFilter`

```text
Contexte (vérifié dans le code, ne pas re-déduire autrement) :
- `src/features/filter/components/MultiCriterionMenu/MultiCriterionMenu.jsx` émet via
  `onChange` (debouncé 300 ms, `useDebouncedCallback`) la structure
  `{ criteria, tree, balanced, serial }` construite par `buildStructure`. Elle ne
  contient que les cartes affichées.
- Le périmètre de chaque carte (prop `valuesScope` de `CriterionMenu`, transmise à
  `ValueField`, puis en `scopeFilters` au SelectMenu et en `trackScope` au
  ConstraintField) vaut `dependentValues ? scopeWithout(scopeItems, c.id, { dateOrder })
  : undefined` (l.401). `scopeWithout` (`src/features/filter/utils/filterEngine.js`)
  renvoie un FilterNode racine `{ children }` ou `null` (aucune restriction).
- `filterEngine.js` exporte `toFilterNode(tree, { balanced, dateOrder })` (arbre buildTree
  → FilterNode API) et `andNodes(node, leaves)`, qui ajoute des FEUILLES en ET. Aucune
  fonction ne combine deux FilterNode.
- Le seul consommateur réel est
  `src/page-templates/components/IndicatorExplorer/IndicatorExplorer.jsx` (l.176-178). Il
  appelle lui-même `toFilterNode(filter.tree, …)`, puis `andNodes` avec les filtres de
  colonne du tableau.
- Règle documentée dans le composant (commentaire de `configSig`, l.338-350) : toute prop
  lue par `buildStructure()` doit figurer dans `configSig`. Sinon, son changement n'est
  jamais émis.

Objectif : permettre de passer au MultiCriterionMenu un filtre qui n'est PAS affiché,
mais qui (a) est concaténé en ET aux filtres du menu dans ce qu'il émet et (b) restreint
les valeurs proposées par chaque carte. Ce filtre vient d'un autre menu (chaînage) ou est
propre à ce menu (latent).

À faire :
1. `filterEngine.js` : ajouter et exporter deux fonctions pures, avec une docstring Google
   en anglais et des commentaires en français, comme le reste du fichier.
   - `asFilterNode(input, { dateOrder })` : normalise l'entrée en FilterNode racine
     `{ children }`, ou `null`. Formes acceptées :
     `null` / `undefined` → null ;
     sortie d'un MultiCriterionMenu portant `structuredFilters` (voir §3) → cette valeur ;
     sortie d'un MultiCriterionMenu sans ce champ (`{ tree, balanced }`) →
     `toFilterNode(tree, { balanced, dateOrder })` ;
     FilterNode racine (`{ children }`) → tel quel (null si `children` est vide) ;
     nœud feuille (`{ criterion }`) → `{ children: [node] }`.
     Toute autre forme → null, avec un `console.warn` en développement uniquement.
   - `andFilterNodes(...nodes)` : ET de FilterNode racines. Les `null` sont ignorés.
     Aucun nœud → null. Un seul nœud → renvoyé tel quel. Sinon,
     `{ children: [n1, { connector: 'AND', ...n2 }, …] }`, où chaque nœud devient un
     SOUS-GROUPE. On le recopie entier, sans son `connector`, pour garder un éventuel
     `negate` et la précédence interne de ses connecteurs. C'est la même logique que
     `andNodes` pour la racine existante, généralisée. Le premier enfant ne porte pas de
     connecteur.
2. `MultiCriterionMenu` : nouvelle prop `baseFilter` (défaut `null`), de n'importe quelle
   forme acceptée par `asFilterNode`. Elle est normalisée au rendu avec la prop
   `dateOrder` du composant.
   - Périmètre des cartes : `dependentValues` vrai →
     `andFilterNodes(base, scopeWithout(scopeItems, c.id, { dateOrder }))` ;
     `dependentValues` faux → `base`. Les cartes sont alors indépendantes les unes des
     autres, mais restent dans le filtre latent. Sans `baseFilter`, le comportement est
     strictement identique à aujourd'hui (`undefined` quand `dependentValues` est faux).
   - Les règles existantes restent inchangées : une valeur catégorielle déjà choisie n'est
     jamais retirée ni invalidée ; la validation numérique/date garde toute la colonne ;
     un périmètre vide fait retomber la piste du slider sur la colonne.
   - Émission : ajouter `structuredFilters` à la structure émise. Elle vaut
     `andFilterNodes(base, toFilterNode(tree, { balanced, dateOrder }))`. Expression non
     équilibrée → filtre du menu nul → `structuredFilters` = filtre latent seul.
     `criteria` / `tree` / `serial` restent ceux des cartes affichées : le filtre latent
     n'est pas persisté via `defaultCriteria`. Le documenter.
   - Ajouter une signature du filtre latent normalisé à `configSig`, par exemple
     `|base:${JSON.stringify(base)}`, pour qu'un changement de `baseFilter` (venu d'un
     menu amont) réémette immédiatement. `dateOrder` passe désormais dans
     `buildStructure` : l'ajouter aussi à `configSig` et mettre à jour le commentaire de
     la règle.
   - Chaînage : un menu B qui reçoit `baseFilter={sortieDeA}` compose naturellement, car
     `sortieDeA.structuredFilters` contient déjà le filtre latent de A.
3. `IndicatorExplorer` : remplacer le `toFilterNode(filter.tree, …)` local par
   `filter?.structuredFilters ?? null`. Le résultat est identique sans filtre latent, et
   ce code reste juste le jour où on en passe un. Garder `andNodes` pour les filtres de
   colonne du tableau.
4. Docs :
   - docstrings de `MultiCriterionMenu` (`baseFilter`, nouveau champ `structuredFilters`
     dans la forme d'`onChange`, phrase sur `dependentValues`) et de `CriterionMenu`
     (`valuesScope` peut maintenant contenir le filtre latent) ;
   - `docs/content/features/filter.mdx` : section « Filtre latent et menus chaînés », avec
     les deux usages (filtre fixe d'un menu, menu B qui dépend du menu A) et un schéma du
     ET obtenu ;
   - nouvel exemple de registry `registry/examples/multi-criterion-menu-base-filter.jsx`
     (deux menus chaînés + l'aperçu JSON de `structuredFilters`), sur le modèle de
     `multi-criterion-menu-basic.jsx`, puis `npm run build:registry` sans avertissement ;
   - CHANGELOG (Added) et `npm run build:props -- --strict`.
5. Tests :
   - Vitest `filterEngine.test.js` : `asFilterNode`, pour chaque forme acceptée, une forme
     invalide et une expression non équilibrée ; `andFilterNodes` avec 0, 1 et 2 nœuds,
     des null intercalés, un nœud racine en OU (précédence gardée grâce au sous-groupe) et
     un nœud `negate` conservé.
   - Vitest `MultiCriterionMenu.test.jsx` :
     - `onChange` reçoit `structuredFilters` = filtre latent ET cartes ;
     - avec un menu vide, `structuredFilters` = filtre latent seul ;
     - un changement de `baseFilter` réémet sans action de l'utilisateur ;
     - le périmètre transmis aux cartes contient le filtre latent, avec `dependentValues`
       vrai ET faux ;
     - sans `baseFilter`, rien ne change (non-régression des tests existants).
     Le transport mock (`src/lib/api/transports/mock.js`) applique déjà `structuredFilters`
     aux options et aux statistiques : s'en servir (comme dans
     `MultiCriterionMenu.options.test.jsx`) pour vérifier qu'un menu catégoriel sous filtre
     latent ne liste que les valeurs atteignables.
   - Puis `npm run lint`, `npm run test` et `npm run verify`.
```

---

## Prompt 2 — Chart : axe des valeurs sans zéro obligatoire et recadrage au zoom

```text
Contexte (vérifié dans le code, ne pas re-déduire autrement) :
- Domaine de l'axe des VALEURS, `src/features/chart/components/Chart/Chart.jsx` l.476-508
  (échelles de base) :
  - `line` non empilé : étendue des données + `nice`, sans ancrage à 0 ;
  - `bar` / `bar-h` non empilés : `if (ext[0] > 0) ext = [0, ext[1]]`, sans option ;
  - empilé : `lo = 0`, `hi = stackMini.max` ;
  - `augValExtent` (intervalles de confiance, projections) élargit le domaine.
  La même règle d'ancrage est recopiée dans `src/features/chart/utils/scales.js`
  (`makeScale`, l.52-53), qu'utilise `useChartGeometry`. Une troisième variante vit dans
  `src/features/chart/components/MultiChart/MultiChart.jsx` (l.393-412) : `anchor0` pour
  les barres ET pour les aires (`fill: 'fill'`), y calculé sur les lignes FILTRÉES par le
  zoom x.
- Ligne de base : `BarMarks.jsx` l.95 et les cibles de survol des barres (`Chart.jsx`
  l.166-187) utilisent `zero = valScale(0)`. L'aire non empilée de `LineMarks.jsx` (l.87)
  descend jusqu'au bas du tracé (`yScale.range()[0]`), pas jusqu'à 0.
- Zoom (`src/features/chart/hooks/useBrushZoom.js`) : `yScale = ySel ? restrictScale(…) :
  baseYScale` (l.213-214). La molette ne zoome que l'axe principal (x, ou y pour `bar-h`),
  sauf en heatmap/density (l.305-314). Au zoom x, l'axe y garde donc l'amplitude de TOUTE
  la série. `axisZoomFactors` produit `zx` / `zy`, qui transforment la couche zoomée
  (voronoï, KDE, calculés en coordonnées de base) : un domaine y recadré doit passer par
  `zy` pour que le survol reste aligné.
- Pendant un geste de brush, les marks sont rendus en coordonnées de base et
  transformés par la preview impérative (en-tête de `useBrushZoom.js`). Aucun recalcul
  React par frame : ne pas casser cette propriété.

Objectif : (a) qu'un graphique en milliards ne soit pas écrasé, y compris en barres si on
le demande ; (b) qu'au zoom sur l'axe principal, l'axe des valeurs se recadre sur ce qui
est visible.

À faire :
1. Créer une fonction pure unique `valueDomain({ values, kind, stacked, zeroBaseline,
   extra })` dans `src/features/chart/utils/scales.js`. Elle renvoie `[lo, hi]` avant
   `nice`.
   - `zeroBaseline: 'auto'` (défaut) : comportement actuel. Barres et piles incluent 0,
     les courbes non.
   - `true` : 0 toujours inclus, courbes comprises.
   - `false` : étendue des données, même pour les barres non empilées.
   - Les piles incluent TOUJOURS 0, quelle que soit la valeur : une pile qui ne part pas
     de 0 fausse la lecture des parts. Le documenter.
   - `extra` (= `augValExtent`) est toujours inclus.
   - Toutes les valeurs égales → domaine élargi (comme `if (lo === hi) hi = lo + 1` dans
     MultiChart).
   Remplacer les trois copies (Chart l.476-508, `makeScale`, MultiChart l.393-412) par des
   appels à cette fonction. Pour MultiChart, garder l'ancrage des aires en `'auto'`
   (comportement actuel), mais le lever avec `zeroBaseline={false}`.
2. Ligne de base : ajouter `baselineValue([lo, hi])`, qui renvoie 0 s'il est dans le
   domaine, sinon la borne la plus proche de 0. L'utiliser à la place de `valScale(0)`
   dans `BarMarks` et dans les cibles de survol des barres, mini-vues comprises (elles
   réutilisent `BarMarks`). L'aire non empilée de `LineMarks` va jusqu'à
   `yScale(baselineValue)` quand `zeroBaseline === true`. Sinon, elle garde le bas du
   tracé. Vérifier que les overlays (confiance, avant/après, normalisation) ne supposent
   pas de 0 dans le domaine.
3. Recadrage au zoom : prop `fitOnZoom` (booléen, défaut `true`), pour `line`, `bar` et
   `bar-h`. Elle s'applique quand l'axe principal a une sélection committée et que l'axe
   des valeurs n'en a pas. Le domaine des valeurs est alors recalculé par `valueDomain`
   sur les lignes visibles (`filteredData`, ou `stackMain` si empilé), avec la même règle
   de zéro et `nice`.
   - NE PAS passer par `ySel` : `filteredData` serait filtré en y, la mini-vue y et
     `canReset` refléteraient une sélection que l'utilisateur n'a pas faite. Calculer
     l'échelle recadrée à part, dans `useBrushZoom` (paramètre `fitValueDomain(rows)` ou
     équivalent), puis dériver `zy` de cette échelle pour garder la couche zoomée alignée.
   - Pendant un geste de brush, aucun recadrage par frame. Il a lieu au relâchement, avec
     le commit.
   - `fitOnZoom={false}` : comportement actuel, y compris dans MultiChart, qui recadre
     déjà aujourd'hui. Aligner MultiChart sur la prop.
4. Props : `zeroBaseline` et `fitOnZoom` sur `<Chart>`, transmises à `<MultiChart>` comme
   les autres props de la branche « liste de jeux ». Un jeu peut-il les surcharger ? Non :
   l'axe y est commun à tous les jeux.
5. Docs :
   - docstrings de `Chart`, `MultiChart`, `useBrushZoom`, `BarMarks` et `LineMarks` ;
   - `docs/content/features/chart.mdx` : section « Axe des valeurs : zéro et recadrage »,
     avec la règle par type, l'exception des piles et le recadrage au zoom ;
   - exemple de registry `registry/examples/chart-value-axis.jsx` : des barres en
     milliards avec `zeroBaseline={false}` à côté du réglage par défaut. Puis
     `npm run build:registry` ;
   - CHANGELOG : Added (`zeroBaseline`) et Changed (`fitOnZoom` vrai par défaut : au zoom,
     l'axe y d'un `<Chart>` se recadre désormais) ;
   - `npm run build:props -- --strict`.
6. Tests :
   - Vitest `valueDomain` / `baselineValue` : barres en auto (ancrées), barres à `false`
     (non ancrées), pile toujours à 0, courbe à `true` (inclut 0), valeurs toutes
     négatives, `extra`, valeurs toutes égales.
   - Vitest `Chart` : en barres à `zeroBaseline={false}` sur des valeurs ≥ 1e9, chaque
     `<rect>` de barre reste dans le tracé (y ≥ 0, y + height ≤ innerHeight) ;
     `fitOnZoom` : une sélection x restreinte recadre les graduations y, et
     `fitOnZoom={false}` les garde ; aucun rendu de régression sans ces props (tests
     existants verts).
   - `npx playwright test e2e/visual.spec.ts` : le rendu initial sans zoom ne doit pas
     changer. Si un instantané bouge, l'examiner avant toute mise à jour.
   - Puis `npm run lint`, `npm run test` et `npm run verify`.

Décisions à trancher dans le plan (proposer, puis me les soumettre) :
- les noms `zeroBaseline` / `fitOnZoom`, et le défaut `true` de `fitOnZoom` (il change le
  comportement actuel de `<Chart>`, mais l'aligne sur `<MultiChart>`) ;
- un repère visuel de rupture d'axe quand des barres ne partent pas de 0 (par exemple un
  « ≈ » au pied de l'axe des valeurs). Mon avis : ne pas en mettre par défaut, les
  graduations suffisent. Le proposer en option seulement si c'est bon marché.
```

---

## Prompt 3 — Chart : zoom initial `defaultZoom`

Prérequis : le prompt 2 est fusionné (le recadrage `fitOnZoom` doit s'appliquer dès le
premier affichage zoomé).

```text
Contexte (vérifié dans le code, ne pas re-déduire autrement) :
- `src/features/chart/hooks/useBrushZoom.js` : `xSel` / `ySel` naissent à `null`
  (`useState(null)`, l.176-177). Il n'existe aucune prop de zoom initial.
  `<MultiChart>` (l.297) a son propre `xSel`, en x continu uniquement.
- Les mini-vues sont contrôlées : `<BrushMinimap selection={xSel} onChange={setXSel}>`
  (`Chart.jsx` ~l.966-979). Une sélection posée par le hook est donc reflétée sans
  travail supplémentaire.
- Format d'une sélection : `[Date, Date]` pour un axe date, `[n0, n1]` pour un axe
  numérique, `[cat0, cat1]` (valeurs du domaine de bande) pour un axe catégoriel.
  `restrictScale` applique le domaine EXACT, sans `nice`.
- La sélection n'est jamais réinitialisée quand `data` change. Après un changement de
  filtre (IndicatorExplorer), une sélection périmée peut vider le graphique.
- Les données arrivent souvent de façon asynchrone. IndicatorExplorer et
  `useAggregatedChart` passent `data=[]` pendant le chargement. Un zoom résolu une seule
  fois, au montage, tomberait donc sur des données vides.
- Le motif d'ajustement d'état pendant le rendu est déjà utilisé dans le dépôt
  (`MultiCriterionMenu.jsx`, `lockSig` / `prevLockSig`). C'est celui qu'il faut ici : pas
  de `setState` dans un `useEffect`.

Objectif : pouvoir choisir la fenêtre affichée au premier rendu, par exemple les 5
dernières observations d'une courbe.

À faire :
1. Nouveau module pur `src/features/chart/utils/zoomSpec.js` :
   `resolveZoomSpec(spec, { type, baseScale, data, col })` renvoie une sélection au
   format du hook, ou `null` (vue complète). Formes de `spec` :
   - `[from, to]` en unités de données (Date ou chaîne ISO pour un axe date, nombre, valeur
     de catégorie) ; la conversion d'une chaîne ISO réutilise la coercition déjà appliquée
     aux données (la retrouver, ne pas en écrire une deuxième) ; bornes ramenées dans le
     domaine de base, ordre normalisé ;
   - `{ last: n }` / `{ first: n }` : les n dernières (premières) valeurs DISTINCTES de
     l'axe, dans l'ordre du domaine (ordre de bande en catégoriel, croissant en continu) ;
   - `n` ≥ nombre de valeurs → `null` ; en continu, `n = 1` est traité comme 2 (un
     domaine de largeur nulle est interdit) ;
   - toute forme invalide → `null`, avec un `console.warn` en développement.
2. Prop `defaultZoom` sur `<Chart>` : `{ x?: spec, y?: spec }`.
   - Axes admis : l'axe principal pour les graphiques à une dimension (x, ou y pour
     `bar-h`), les deux axes pour heatmap/density.
   - Une spec sur un axe non zoomable est ignorée, avec un avertissement en dev.
   - La prop est transmise à `<MultiChart>`, qui n'accepte que `x`, en continu.
3. Amorçage dans `useBrushZoom` (et l'équivalent dans MultiChart) : ajustement pendant le
   rendu, sur une signature `${signature de la spec}|${signature du domaine de base}`.
   La signature du domaine vaut les bornes en continu (après `nice`, stables à données
   égales) et le domaine joint en catégoriel. Quand elle change, on écrit
   `setXSel(resolveZoomSpec(…))` (idem pour y).
   Conséquences voulues, à documenter :
   - des données d'abord vides, puis chargées → le zoom initial s'applique à l'arrivée ;
   - un filtre qui change le domaine → le zoom initial est réappliqué ; sans
     `defaultZoom`, retour à la vue complète (corrige la sélection périmée) ;
   - même domaine (nouvelle identité de `data`, valeurs identiques) → le zoom manuel de
     l'utilisateur est conservé.
   Données vides → `null`, sans erreur.
4. Le bouton de réinitialisation (`resetZoom` / `canReset`) revient à la vue COMPLÈTE,
   pas au zoom initial (convention habituelle). Le documenter.
5. Le premier affichage zoomé doit recadrer l'axe des valeurs (`fitOnZoom` du prompt 2).
   Le vérifier.
6. Docs :
   - docstrings de `Chart`, `MultiChart` et `useBrushZoom` ;
   - `docs/content/features/chart.mdx` : section « Zoom initial », avec les formes de
     spec, l'amorçage asynchrone, le réamorçage au changement de domaine et la
     réinitialisation ;
   - exemple de registry `registry/examples/chart-default-zoom.jsx` (courbe en x date,
     `defaultZoom={{ x: { last: 5 } }}`). Puis `npm run build:registry` ;
   - CHANGELOG : Added (`defaultZoom`) et Fixed (sélection périmée après un changement de
     données) ;
   - `npm run build:props -- --strict`.
7. Tests :
   - Vitest `resolveZoomSpec` : dates (Date et ISO), nombres, catégories, `last` /
     `first`, n ≥ nombre de valeurs, n = 1 en continu, bornes hors domaine, forme
     invalide.
   - Vitest `Chart` :
     - avec `defaultZoom={{ x: { last: 5 } }}`, seules les 5 dernières abscisses sont
       tracées ;
     - `data=[]` puis des données complètes → le zoom s'applique ;
     - nouvelle identité de `data` avec le même domaine → la sélection est gardée ;
     - domaine changé → le zoom initial est réappliqué ;
     - `resetZoom` → vue complète.
   - Vitest `MultiChart` : la même chose en x.
   - Puis `npm run lint`, `npm run test` et `npm run verify`.
```
