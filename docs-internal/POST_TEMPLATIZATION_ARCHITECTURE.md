# POST-TEMPLATIZATION — Bilan et feuille de route

Rédigé le 2026-10-16 sur la branche `qb-templatization` (HEAD `d880720`, arbre propre).
Prompts d'exécution associés : [POST_TEMPLATIZATION_PROMPTS.md](./POST_TEMPLATIZATION_PROMPTS.md).

**Légende des preuves** : **[E]** exécuté pendant ce bilan ; **[L]** lu dans le code ;
**[?]** non vérifié.

---

## 1. Verdict en une page

| Chantier | Statut | Preuve |
|---|---|---|
| `TEMPLATIZATION_*` (lots 0 à 5, 23 prompts) | **Exécuté**, avec reliquats mineurs | `npm run verify` vert : 28 fichiers / 379 tests, `check:palette`, `validate:config`, `check:gql`, `check:i18n --strict`, props (92 composants), tokens (969, 0 conflit) **[E]** ; `npm run build` OK, 58 pages statiques **[E]** |
| `LANGUAGE_SWITCHER_*` (P1 à P9) | **Exécuté** sauf la vérification visuelle P9 | Composants, hook, adaptateur `LocaleSwitcher` branché dans `/demo/[locale]/layout.jsx`, item de registry, playground, 5 exemples, page de doc, `e2e/i18n.spec.ts` **[L]** |
| `prompts-integration.md` section F (F1 à F7) | **Aucun exécuté** | pas de `sync:schema` dans `package.json`, `scripts/schema.graphql` toujours la copie manuelle, `check:gql` valide contre elle **[L]** |
| Prérequis API des prompts F | **Quasi tous livrés, mais non fusionnés ni taggés** | commits A1 à A18 présents sur `qb-schemav2-adaptation` ; aucun tag `v0.3.0` (dernier tag `v0.2.0`, `package.json` en 0.2.0) **[L]** |
| Script de nettoyage pour tiers (item du fichier `TODO`) | **Fait, `TODO` périmé** | `scripts/eject.js`, dry-run OK dans les deux modes (46 et 32 opérations), job CI `eject` qui l'exécute puis build la copie **[E][L]** |
| Vitrine « à la shadcn/ui » | **Construite, jamais regardée par un humain** | build vert ; Playwright (`smoke`, `visual`, `edge-cases`, `i18n`) **non relancé** dans ce bilan **[?]** |

Conclusion : la templatisation est terminée côté code. Ce qui reste est (a) la **recette
humaine** de la vitrine, (b) quelques **reliquats** de qualité, (c) la **migration vers le
contrat API 0.3.0** (F1 à F7), seul gros chantier, et (d) la **conversion TypeScript**, à
faire en dernier.

---

## 2. Détail par chantier

### 2.1 Templatisation

Tous les livrables de l'arborescence cible (§8 de `TEMPLATIZATION_ARCHITECTURE.md`)
existent **[L]** : `.github/workflows/{verify,docs}.yml`, `config/site.config.json` +
`config/schema/`, `docs/content` (30 pages, 6 sections), `docs/playgrounds` (14),
`registry/` (111 items, 59 exemples), les 5 générateurs, `scripts/mock-api-server.js`,
`src/lib/api/`, `src/config/pageTypes.js`, `src/page-templates/`, `.env.example`,
`CHANGELOG.md`, `CONTRIBUTING.md`. Les pages `/test-*` sont supprimées (`src/app/` ne
contient plus que `(docs)`, `(site)`, `not-found`). Aucun reste de `colors.scss` legacy
ni de `--color-primary` non défini : le bug `SkipLink` du `TODO` est **corrigé**
(`semantic-colors.scss:65-72`), de même que `--font-mono` (`typography.scss:24`).

Reliquats constatés :

1. **`DESIGN_SYSTEM.md` absent de la racine**, alors que `CLAUDE.md` le déclare
   « IMPORTANT » et que l'architecture demandait de le sortir du `.gitignore`. Le contenu
   vit désormais dans `docs/content/fondations/design-system.mdx` : le lien de `CLAUDE.md`
   est cassé **[L]**.
2. **Libellés français encore en dur hors du site de documentation** **[L]** :
   `src/app/not-found.jsx:54` (`aria-label`), `TableFilterPopover.jsx:69` (« Effacer la
   recherche »), `SelectMenu.jsx:19` (placeholder par défaut), `Header.jsx:64`
   (placeholder). Le `TODO` exigeait « aucun libellé ou aria- en dur ». Les composants de
   `src/features/docs/` sont aussi en français en dur : acceptable **si** on décide que la
   documentation est en français (décision actée : on la garde en français, traduction anglaise éventuelle plus tard ; cf. G1).
