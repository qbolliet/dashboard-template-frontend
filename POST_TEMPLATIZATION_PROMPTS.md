# POST-TEMPLATIZATION — Prompts de mise en œuvre

Suite de [TEMPLATIZATION_PROMPTS.md](./TEMPLATIZATION_PROMPTS.md) et
[LANGUAGE_SWITCHER_PROMPTS.md](./LANGUAGE_SWITCHER_PROMPTS.md). Bilan, ordre et décisions :
[POST_TEMPLATIZATION_ARCHITECTURE.md](./POST_TEMPLATIZATION_ARCHITECTURE.md).

Les prompts **F1 à F7** (migration vers l'API 0.3.0) restent ceux de
`../dashboard-template-api/prompts-integration.md` ; ils ne sont pas recopiés ici. Ce
fichier ajoute ce qui les entoure : **G0 à G3** avant, **API-0** et **API-1** entre, **F8**
après, **T1** à la fin.

Un prompt = une session, un commit, un périmètre vérifiable. Ne pas committer sans relecture.

**Convention commune** — à coller en tête de chaque session :

> Respecte `CLAUDE.md` : docstrings Google en anglais, commentaires inline en français et
> détaillés, composants en `const Name = (props) => {}` + `export default` en fin de
> fichier, pas de `useMemo`/`useCallback` de performance (React Compiler actif), tokens CSS
> jamais de `px` en dur, couleurs en `hsl(var(--token))`, formatage via `d3LocaleFor` /
> `intlLocaleFor`, jamais `'fr-FR'` en dur.

| Prompt | Dépôt | Modèle | Plan | Dépend de |
|---|---|---|---|---|
| G0 Recette de la vitrine et de l'eject | front | Sonnet | non | — |
| G1 Reliquats i18n et lint | front | Sonnet | non | G0 |
| G2 Hygiène documentaire et fusion | front | Sonnet | non | G0 |
| G3 Guide « Partir du template » | front | Sonnet | non | G0 |
| API-0 Fusion et tag v0.3.0 | API | humain + Sonnet | non | A1 à A13 |
| F1 → F6 | front | cf. `prompts-integration.md` | cf. idem | API-0 |
| F8 Docs, registry, version 0.x | front | Sonnet | non | F6 |
| API-1 Tag v0.4.0 | API | humain | non | A14, A15 |
| F7 | front | cf. `prompts-integration.md` | oui | API-1, F6 |
| T1 Conversion TypeScript | front | Opus | **oui** | F8 (et F7 si fait) |

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
