# POST-TEMPLATIZATION — Prompts de mise en œuvre

Suite de [TEMPLATIZATION_PROMPTS.md](./TEMPLATIZATION_PROMPTS.md) et
[LANGUAGE_SWITCHER_PROMPTS.md](./LANGUAGE_SWITCHER_PROMPTS.md). Bilan, ordre et décisions :
[POST_TEMPLATIZATION_ARCHITECTURE.md](./POST_TEMPLATIZATION_ARCHITECTURE.md).

Les prompts **F1 à F7** (migration vers l'API 0.3.0) restent ceux de
`../dashboard-template-api/prompts-integration.md` ; ils ne sont pas recopiés ici. Ce
fichier ajoute ce qui les entoure : **G0 à G3** avant, **API-0** et **API-1** entre, **F8**
après, **T1** à la fin. **R1 à R8** (remédiation de la recette G0) s'intercalent entre G0 et
G1 : ils corrigent les constats `C1` à `C26` de [RECETTE_G0.md](./RECETTE_G0.md).

Un prompt = une session, un commit, un périmètre vérifiable. Ne pas committer sans relecture.

**Convention commune** — à coller en tête de chaque session :

> Respecte `CLAUDE.md` : docstrings Google en anglais, commentaires inline en français et
> détaillés, composants en `const Name = (props) => {}` + `export default` en fin de
> fichier, pas de `useMemo`/`useCallback` de performance (React Compiler actif), tokens CSS
> jamais de `px` en dur, couleurs en `hsl(var(--token))`, formatage via `d3LocaleFor` /
> `intlLocaleFor`, jamais `'fr-FR'` en dur.

| Prompt | Dépôt | Modèle | Effort | Plan | Dépend de |
|---|---|---|---|---|---|
| G0 Recette de la vitrine et de l'eject | front | Sonnet | high | non | — |
| R1 Diagnostic du panic Turbopack (C1) | front | Sonnet | high | non | G0 |
| R2 Thème sombre de la démo et contrastes (C2, C10, C11) | front | Sonnet | high | **oui** | R1 |
| R3 Hydratation du thème des aperçus (C4) | front | Sonnet | high | **oui** | R1 |
| R4 Démo : accueil, navigation, filtre (C8, C9, C19, C20, C24) | front | Sonnet | medium | non | R1 |
| R5 Responsive 375 px (C6, C7) | front | Sonnet | medium | non | R1 |
| R6 Sélecteur de langue : repli de drapeau et finitions (C5, C17, C18, C26) | front | Sonnet | medium | non | R1 |
| R7 Eject, CI et reliquats (C3, C12, C14, C15, C16) | front | Sonnet | high | non | G0 |
| R8 Stabilisation de la chaîne e2e (C13, C26) | front | Sonnet | medium | non | R2 à R7 |
| G1 Reliquats i18n et lint | front | Sonnet | medium | non | G0 |
| G2 Hygiène documentaire et fusion | front | Sonnet | medium | non | G0, R8 |
| G3 Guide « Partir du template » | front | Sonnet | medium | non | G0, R7 |
| API-0 Fusion et tag v0.3.0 | API | humain + Sonnet | low | non | A1 à A13 |
| F1 → F6 | front | cf. `prompts-integration.md` | cf. idem | cf. idem | API-0 |
| F8 Docs, registry, version 0.x | front | Sonnet | medium | non | F6 |
| API-1 Tag v0.4.0 | API | humain | — | non | A14, A15 |
| F7 | front | cf. `prompts-integration.md` | cf. idem | oui | API-1, F6 |
| T1 Conversion TypeScript | front | Opus | xhigh | **oui** | F8 (et F7 si fait) |

**Niveau d'effort et mode plan — règle retenue pour tous les prompts qui suivent G0.**
L'effort (`/effort`) se règle sur la difficulté de **diagnostic**, pas sur la taille du diff :
`medium` quand le périmètre est énuméré et vérifiable par une commande ; `high` quand il faut
chercher une cause (hydratation, panic, eject) ou arbitrer entre plusieurs corrections ;
`xhigh` seulement pour T1 (refonte transversale, Opus). Le mode plan n'est préférable que
lorsqu'un changement touche un **état partagé par beaucoup de consommateurs** — les jetons de
couleur et les primitives (R2), le fournisseur de thème (R3), les signatures de T1 — : le
plan permet alors de relire la liste des fichiers et des captures impactés avant d'écrire.
Partout ailleurs le périmètre est déjà énuméré dans le prompt et le plan coûterait un tour
sans rien apporter : **plan non**. Pour F1 à F7 et API-0/API-1, la valeur de la colonne
« Plan » reste celle de `prompts-integration.md`.

---

## G0 — Recette de la vitrine et de l'eject

**Modèle : Sonnet.** Exécution de chaînes existantes et compte rendu. **Plan : non.**
Le prompt demande de **rendre compte sans rien corriger** : les corrections sont décidées
après lecture du rapport.

```text
Contexte : la templatisation est terminée côté code (npm run verify et npm run build sont
verts) mais le site de documentation n'a jamais été parcouru. Objectif : un rapport de
recette, sans modifier de fichier du dépôt.

Étape 1 — Chaîne automatisée. npm run verify, puis npx playwright install si nécessaire,
puis npm run test:e2e. Pour tout échec, indique s'il précède ce chantier (git stash n'est
pas nécessaire : lis simplement le test et le code concerné). Les captures visuelles en
échec sont à joindre au rapport, pas à régénérer.

Étape 2 — Parcours de la vitrine. Sonde d'abord le port 3000 (un serveur peut tourner),
sinon npm run dev. Avec le navigateur Playwright, visite chaque page de la section
« Composants » et « Features » de la doc, et pour chacune : le playground réagit à ses
contrôles (au moins un contrôle par type : select, switch, nombre, texte), le code généré
change en conséquence, le bouton de copie fonctionne, les deux thèmes sont lisibles, la
largeur 375 px ne produit pas de défilement horizontal de la page, la console est sans
erreur ni avertissement d'hydratation. Parcours aussi /demo/fr et /demo/en : navigation
(barre haute ET barre latérale selon la profondeur), recherche, bascule de thème,
sélecteur de langue (reste sur la même page, <html lang> suit), un indicateur avec filtre,
graphique et tableau.

Étape 3 — Contrôle du sélecteur de langue (P9 de LANGUAGE_SWITCHER_PROMPTS.md, points 1 à
10 du tableau et contrôle du repli de drapeau avec flagcdn.com bloqué).

Étape 4 — Eject en conditions réelles. Dans une COPIE du dépôt hors de ce répertoire
(git clone local, pas le répertoire de travail) : node scripts/eject.js --yes, puis
npm install, npm run lint, npm run build, npm run dev et ouverture de /fr. Même chose avec
--keep-docs (la doc doit répondre sous /docs). Relève : ce qui reste de la vitrine
(grep -ri "playground\|registry\|docs/" hors node_modules), la place du README produit,
les fichiers de la racine devenus orphelins (TEMPLATIZATION_*, LANGUAGE_SWITCHER_*, TODO,
POST_TEMPLATIZATION_*, design-system/, assets/).

Livrable : un tableau « constat | gravité (bloquant / gênant / cosmétique) | page ou
fichier | capture ou extrait », trié par gravité, et la liste explicite de ce que tu n'as
pas pu vérifier. Aucune modification de code.
```

Le rapport de G0 est dans [RECETTE_G0.md](./RECETTE_G0.md) (constats `C1` à `C26`, pistes de
correction, résultats e2e, liste de ce qui n'a pas été vérifié).

---

## R1 à R8 — Remédiation de la recette G0

Un prompt par famille de constats de [RECETTE_G0.md](./RECETTE_G0.md). **Ordre** : R1 d'abord
(sans serveur de dev fiable, ni la recette ni les captures ne sont rejouables), puis R2 à R7
dans l'ordre qui vous convient (R2 et R3 touchent le rendu : les lancer avant R5/R6 évite de
régénérer deux fois les mêmes captures), R8 en dernier.

**Règles communes aux huit prompts** (à coller après la convention commune) :

> - Les identifiants `Cn` renvoient à `RECETTE_G0.md` : relis le constat **et** sa « piste »
>   avant d'agir, mais vérifie la cause par une mesure ; une piste n'est pas une preuve.
> - Reproduis le défaut **avant** de le corriger (commande ou test qui échoue), puis montre
>   le même contrôle qui passe. Pour tout correctif visuel, mesure (`getComputedStyle`,
>   `getBoundingClientRect`, `scrollWidth`) plutôt que d'affirmer « ça a l'air bon ».
> - Un seul serveur `npm run dev` à la fois par dossier (verrou `.next/`) ; sonde d'abord
>   les ports 3000 et 3100. Si le panic de R1 est encore présent, travaille dans un clone sans
>   espace dans le chemin et dis-le.
> - Ne régénère **aucune** capture Playwright sans lister avant/après les images concernées et
>   la raison ; ne touche pas à `CHANGELOG.md` (c'est G2).
> - Chaque correctif de comportement reçoit un test (vitest ou Playwright) qui échouerait sans
>   lui. `npm run verify` doit rester vert ; ne commite pas, propose le message.

### R1 — Diagnostic du panic Turbopack (C1)

**Modèle : Sonnet. Effort : high. Plan : non.** Enquête à hypothèses : rendre compte avant de
corriger, ne changer le dépôt que si la cause est démontrée.

```text
Contexte : dans ce dépôt (chemin « C:\Users\bolli\Documents\COD Code\… », avec un espace),
`npm run dev` panique dès qu'un navigateur se connecte au HMR :
« Failed to write app endpoint /(site)/demo/[locale]/[[...slug]]/page — Next.js package not
found », en boucle, avec rechargement de page ; ou, selon le démarrage, 404 sur toutes les
routes. Un clone intact à chemin court (C:\dt) et deux copies éjectées ne le reproduisent
jamais. Voir C1 dans RECETTE_G0.md. Ce panic fait expirer la plupart des tests Playwright.

À faire :
1) Reproduire : lancer `npm run dev` ici, ouvrir /composants/tabs et /demo/fr dans le
   navigateur Playwright, compter les occurrences de « FATAL » dans la sortie du serveur.
2) Isoler la cause par bissection, UN facteur à la fois, en consignant chaque essai (condition,
   nombre de FATAL, verdict) dans un tableau :
   a) supprimer .next/ (le dossier mélange `next build` et `next dev`) ;
   b) fixer `turbopack: { root: __dirname }` dans next.config.ts (racine mal inférée) ;
   c) même commit dans un chemin AVEC espace (ex. C:\tmp espace\dt) et SANS (C:\dt) — `npm ci`
      dans les deux ;
   d) `npx next dev --webpack` ;
   e) la version de Next déjà installée (16.2.9) contre le dernier patch publié.
   Revenir à l'état initial entre deux essais (git status propre hors artefacts ignorés).
3) Quand la cause est démontrée : appliquer le plus petit correctif (réglage de config, ou
   consigne documentée si la cause est le chemin ou Next lui-même). Si le panic est
   détectable, faire échouer e2e/global-setup.ts avec un message explicite (« le serveur de dev
   a paniqué : voir CONTRIBUTING.md#dépannage ») au lieu de laisser 30 tests expirer.
4) Ajouter une section « Dépannage » à CONTRIBUTING.md et une ligne à
   docs/content/introduction/installation.mdx (chemins très longs sous Windows : C25 ; chemin
   à espace ; suppression de .next/).
5) Rejouer `npm run test:e2e` ici et classer chaque échec restant : C13 (captures du header),
   C26, effet de C4/C2, ou nouveau. Ne corrige pas ces échecs dans ce prompt.

Livrable : le tableau d'essais, la cause (ou « non démontrée » avec les hypothèses restantes),
le correctif, le résultat e2e classé. Vérification : npm run verify. Ne commite pas ; propose :
fix: make the dev server start reliably and document the Windows path pitfalls
```

### R2 — Thème sombre de la démo et contrastes (C2, C10, C11)

**Modèle : Sonnet. Effort : high. Plan : oui.** Un jeton de la palette sombre et le `body`
touchent des centaines de sélecteurs et la plupart des captures : le plan doit lister fichiers
et captures impactés avant la première écriture.

```text
Contexte : en thème sombre, la démo affiche un fond de page blanc, un titre h1 blanc sur blanc
et des titres d'axe de graphique noirs sur carte sombre (C2) ; --color-text-tertiary sombre
(= --color-gray-400, rgb(104,114,130)) donne 3,65 à 3,91:1 sur tout le site de doc et dans
les composants (C10) ; quatre couleurs claires sont sous le seuil AA (C11).

À faire :
1) C2 : poser le fond et la couleur de texte globaux dans src/app/globals.scss
   (`body { background-color: hsl(var(--color-background)); color:
   hsl(var(--color-text-primary)); }` — tokens existants, aucun px), puis retirer les
   doublons devenus inutiles (DocsShell.scss, AboutPage.scss) SANS changer leur rendu. Vérifier
   qu'aucun écran de (site) ni de (docs) ne perd son fond (not-found, page de négociation
   /demo).
2) C2 : corriger le titre d'axe du graphique : le texte rendu n'est pas ciblé par
   `.visx-axis-left .chart-axis-label` (ChartAxisLeft.scss:23), son fill calculé est noir.
   Trouver le vrai sélecteur (axes gauche ET bas), appliquer le jeton --chart-axis-color
   avec l'opacité existante, dans les deux thèmes.
3) C10 : éclaircir --color-gray-400 dans le bloc sombre de
   src/styles/globals/primitives/colors.scss (≈ ligne 103) jusqu'à ≥ 4,5:1 sur le fond sombre
   (calcule le ratio, ne l'estime pas) ; resynchroniser encoding.js — `npm run check:palette`
   doit rester vert — et vérifier que --color-text-tertiary reste distinct de
   --color-text-secondary.
4) C11 : badge positif de StatCard (texte ≥ 4,5:1 sur son fond en clair), `.props-table__required`,
   et les classes de coloration `hl-c` et `hl-n` (src/utils/highlight et la feuille qui les
   définit) ; vérifier que le sombre reste conforme.
5) Test : un test Playwright (e2e/a11y-contrast.spec.ts) qui, pour /demo/fr/comptabilite-nationale/
   france/pib et trois pages de doc, dans les DEUX thèmes, calcule le contraste de chaque nœud
   texte visible (couleur composée sur le premier fond opaque ancêtre) et échoue sous 4,5:1
   (3:1 pour le gros texte), avec une liste blanche explicite et commentée (skip-link hors écran,
   texte désactivé, éléments sur <canvas>/<image>).
6) Captures : lister les captures visuelles que les changements modifient ; ne les régénérer
   qu'une fois la liste validée, et seulement celles-là.

Vérification : npm run verify, puis npx playwright test e2e/a11y-contrast.spec.ts. Ne commite
pas ; propose : fix: apply the page background in dark mode and meet AA contrast
```

### R3 — Hydratation du thème des aperçus (C4)

**Modèle : Sonnet. Effort : high. Plan : oui.** `ThemeProvider` est lu par une grande partie
de l'application et la solution naïve (`useState` + `useEffect` de recopie) est explicitement
interdite par le commentaire de `PreviewFrame` : le plan doit trancher le mécanisme avant le code.

```text
Contexte : avec localStorage.theme = "dark", toute page à ComponentPlayground ou
ComponentPreview déclenche « A tree hydrated but some attributes of the server rendered HTML
didn't match » (data-theme, aria-pressed, title, aria-label du bouton de PreviewFrame) ; le
DOM reste en `light` et le PREMIER clic sur le bouton de thème de l'aperçu ne fait rien (C4).
Cause probable : PreviewFrame.jsx lit useTheme() ; ThemeProvider expose la valeur mémorisée dès
le premier rendu client, alors que le serveur rend `light`.

À faire :
1) Reproduire par un test Playwright (e2e/theme-hydration.spec.ts) : addInitScript posant
   localStorage.theme = "dark", chargement de /composants/tabs, attente de l'hydratation ;
   assertions : aucune console.error d'hydratation ; data-theme de chaque .doc-preview-frame
   cohérent avec aria-pressed et aria-label ; UN SEUL clic sur le bouton de l'aperçu inverse
   data-theme. Le test doit échouer avant le correctif.
2) Concevoir le correctif, en plan : le fournisseur doit rendre côté client, à l'hydratation,
   la MÊME valeur que le serveur, puis adopter la valeur mémorisée sans état dupliqué ni
   useEffect de recopie (CLAUDE.md : le React Compiler est actif). Piste : useSyncExternalStore
   avec getServerSnapshot ; ou lecture de data-theme de <html> (posé avant le premier paint
   par le script d'amorçage de src/app/layout.tsx). Évaluer l'effet sur les autres lecteurs de
   useTheme (ThemeToggleButton, Chart, Globe…) et sur le script d'amorçage ; écarter
   explicitement suppressHydrationWarning sauf justification écrite.
3) Appliquer, puis rejouer le test, les tests vitest du thème, et l'ensemble des pages à
   aperçu dans les deux thèmes (aucune erreur d'hydratation sur aucune page de docs/content/).
4) Étendre le test à toutes les pages de la section Composants et Features, thème sombre
   mémorisé, via docsRoutes() de e2e/helpers/routes.ts.

Vérification : npm run verify && npx playwright test e2e/theme-hydration.spec.ts. Ne commite
pas ; propose : fix: render the preview theme consistently across hydration
```

### R4 — Démo : accueil, navigation, filtre (C8, C9, C19, C20, C24)

**Modèle : Sonnet. Effort : medium. Plan : non.** C19 et C24 sont des **décisions de
conception** : le prompt les fait documenter et chiffrer, il ne les tranche pas.

```text
Contexte : voir C8, C9, C19, C20, C24 dans RECETTE_G0.md.

À faire :
1) C8 : réécrire config/content/home.json avec un contenu réaliste (titre, texte, cartes) dont
   chaque `link` pointe vers un nœud EXISTANT du manifeste, exprimé de façon relative à la
   langue (résolu par resolveNavigationTree / le préfixe de langue, pas de chemin absolu en
   dur). Ajouter une vérification (test vitest ou extension de scripts/validate-config.js) qui
   échoue si un lien de home.json n'existe pas dans config/site.config.json ; elle doit aussi
   passer sur le MINIMAL_SITE_CONFIG de scripts/eject.js. Faire en sorte que l'eject ne laisse
   pas de lien mort (réinitialiser home.json ou le rendre cohérent) — le détail du script est
   dans R7, ici seulement la donnée.
2) C9 : corriger isActivePath (src/features/header/…/useNavigation*) : égalité stricte pour la
   racine « Accueil », préfixe pour les groupes ; `aria-current="page"` uniquement sur la page
   courante, `aria-current="true"` (ou classe seule) sur un ancêtre. Vérifier la barre haute
   (TopbarItem, TopbarGroup, TopbarGroupItem) et la sidebar (SidebarItem). Tests vitest sur la
   fonction ; test e2e : sur chaque route de demoRoutes(), exactement UN [aria-current="page"].
3) C20 : dans le critère de filtre, ne pas désélectionner l'opération quand on reclique sur
   l'option déjà choisie ; faire ouvrir la liste par un clic dans le champ combobox
   (aujourd'hui seuls le chevron tabindex=-1 ou la frappe l'ouvrent). Tests du composant.
4) C19 et C24 : NE PAS modifier le comportement. Rédiger, à la fin de ta réponse, pour chacun
   deux options chiffrées (fichiers touchés, risque) et une recommandation :
   C19 — les cartes KPI doivent-elles refléter le filtre ?
   C24 — la disposition topbar/sidebar doit-elle se déduire de la profondeur de l'arbre
   (comme le décrit CLAUDE.md) au lieu de navigation.type ? Dans ce cas, que devient le champ
   du schéma et de validate:config ?

Vérification : npm run verify. Ne commite pas ; propose :
fix: give the demo home real content and mark only the current page as current
```

### R5 — Responsive 375 px (C6, C7)

**Modèle : Sonnet. Effort : medium. Plan : non.**

```text
Contexte : à 375 px de large (viewport Playwright 375×800), la page défile horizontalement sur
/features/chart (403 px), /features/filter (401 px), /features/header (719 px) — C6 — et sur
les pages indicateur de la démo (597 px ; le header de recherche suit la largeur du contenu) — C7.

À faire :
1) Écrire d'abord e2e/responsive.spec.ts : pour chaque route de docsRoutes() ET demoRoutes()
   (les deux langues), viewport 375×800, vérifier
   document.documentElement.scrollWidth <= document.documentElement.clientWidth. Il doit
   échouer sur les routes citées et sur elles seules ; en cas d'autre échec, l'ajouter au
   rapport sans le masquer.
2) C6 : permettre le retour à la ligne des groupes de contrôles du playground (.ctrl-group,
   .tp-ctrl-btn) ; borner l'aperçu du Header (cadre avec overflow-x: auto, jamais la page) ;
   corriger la rangée .docs-sidebar__section de la doc à 375 px.
3) C7 : trouver, par mesure (liste des éléments dont getBoundingClientRect().right dépasse la
   largeur), l'enfant d'IndicatorExplorer qui force 597 px (tableau, graphique, barre d'outils) ;
   lui donner min-width: 0 / overflow-x: auto à son niveau, sans élargir le header. Respecter
   les mixins de src/styles/utils/breakpoints.scss et les jetons de typography.scss (pas de px).
4) Vérifier aussi 320 px et 768 px sur les routes corrigées (pas de régression), et le mode
   sidebar ouverte sur mobile.

Vérification : npm run verify && npx playwright test e2e/responsive.spec.ts. Ne commite pas ;
propose : fix: stop pages from scrolling horizontally on narrow viewports
```

### R6 — Sélecteur de langue : repli de drapeau et finitions (C5, C17, C18, C26)

**Modèle : Sonnet. Effort : medium. Plan : non.**

```text
Contexte : quand flagcdn.com est injoignable, la pastille affiche l'icône d'image cassée de
Chromium au lieu du code pays (C5) ; deux contrôles de playground ne se reflètent pas dans le
code généré (C17) ; le menu aligné à droite se détache du bouton et le cadre d'aperçu est plus
court que le menu (C18) ; l'exemple « Drapeaux auto-hébergés » demande /flags/<iso2>.svg qui
n'existent pas : 404 à chaque chargement de /composants/language-switcher, qui fait échouer le test
de fumée (C26).

À faire :
1) C5 : écrire d'abord e2e/language-switcher.spec.ts qui abandonne `**/flagcdn.com/**`
   (route.abort), ouvre /composants/language-switcher et la démo, et vérifie, pour le bouton ET
   toutes les options : le texte de repli est visible (non masqué par l'image), l'image
   n'est pas rendue ou est cachée (naturalWidth === 0 ⇒ pas peinte), aucun décalage de mise en
   page (comparer getBoundingClientRect avec et sans blocage). Corriger FlagChip : l'image reste
   invisible jusqu'à `onLoad`, ou est retirée sur `onError` — état local minimal, et dire dans
   un commentaire pourquoi l'hypothèse « alt vide = non peint » était fausse. Mettre à jour
   docs/content/composants/language-switcher.mdx (la section « Drapeaux » promet un repli en
   CSS pur) et le commentaire de tête de FlagChip.scss.
2) C18 : menuAlign="right" doit coller le menu au bord droit du BOUTON (section en
   `inline-block`/`position: relative` autour du bouton, pas du conteneur) ; vérifier dans le
   header de la démo (où le composant est à droite) que le menu ne sort pas de l'écran à
   375 px ; donner au cadre d'aperçu du playground une hauteur minimale qui contient le menu
   ouvert (ou un cadre scrollable dédié) pour supprimer la double barre de défilement.
3) C17 : faire refléter « Nombre de langues » dans le code généré
   (`languages={[…]}` quand ≠ défaut) et lever la borne à 8 si le composant l'accepte, sinon
   renommer le contrôle ; dans docs/playgrounds/tabs.jsx, ajouter les icônes au code généré
   quand « Icônes » est actif. Le test docs existant sur la cohérence code/aperçu doit les couvrir.
4) C26 : fournir les fichiers référencés par registry/examples/language-switcher-local-flags.jsx
   (SVG des pays utilisés sous public/flags/, ajoutés à l'item de registry correspondant et au
   --help/à la doc) ou changer l'exemple ; le test de fumée de cette page doit passer sans
   reprise.
5) Firefox et WebKit : lancer le test de l'étape 1 une fois avec
   `npx playwright test e2e/language-switcher.spec.ts --project=…` si les navigateurs sont
   installables ; sinon le dire explicitement.

Vérification : npm run verify && npx playwright test e2e/language-switcher.spec.ts. Ne commite
pas ; propose : fix: show the country code when a flag image fails to load
```

### R7 — Eject, CI et reliquats (C3, C12, C14, C15, C16)

**Modèle : Sonnet. Effort : high. Plan : non.** Le script remplace des chaînes exactes :
chaque changement se vérifie par un eject réel dans un clone, pas par lecture.

```text
Contexte : scripts/eject.js échoue sur un clone Windows par défaut (fichiers en CRLF, C3) et
s'arrête APRÈS avoir déplacé src/app/(site)/demo/ ; le job `eject` de verify.yml survit à
l'éjection et fait échouer la CI du dépôt éjecté (C12) ; --keep-docs conserve CHANGELOG.md et
CONTRIBUTING.md du template (C14) ; POST_TEMPLATIZATION_*, RECETTE_G0.md, assets/ et des
entrées de .gitignore subsistent (C15) ; une trentaine de commentaires citent encore la
vitrine (C16). Voir RECETTE_G0.md.

À faire :
1) C3 : ajouter un .gitattributes (`* text=auto eol=lf`, binaires explicites) ; rendre
   patch(), patchJson() et les remplacements du script insensibles aux fins de ligne
   (normaliser en LF pour comparer, restituer l'EOL d'origine à l'écriture) ; faire un contrôle
   PRÉALABLE de tous les motifs (même logique que --dry-run) avant la première opération pour
   qu'un échec laisse l'arbre intact ; message d'erreur qui nomme le CRLF s'il en détecte.
2) Test réel : cloner deux fois (`git clone -c core.autocrlf=true` et `…=false`) dans un
   chemin court hors du dépôt, lancer `node scripts/eject.js --yes` puis `--keep-docs --yes`
   (une copie chacun) ; les quatre combinaisons doivent passer, suivies de npm install, lint,
   build. Consigner les sorties.
3) C12 : faire patcher .github/workflows/verify.yml par l'eject (retrait du job `eject`, motif
   exact attendu) et remplacer, dans ce workflow, la liste d'étapes par `npm run verify`
   (+ `npm run build`) ; vérifier que le job eject du dépôt du template reste vert.
4) C14/C15 : l'eject (les deux modes) supprime CHANGELOG.md et CONTRIBUTING.md du template
   (en mode --keep-docs, les remplace par un CHANGELOG.md d'une ligne et aucun CONTRIBUTING),
   POST_TEMPLATIZATION_*, RECETTE_G0.md, TEMPLATIZATION_*/LANGUAGE_SWITCHER_* s'ils existent
   (cas d'une copie locale), et assets/ après avoir VÉRIFIÉ par grep qu'il n'est référencé par
   rien ; nettoyer les entrées de .gitignore devenues sans objet ; ajouter chaque suppression à
   la sortie de --dry-run. Si G2 a déplacé ces fichiers dans docs-internal/, supprimer ce
   dossier à la place.
5) C16 : lister (grep -rniE "registry|playground|docs/|features/docs" dans un clone éjecté) les
   commentaires et docstrings qui citent la vitrine ; soit les reformuler dans le dépôt source
   pour qu'ils restent vrais dans les deux mondes, soit ajouter à l'eject une étape de
   réécriture ciblée. Ne PAS tenter une réécriture générique par expression régulière.
6) C8 (côté script) : vérifier que le site éjecté n'a plus de lien mort (home.json, cf. R4).

Vérification : le test réel de l'étape 2 (consigner les commandes et sorties), puis
npm run verify ici. Ne commite pas ; propose :
fix: make the eject script robust to line endings and leave a clean repository
```

### R8 — Stabilisation de la chaîne e2e (C13, C26)

**Modèle : Sonnet. Effort : medium. Plan : non.** À lancer après R2 à R7 : ils modifient le
rendu et les tests.

```text
Contexte : la suite Playwright (88 tests) a donné 30 échecs et 8 flaky dans le dépôt, presque
tous imputables au panic de R1 ; sur un clone sain elle donne 85 réussis, 2 échecs, 1 flaky
(5 min, 1 worker) : captures périmées de « Header — sidebar » (titre « Mon Site » attendu,
« Dashboard Template » rendu, badge « 1 Issue » de l'overlay Next — C13) et 404 de
/flags/*.svg sur /composants/language-switcher (C26, normalement corrigé par R6).

À faire :
1) Rejouer `npm run test:e2e` (workers: 2 comme configuré) sur un serveur fiable (après R1) et
   classer les échecs restants dans un tableau : test | cause | précède le chantier ? | action.
2) C13 : pour visual › Header — sidebar (clair et sombre), regarder l'image de différence,
   identifier l'origine du badge « 1 Issue » (lire le contenu de l'overlay Next) et décider :
   masquer l'indicateur de développement dans les captures (`devIndicators: false` quand
   `PLAYWRIGHT` est posé, ou option `mask`), puis régénérer SEULEMENT ces deux captures en le
   disant.
3) Pour chaque capture que R2, R3, R5, R6 ont modifiée : produire la liste avant/après, la faire
   valider, puis régénérer uniquement celles-là (`npx playwright test --update-snapshots <fichier>`
   fichier par fichier, jamais la suite entière).
4) Supprimer les causes de flakiness restantes sans augmenter les délais à l'aveugle (attente
   d'un état observable plutôt que waitForTimeout) ; documenter dans le commentaire de tête de
   playwright.config.ts le nombre de reprises effectivement nécessaires.
5) Ajouter à la CI (verify.yml) un job e2e sur Chromium si ce n'est pas déjà fait, avec
   `workers: 1` et la conservation des rapports en artefact.

Vérification : deux exécutions complètes consécutives de `npm run test:e2e`, toutes vertes sans
reprise (une reprise = un test à corriger). Ne commite pas ; propose :
test: stabilise the e2e suite and refresh the snapshots changed by the recette fixes
```

---

## G1 — Reliquats i18n et lint

**Modèle : Sonnet.** Périmètre énuméré. **Plan : non.**

```text
Contexte : npm run lint remonte 10 avertissements et quatre libellés français restent en
dur hors du site de documentation.

À faire :
1) Externaliser, par le mécanisme existant (props `labels` + src/i18n/dictionaries/, jamais
   d'import de src/i18n/ depuis un composant — cf. CLAUDE.md) :
   - src/app/not-found.jsx:54 (aria-label « Points d'entrée du site »)
   - src/features/table/components/TableFilterPopover/TableFilterPopover.jsx:69
     (« Effacer la recherche ») — DEFAULT_LABELS + mergeLabels, comme les autres composants
   - src/components/filter/SelectMenu/SelectMenu.jsx:19 et
     src/features/header/components/Header/Header.jsx:64 : vérifier que le défaut français
     n'est qu'un DEFAULT_LABELS surchargé par le dictionnaire ; sinon corriger.
   not-found.jsx est hors de la route [locale] : décider (et documenter en commentaire)
   comment il choisit sa langue (negotiateLocale sur l'en-tête, ou langue par défaut).
2) Ajouter les clés fr ET en ; npm run check:i18n -- --strict doit rester vert.
3) Supprimer MONTHS_FR / DAYS_FR de CalendarMonth.jsx s'ils sont réellement morts, après
   avoir vérifié que les noms de mois et de jours viennent bien d'Intl via intlLocaleFor.
4) Avertissements restants : supprimer le code mort (setFocusedIndex dans SidebarSwitcher,
   isUsingKeyboard dans a11y.js, `hovered` dans HeatmapMarks, `event` inutilisés) — mais
   vérifie chaque cas : un état inutilisé peut cacher une fonctionnalité à moitié câblée
   (le bouton de bascule du Header est déjà connu pour ça) ; si c'est le cas, signale-le au
   lieu de supprimer. Le <img> de FlagChip reste : ajoute un eslint-disable-next-line avec
   le motif (décision D4, repli CSS d'une image absente).
5) Test : étendre e2e/i18n.spec.ts ou un test vitest pour qu'aucun aria-label littéral
   français ne réapparaisse hors src/features/docs/ (grep dans un test, liste blanche
   explicite).

Vérification : npm run verify. Ne commite pas ; propose :
fix: externalise remaining French labels and remove dead code flagged by lint
```

---

## G2 — Hygiène documentaire et fusion dans `main`

**Modèle : Sonnet.** **Plan : non.** À lancer après avoir tranché les décisions 1 à 3 de
`POST_TEMPLATIZATION_ARCHITECTURE.md` §4.

```text
À faire :
1) CLAUDE.md référence ./DESIGN_SYSTEM.md qui n'existe pas à la racine. Soit tu le
   recrées en une page de pointeurs vers docs/content/fondations/*.mdx (préférable : source
   unique, pas de copie), soit tu corriges le lien de CLAUDE.md. Vérifie aussi les autres
   liens relatifs de CLAUDE.md, README.md et CONTRIBUTING.md (script jetable, pas de dépendance).
2) Réécrire le fichier TODO : retirer les items faits (templating, composant de langue,
   script de nettoyage), conserver « Convertir en TypeScript » (→ T1), ajouter la liste
   F1 à F8 et la dette de dark-mode (décision 2) avec la conclusion retenue.
3) Selon la décision 3 : déplacer TEMPLATIZATION_*, LANGUAGE_SWITCHER_*, POST_TEMPLATIZATION_*
   dans docs-internal/, les retirer du .gitignore, mettre à jour les liens croisés. Vérifie
   que scripts/eject.js supprime docs-internal/ (ajoute l'étape avec son contrôle de chaîne
   attendue) et que le job CI `eject` reste vert.
4) CHANGELOG.md : consigner dans [Unreleased] le language switcher, la recherche, l'eject ;
   Version : le projet reste en 0.x. package.json est à 1.0.0 (tag v1.0.0) : proposer de le ramener à 0.1.0 (entrée 1.0.0 du CHANGELOG réécrite en 0.1.0) et donner à l'utilisateur les commandes pour supprimer le tag local et distant ; ne pas les exécuter.
5) Ne fusionne rien : prépare la PR qb-templatization → main avec une description par lot
   (0 à 5 + language switcher) tirée des messages de commit.

Vérification : npm run verify && npm run build. Ne commite pas ; propose :
docs: align project docs and changelog with the shipped templatization
```

---

## G3 — Guide « Partir du template »

**Modèle : Sonnet.** **Plan : non.** Dépend du rapport G0 (étape 4).

```text
Contexte : l'eject est documenté en 25 lignes dans introduction/installation.mdx. Un
développeur tiers qui vient de cloner le dépôt a besoin d'une page qui répond à « qu'est-ce
que je garde, qu'est-ce qui disparaît, comment je reviens en arrière ».

À faire : créer docs/content/guides/partir-du-template.mdx (enregistrée dans la navigation
des guides, ajouter à l'index généré — npm run build:docs-index) avec :
- le choix des deux modes en un tableau (ce qui reste / ce qui disparaît, par dossier, tiré
  de la sortie réelle de `node scripts/eject.js --dry-run` et `--keep-docs --dry-run`, pas
  de mémoire) ;
- la procédure pas à pas : cloner, arbre propre, dry-run, eject, premier lancement, puis
  les trois gestes (manifeste, API, marque) avec liens ;
- ce qu'on ne peut pas défaire sans git (rappel : exige un arbre propre) ;
- « et si je veux juste un composant ? » → renvoi vers la CLI du registry, sans eject ;
- une checklist « avant de publier mon dashboard » (variables d'environnement, base path,
  langues, nettoyage du manifeste de démonstration).
Réduire la section correspondante d'installation.mdx à un lien vers ce guide.
Ajouter à scripts/eject.js son --help déjà existant en cohérence avec la page (une seule
description des modes, pas deux).

Vérification : npm run verify && npm run build. Ne commite pas ; propose :
docs: add a guide for starting a project from the template
```

---

## API-0 — Fusion de la branche API et tag v0.3.0

**Dépôt : `dashboard-template-api`.** Étape humaine guidée ; session courte.

```text
Contexte : les prompts A1 à A18 sont commités sur qb-schemav2-adaptation (HEAD a488629),
package.json est en 0.2.0, aucun tag v0.3.0. Les prompts F1 à F6 exigent un SDL épinglé.

À faire, sans commit ni push de ta part (tu proposes les commandes) :
1) npm ci && npm run lint && npm test && npm run schema:check && npm run codegen:check ;
   rapporte tout échec.
2) Jalon « Tag 0.3.0 » de prompts-integration.md : A11 présent, npm run schema:diff relu
   (liste les ruptures par rapport à v0.2.0), docs-site à jour. Vérifie que D1 (dépôt
   dashboard-template-database) a bien été exécuté, sinon le dire : la migration front en
   dépend pour les types physiques.
3) Vérifie que le workflow de release publie schema.graphql en asset (F1 le lit).
4) Propose : la séquence de merge, la version (0.3.0 ; breaking → release-please) et la
   note de release listant les ruptures de contrat, utilisable telle quelle par le front.
```

---

## F1 à F6 — Migration du front vers l'API 0.3.0

À lancer dans l'ordre **F1 → F2 → F3**, puis **F4, F5, F6** (F6 ne dépend que de F2),
depuis la branche `qb-api-0.3-adaptation` créée depuis `main` **après G2**. Prompts :
`../dashboard-template-api/prompts-integration.md`, §F1 à F6.

Précisions à ajouter en fin de chaque prompt F (le prompt d'origine ne les contient pas) :

```text
Complément : en plus de la vérification indiquée, lance npm run verify (le registry, les
tables de props et les tokens sont régénérés) et note, sans les corriger ici, toute page
de docs/content/ ou tout exemple de registry/examples/ devenu faux. Ces corrections sont
regroupées dans F8. Ne régénère pas les captures Playwright sans le dire.
```

Précisions par prompt :

- **F1** : le prompt demande que `check:gql` **échoue** à la fin. `npm run verify` sera donc
  rouge jusqu'à F2 : c'est attendu, à signaler dans le message de commit.
- **F2** : le plan doit lister aussi les consommateurs côté `docs/playgrounds/` et
  `registry/examples/` qui passent des opérations en minuscules ou des types PostgreSQL.
- **F3** : tester `toFilterNode` contre une paire de cas réels du `MultiCriterionMenu`
  (parenthèses imbriquées + connecteur `OR` en tête de groupe), pas seulement des cas écrits à la main.

---

## F8 — Documentation, registry et version 0.x

**Modèle : Sonnet.** **Plan : non.** Après F6.

```text
Contexte : F1 à F6 ont changé le contrat de données (métadonnées camelCase, familles de
types, opérations en majuscules, FilterNode, exports par l'API, formateur unique). Les
pages de documentation, exemples de registry, playgrounds et captures ont été laissés
tels quels et sont probablement faux.

À faire :
1) Relire docs/content/guides/api-graphql.mdx, features/filter.mdx, features/table.mdx,
   features/chart.mdx, introduction/structure-du-projet.mdx : corriger tout ce qui décrit
   l'ancien contrat (en-têtes X-Catalog-Id, operations.json par type SQL, getGroupedSelectOptions,
   extraits de requête Authorization). Ajouter une section « Épingler la version de l'API »
   (npm run sync:schema, API_SCHEMA_REF) et une section « Migrer depuis la version précédente ».
2) registry/examples/*-api.jsx et les playgrounds table/chart/filtre : aligner sur les
   nouvelles props (`fields`, `aggregate` si F7 est fait) ; npm run build:registry,
   npm run build:props -- --strict, npm run build:docs-index.
3) CHANGELOG.md : section [0.y.0] (mineure suivante) avec « Breaking » détaillé par prompt F, procédure de
   migration pour un tiers qui a copié le template (fichiers à reprendre : operations.json,
   filterTypes.js, documents, transports).
4) package.json → prochaine mineure 0.y.0 ; vérifier que le job CI `eject` et `docs.yml` restent verts.
5) Régénérer les captures Playwright UNIQUEMENT pour les pages modifiées volontairement ;
   joindre au résumé la liste des captures changées et pourquoi.

Vérification : npm run verify && npm run build && npm run test:e2e. Ne commite pas ; propose :
docs: align guides, registry examples and changelog with the 0.3.0 API contract
```

---

## API-1 — Tag v0.4.0, puis F7

A14 (`getAggregates`) et A15 (`compareFacts` agrégé) sont commités. Procéder comme API-0 pour
v0.4.0 (le critère : `npm run schema:diff` entre 0.3.0 et 0.4.0 relu), puis lancer **F7**
depuis `prompts-integration.md`. Ajouter à F7 le complément de F1-F6 et refaire F8 pour la
partie agrégats (une section de `chart.mdx` et un exemple de registry `chart-aggregated`).

---

## T1 — Conversion TypeScript

**Modèle : Opus. Plan : oui.** À faire quand le contrat de données ne bouge plus (après F8).
Utiliser la skill `js-to-ts-converter`. Un prompt par couche, dans cet ordre, chaque couche
dans son propre commit :

```text
Couche visée : <utils/ | i18n/ | hooks/ | lib/api/ | components/ | features/<x>/ | page-templates/>.

Règles :
- Les types de l'API viennent de la génération (graphql-codegen) à partir du SDL épinglé de
  F1, jamais écrits à la main ; ajoute un script `codegen` et un `codegen:check` à verify.
- Commentaires inline en français, docstrings Google en anglais (les @param alimentent
  docs/__props__.json : vérifier que build:props --strict reste vert, ou adapter
  scripts/build-props-doc.js pour lire les types TS ; documenter le choix).
- scripts/*.js restent en JS CommonJS (eject doit tourner avant npm install).
- tsconfig : activer `strict` pour la couche convertie uniquement (include/exclude), pas
  globalement d'un coup.
- Le registry distribue des sources : décider si les items publiés sont .tsx ou .jsx
  (recommandation : .tsx, avec les types dans l'item) et l'écrire dans CONTRIBUTING.md.
- scripts/eject.js remplace des chaînes exactes dans des fichiers qui changent
  d'extension : le job CI `eject` doit rester vert, c'est le test de non-régression.

Plan attendu avant écriture : liste des fichiers de la couche, ordre, risques, et les
chaînes de eject.js touchées.

Vérification : npm run lint && npx tsc --noEmit && npm run verify && npm run build.
```

Ordre des couches : `utils/` → `i18n/` → `hooks/` → `lib/api/` → `components/` →
`features/*` (une feature par commit, `chart` en dernier) → `page-templates/` → `src/app/`.