3. **Code mort / avertissements lint** (10 warnings, 0 erreur) **[E]** :
   `MONTHS_FR`/`DAYS_FR` inutilisés dans `CalendarMonth.jsx` (des constantes françaises
   mortes qui contredisent la règle `intlLocaleFor`), `setFocusedIndex` inutilisé dans
   `SidebarSwitcher`, `isUsingKeyboard` dans `a11y.js`, `hovered` dans `HeatmapMarks`,
   `<img>` du `FlagChip` (volontaire, D4 : à désactiver par un commentaire eslint motivé).
4. **Dette `[data-theme="dark"]`** : 21 fichiers portent encore un bloc sombre local
   (le `TODO` visait un remontage au niveau 1-2) **[L]**. Non bloquant, à arbitrer.
5. **Le fichier `TODO` est périmé** : « Faire le templating », « script de nettoyage » et
   « composant de langue » sont faits. À réécrire (G2).
6. **Trois documents d'architecture/prompts sont dans le `.gitignore`** (lignes 72 à 79 :
   `TEMPLATIZATION_*`, `LANGUAGE_SWITCHER_*`, `TODO`). Ils sont donc absents de l'historique
   git, ce qui explique qu'on ne puisse pas « retrouver » leur exécution par les commits.
   Les deux documents que vous lisez ne sont pas ignorés.

### 2.2 Language switcher

Correspondance prompt → code **[L]** :

| Prompt | Livré |
|---|---|
| P1 fondations | `LanguageSwitcher/_tokens.scss`, `_colors.scss`, `languages.js` |
| P2 à P4 | `FlagChip/`, `LanguageButton/`, `LanguageMenu/`, `LanguageOption/` (chacun avec `_tokens` et, sauf le menu, `_colors`) |
| P5 | `hooks/useLanguageMenu.js`, `LanguageSwitcher/LanguageSwitcher.jsx` |
| P6 | `LocaleSwitcher/LocaleSwitcher.jsx` injecté via `actions={<LocaleSwitcher />}` dans le layout de `/demo/[locale]` ; `site.localeCountries` dans la config i18n |
| P7 | items `language-switcher*` dans `registry.json` + 5 exemples + `language-switcher-basic` |
| P8 | `docs/playgrounds/language-switcher.jsx`, `docs/content/composants/language-switcher.mdx` |
| P9 | **Non démontré** : seule la partie automatisée l'est (verify vert) |

Ce que P9 demandait et qu'aucun artefact ne prouve : contrôle visuel dans les deux
thèmes (10 points), repli du drapeau avec `flagcdn.com` bloqué (décision D4), relecture de
conformité §5/§6. `e2e/i18n.spec.ts` (135 lignes) couvre une partie du parcours
clavier/route, **non relancé ici [?]**.

### 2.3 Intégration API (section F)

**Côté API** (`dashboard-template-api`, branche `qb-schemav2-adaptation`, 0.2.0) **[L]**,
d'après les titres de commits : A1 à A5 (validation, erreurs, rate limiting, ciblage par
arguments, agrégats NULL-safe), A6 (cache), A7 (sonde multi-réplicas), A8 (pool), A9
(motifs interdits), A10/A10.1/A10.3, A11 (`typeFamily`, `filterOperations`), A12
(troncature, POST), A13 (exports autodescriptifs), A14 (`getAggregates`), A15
(`compareFacts` agrégé), A16 (arrêt gracieux), A17/A18 (tests, docs). Le dépôt `database`
(prompt D1) n'a pas été regardé **[?]**.

**Côté front**, rien de F n'est fait. L'audit du 2026-09-26 reste exact : le front est à la
fois cassé contre l'API réelle (3 documents sur 4 invalides, en-têtes `X-Catalog-Id` qui
font échouer le preflight CORS) et **invisible à ses propres contrôles** (`check:gql` vert
sur une copie périmée du SDL). En mode mock tout fonctionne, ce qui masque le problème.

Deux manques dans les prompts F eux-mêmes (ils ne couvrent que `src/` et les tests) :

- **Documentation et registry** : `docs/content/guides/api-graphql.mdx`, les exemples
  `table-api`, `chart-api`, le playground `table`, `docs/__props__.json`, les captures
  Playwright et le `CHANGELOG` seront tous touchés. D'où le prompt F8 ci-dessous.
- **Version** : F2 est une rupture pour tout tiers qui a copié le template
  (`operations.json`, `filterTypes.js`, documents). Selon `CONTRIBUTING.md#versioning` c'est
  rupture de contrat ; le projet restant en 0.x, elle passe en version mineure (`0.y.0`), sans bump majeur.

### 2.4 Vitrine et nettoyage par un tiers

- **Vitrine** : deux surfaces dans un arbre App Router, documentation à la racine et
  application pilotée par manifeste sous `/demo`. La CI publie la doc sur Pages
  (`docs.yml`). Le build passe, mais **personne n'a encore parcouru le résultat** : c'est
  la première chose à faire (G0), parce que tout le reste suppose qu'elle est présentable.
- **Nettoyage** : `npm run eject` (défaut : supprime toute la surface de doc ; `--keep-docs` :
  la garde sous `/docs` avec un squelette). Garde-fous : arbre git propre exigé, échec
  bruyant si une chaîne attendue a disparu, `--dry-run`, job CI qui l'exécute dans une copie
  puis lint + build. Documenté dans `docs/content/introduction/installation.mdx`.
  Lacunes : pas de **guide dédié** listant ce qui est retiré/conservé et comment annuler,
  et `scripts/eject.js` ne mentionne aucun des fichiers de prompts/architecture ni le `TODO` de la racine (ils sont ignorés par git, donc absents d un clone, mais présents dans votre copie locale) ; son traitement du
  `README` est à vérifier en conditions réelles
  G0 étape 4).

---

## 3. Ordre recommandé

```
G0  Recette de la vitrine + de l'eject            (humain + Sonnet)   ← d'abord : tout le reste en dépend
 ├─ G1  Reliquats i18n et lint                    (Sonnet)  ┐ parallélisables
 └─ G2  Hygiène documentaire, fusion dans main    (Sonnet)  ┘
G3  Guide « Partir du template »                  (Sonnet)
──────────────────────────────── jalon : template 0.x (patch) publiable
API-0  Fusion qb-schemav2-adaptation + tag v0.3.0  (dépôt API, humain)
F1 → F2 → F3 ─┬─ F4
              ├─ F5  (F5 attend aussi A12, déjà livré)
              └─ F6  (dépend seulement de F2)
F8  Docs, registry, version 0.x (mineure)
──────────────────────────────── jalon : front branché sur l'API 0.3.0, template en 0.x
API-1  Tag v0.4.0 (A14/A15 déjà livrés)   →   F7
T1  Conversion TypeScript, par couches
```

Justifications :

1. **G0 avant tout** : si la vitrine a un défaut visible, il vaut mieux le savoir avant
   d'ajouter 7 prompts qui modifient `filterTypes.js`, `Table`, `Chart` et
   `IndicatorExplorer`.
2. **G1/G2/G3 avant F** : ils sont petits, indépendants du contrat API, et donnent un
   `main` propre et publiable. `qb-templatization` (562 fichiers, 48 000 lignes ajoutées)
   ne devrait pas rester une branche de longue durée.
3. **API-0 avant F1** : F1 épingle une version du SDL. Pinner un commit mouvant recrée le
   problème que F1 résout.
4. **F6 en parallèle de F3-F5** : seule dépendance F2.
5. **TypeScript en dernier** : F2/F3/F6 réécrivent les modèles de données et les signatures.
   Typer avant, c'est typer deux fois. Les types de l'API (`codegen`) deviennent alors la
   source des types de documents.
6. **F7 après 0.4.0** : seul chantier qui dépend d'un tag API encore à poser.

## 4. Décisions à prendre par vous

| # | Question | Recommandation |
|---|---|---|
| 1 | Langue de la documentation | **Tranché : français** (déjà la langue des 30 pages MDX et de `features/docs`). Le préciser dans `guides/internationalisation.mdx` ; traduction anglaise éventuelle plus tard. |
| 2 | Le bloc sombre local des 21 fichiers : remonter ou laisser ? | Laisser. C'est la convention documentée (`theme-sombre.mdx`) et `check:palette` la surveille ; le coût du remontage dépasse le gain. |
| 3 | Les 4 documents `TEMPLATIZATION_*` / `LANGUAGE_SWITCHER_*` : les versionner ? | Les déplacer dans `docs-internal/` versionné : ils décrivent des décisions que `CONTRIBUTING.md` renvoie à d'autres sources. Je les supprimerai une fois que j'ai implémenté toutes mes spécifications, avant de merge sur main. On peut les laisser à la racine du repo pour le moment |
| 4 | Numéro de version | **Tranché : rester en 0.x.** Le dépôt est à `1.0.0` (tag `v1.0.0`) alors que personne ne l'utilise : voir G2 pour le ramener en 0.x. Ensuite, toute rupture = version mineure (`0.y.0`). Je souhaite repasser en version 0.x |
