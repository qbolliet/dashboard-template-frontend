# LANGUAGE SWITCHER — Prompts de mise en œuvre

Prompts d'exécution de
[LANGUAGE_SWITCHER_ARCHITECTURE.md](./LANGUAGE_SWITCHER_ARCHITECTURE.md).
Un prompt = une session, un commit, un périmètre vérifiable.

---

## Mode d'emploi

### Choix du modèle

| | Opus | Sonnet |
|---|---|---|
| **Quand** | Décision d'architecture à arbitrer ; invariant transverse (hydratation, i18n, ARIA) ; risque de régression silencieuse | Périmètre entièrement spécifié à l'avance ; transformation mécanique ; résultat vérifiable par `lint`, un script ou l'œil |
| **Ici** | P5 (état + clavier), P6 (branchement i18n) | P1–P4, P7–P9 |

### Mode plan

À activer quand le prompt touche plusieurs fichiers de façon difficilement
réversible ou quand l'approche mérite validation avant écriture. À désactiver quand
la tâche est mécanique.

### Convention commune — À COLLER EN TÊTE DE CHAQUE SESSION

> Respecte `CLAUDE.md` et `LANGUAGE_SWITCHER_ARCHITECTURE.md` :
>
> - composants déclarés `const Name = ({ … }) => { … }` puis `export default Name;`
>   en **fin de fichier** — jamais `export default function` ;
> - docstrings **Google, en anglais**, avec des `@param` exacts (ils alimentent la
>   table des props générée : une prop décrite mais inexistante fait échouer
>   `npm run build:props -- --strict`) ;
> - commentaires inline **en français, détaillés, à formulation nominale** — au
>   niveau de densité des composants du header (`SidebarSwitcher.jsx`,
>   `Tabs/Tab/Tab.scss`) : on explique le **pourquoi**, pas le **quoi** ;
> - **aucun** `useMemo` ni `useCallback` de performance : le React Compiler est
>   actif (`reactCompiler: true`) ;
> - `'use client'` **uniquement** là où l'architecture le prévoit ;
> - SCSS : jamais de `px` ni de `rem` en dur — toute valeur passe par une propriété
>   personnalisée dérivée de l'échelle de `styles/globals/typography.scss` par
>   `calc()`. Couleurs **toujours** en `hsl(var(--token))` ;
> - fichiers de couleurs : sélecteur `:root, [data-theme]`, **jamais** `:root` seul,
>   puis un bloc `[data-theme="dark"]` pour les surcharges ;
> - JSX : balises sémantiques explicites, aucun `<div>` de commodité, structure la
>   plus épurée possible ;
> - `@use` **relatifs** entre fichiers d'un même groupe de composants ; l'alias `@/`
>   n'est utilisé que pour `src/styles/**`.
>
> ⚠️ Lightning CSS supprime silencieusement une propriété `rotate:` autonome
> cohabitant avec `transform:` dans la même règle : n'écris jamais que `transform`.

---

# P1 — Fondations du groupe : données, tokens, couleurs partagées

**Modèle : Sonnet** — périmètre entièrement défini, aucune décision.
**Mode plan : non.**

> Respecte `CLAUDE.md` et `LANGUAGE_SWITCHER_ARCHITECTURE.md` :
>
> - composants déclarés `const Name = ({ … }) => { … }` puis `export default Name;`
>   en **fin de fichier** — jamais `export default function` ;
> - docstrings **Google, en anglais**, avec des `@param` exacts (ils alimentent la
>   table des props générée : une prop décrite mais inexistante fait échouer
>   `npm run build:props -- --strict`) ;
> - commentaires inline **en français, détaillés, à formulation nominale** — au
>   niveau de densité des composants du header (`SidebarSwitcher.jsx`,
>   `Tabs/Tab/Tab.scss`) : on explique le **pourquoi**, pas le **quoi** ;
> - **aucun** `useMemo` ni `useCallback` de performance : le React Compiler est
>   actif (`reactCompiler: true`) ;
> - `'use client'` **uniquement** là où l'architecture le prévoit ;
> - SCSS : jamais de `px` ni de `rem` en dur — toute valeur passe par une propriété
>   personnalisée dérivée de l'échelle de `styles/globals/typography.scss` par
>   `calc()`. Couleurs **toujours** en `hsl(var(--token))` ;
> - fichiers de couleurs : sélecteur `:root, [data-theme]`, **jamais** `:root` seul,
>   puis un bloc `[data-theme="dark"]` pour les surcharges ;
> - JSX : balises sémantiques explicites, aucun `<div>` de commodité, structure la
>   plus épurée possible ;
> - `@use` **relatifs** entre fichiers d'un même groupe de composants ; l'alias `@/`
>   n'est utilisé que pour `src/styles/**`.
>
> ⚠️ Lightning CSS supprime silencieusement une propriété `rotate:` autonome
> cohabitant avec `transform:` dans la même règle : n'écris jamais que `transform`.
>
> Crée le squelette du groupe de composants `LanguageSwitcher` dans
> `src/features/i18n/components/LanguageSwitcher/`. **Aucun `.jsx` de composant dans
> ce prompt** : seulement les données, les tokens partagés et le baril.
>
> ### 1. `languages.js`
>
> Module sans React, sans effet de bord, avec un en-tête de fichier expliquant son
> rôle (source des langues par défaut + résolution de l'URL des drapeaux).
>
> - `export const DEFAULT_LANGUAGES` — le tableau **exact** du prototype
>   `design-system/project/scripts/language-switcher.jsx`, ordre compris :
>   `fr/FR/Français`, `en/GB/English`, `es/ES/Español`, `de/DE/Deutsch`,
>   `it/IT/Italiano`, `pt/PT/Português`, `nl/NL/Nederlands`, `ja/JP/日本語`.
>   Chaque entrée est `{ code, country, name }` : `code` = code langue (sert à
>   l'attribut `lang` et à la valeur remontée), `country` = code pays ISO 3166-1
>   alpha-2 (drapeau + badge affiché), `name` = nom de la langue **dans sa propre
>   langue**. Documente ces trois champs avec un `@typedef` JSDoc.
> - `export const flagCdnSrc = (country) => …` — renvoie
>   `https://flagcdn.com/<country en minuscules>.svg`, ou `null` si `country` est
>   absent. Docstring Google.
>
> Commente en français **pourquoi** le nom est en langue native (convention
> universelle des sélecteurs : qui cherche l'anglais cherche « English », pas
> « Anglais ») et **pourquoi** `country` est séparé de `code` (`en` → drapeau `GB` :
> une langue n'est pas un pays).
>
> ### 2. `_tokens.scss` — tokens partagés du groupe
>
> Bloc `:root`, en-tête de fichier expliquant le périmètre (« variables partagées
> par plusieurs sous-composants ; si une variable ne sert qu'à un seul, elle va dans
> le `_tokens.scss` de son dossier »).
>
> ```scss
> --lang-switch-flag-size-sm: 18px;
> --lang-switch-flag-size-md: 22px;
> --lang-switch-flag-size-lg: 26px;
> --lang-switch-flag-size: var(--lang-switch-flag-size-md);
> --lang-switch-gap: calc(var(--spacing-xs) + var(--spacing-2px));  // 6px
> --lang-switch-transition: var(--transition-fast);
> ```
>
> Commente que `--lang-switch-flag-size` est le **pilote unique** de l'échelle : la
> hauteur du bouton, sa largeur en mode compact et le diamètre de la pastille en
> dérivent par `calc()`, et qu'il est réassigné par les modificateurs de taille et
> par le contexte « option ». Les trois diamètres restent en pixels (bornes de
> gabarit assumées, comme `--nav-drawer-width: 280px` dans `header/_tokens.scss`).
>
> ### 3. `_colors.scss` — couleurs partagées du groupe
>
> Sélecteur `:root, [data-theme]` :
>
> ```scss
> --lang-switch-surface: var(--color-surface);
> --lang-switch-border:  var(--color-border);
> --lang-switch-focus:   var(--color-focus);
> ```
>
> Pas de bloc `[data-theme="dark"]` — ces trois tokens sémantiques se réévaluent
> seuls. Commente-le, sinon quelqu'un l'ajoutera « par symétrie ».
>
> Reprends **mot pour mot** l'explication du sélecteur double telle qu'elle figure
> en tête de `src/styles/globals/primitives/colors.scss` (déclaration résolue à
> l'élément portant `data-theme`, condition d'un thème local scopable).
>
> ### 4. `index.js`
>
> Baril du groupe, sur le modèle de `src/components/ui/Tabs/index.js` :
>
> ```js
> export { default as LanguageSwitcher } from './LanguageSwitcher/LanguageSwitcher';
> export { DEFAULT_LANGUAGES, flagCdnSrc } from './languages';
> ```
>
> Les sous-composants (`LanguageButton`, `LanguageMenu`, `LanguageOption`,
> `FlagChip`) ne sont **pas** exportés : ils n'ont aucun sens hors de la racine.
> Commente ce choix.
>
> ⚠️ L'export de `LanguageSwitcher` pointe vers un fichier qui n'existe pas encore
> (P5). C'est attendu ; ne crée pas de bouchon.
>
> Ne touche à aucun autre fichier du dépôt.

---

# P2 — `<FlagChip>` : la pastille de drapeau, sans état

**Modèle : Sonnet** — un composant, une structure imposée.
**Mode plan : non.**

> Respecte `CLAUDE.md` et `LANGUAGE_SWITCHER_ARCHITECTURE.md` :
>
> - composants déclarés `const Name = ({ … }) => { … }` puis `export default Name;`
>   en **fin de fichier** — jamais `export default function` ;
> - docstrings **Google, en anglais**, avec des `@param` exacts (ils alimentent la
>   table des props générée : une prop décrite mais inexistante fait échouer
>   `npm run build:props -- --strict`) ;
> - commentaires inline **en français, détaillés, à formulation nominale** — au
>   niveau de densité des composants du header (`SidebarSwitcher.jsx`,
>   `Tabs/Tab/Tab.scss`) : on explique le **pourquoi**, pas le **quoi** ;
> - **aucun** `useMemo` ni `useCallback` de performance : le React Compiler est
>   actif (`reactCompiler: true`) ;
> - `'use client'` **uniquement** là où l'architecture le prévoit ;
> - SCSS : jamais de `px` ni de `rem` en dur — toute valeur passe par une propriété
>   personnalisée dérivée de l'échelle de `styles/globals/typography.scss` par
>   `calc()`. Couleurs **toujours** en `hsl(var(--token))` ;
> - fichiers de couleurs : sélecteur `:root, [data-theme]`, **jamais** `:root` seul,
>   puis un bloc `[data-theme="dark"]` pour les surcharges ;
> - JSX : balises sémantiques explicites, aucun `<div>` de commodité, structure la
>   plus épurée possible ;
> - `@use` **relatifs** entre fichiers d'un même groupe de composants ; l'alias `@/`
>   n'est utilisé que pour `src/styles/**`.
>
> ⚠️ Lightning CSS supprime silencieusement une propriété `rotate:` autonome
> cohabitant avec `transform:` dans la même règle : n'écris jamais que `transform`.
>
> Crée `src/features/i18n/components/LanguageSwitcher/FlagChip/` avec
> `FlagChip.jsx`, `FlagChip.scss`, `_tokens.scss` et `_colors.scss`.
>
> ### Le point crucial : le repli est **en CSS**, pas en React
>
> Le prototype gère l'échec de chargement du drapeau avec
> `useState` + `onError`. **N'implémente pas ça.** Rends le repli textuel
> **toujours**, dans la même cellule de grille que l'image, **sous** elle. Une image
> décorative (`alt=""`) dont le chargement échoue n'est pas peinte : le repli
> réapparaît tout seul, sans JavaScript, sans état, sans re-rendu.
>
> Ce composant ne porte donc **aucun hook**, **aucune** directive `'use client'`, et
> reste rendable côté serveur.
>
> ### `FlagChip.jsx`
>
> ```jsx
> const FlagChip = ({ country, flagSrc = flagCdnSrc, className = '' }) => {
>     const src = flagSrc(country);
>
>     return (
>         <span className={`lang-switch-flag ${className}`.trim()} aria-hidden="true">
>             <span className="lang-switch-flag-fallback">{country}</span>
>             {src && <img src={src} alt="" loading="lazy" decoding="async" />}
>         </span>
>     );
> };
> ```
>
> - `<img>` **natif**, jamais `next/image` : l'URL par défaut est distante, et sous
>   `output: 'export'` + `images.unoptimized`, `next/image` recopie le `src` tel quel
>   sans y ajouter le `basePath` (piège documenté dans `next.config.ts`).
> - `aria-hidden="true"` sur la pastille : le nom de la langue est déjà porté par le
>   texte de l'option et par l'`aria-label` du bouton. Commente-le.
> - Documente les trois props par des `@param` Google exacts.
>
> ### `FlagChip.scss`
>
> Ordre des `@use` : `'../tokens'`, `'../colors'`, `'./tokens'`, `'./colors'`, tous
> `as *`.
>
> Reproduis **à l'identique** l'apparence de `.lang-switch-flag` de
> `design-system/project/styles/language-switcher.css` :
>
> - `display: inline-grid; place-items: center;`
> - largeur et hauteur = `var(--lang-switch-flag-size)`, `flex-shrink: 0`
> - `border-radius: var(--lang-switch-flag-radius)`, `overflow: hidden`
> - fond `hsl(var(--lang-switch-flag-bg))`
> - anneau interne :
>   `box-shadow: inset 0 0 0 var(--lang-switch-flag-ring-width) hsl(var(--lang-switch-flag-ring) / 0.08);`
> - **superposition** : `> * { grid-area: 1 / 1; }` — c'est ce qui met l'image
>   par-dessus le repli au lieu de les empiler. Commente-le, c'est le mécanisme
>   entier du repli.
> - `img { width: 100%; height: 100%; object-fit: cover; display: block; }`
> - `.lang-switch-flag-fallback { font-size / font-weight / letter-spacing: 0.02em / color }`
>
> ### `_tokens.scss`
>
> ```scss
> --lang-switch-flag-radius: var(--border-radius-full);
> --lang-switch-flag-ring-width: 1px;
> --lang-switch-flag-fallback-font-size: 0.5rem;   // 8px
> --lang-switch-flag-fallback-font-weight: 700;
> ```
>
> `--border-radius-full` (50 %) est correct ici car la pastille est **carrée**.
> `0.5rem` est une **exception documentée** à la règle « toujours un token de
> l'échelle typographique » : 8 px est en dessous de `--font-size-xs` (12 px), il n'y
> a pas de palier pour ça. Écris le commentaire qui le dit, sur le modèle de
> `--select-option-padding-y: 0.45rem` dans `src/components/filter/SelectMenu/_tokens.scss`.
>
> ### `_colors.scss`
>
> Sélecteur `:root, [data-theme]` :
>
> ```scss
> --lang-switch-flag-bg: var(--color-gray-100);
> --lang-switch-flag-ring: var(--color-gray-900);
> --lang-switch-flag-fallback-color: var(--color-text-tertiary);
> ```
>
> **Aucun bloc `[data-theme="dark"]`.** Commente pourquoi : l'échelle de gris est
> **inversée** en thème sombre dans `primitives/colors.scss` (`--color-gray-900`
> passe de `220 39% 11%` à `210 40% 96%`), donc l'anneau devient clair tout seul.
> Ajouter une surcharge sombre le casserait.

---

# P3 — `<LanguageButton>` : le déclencheur

**Modèle : Sonnet** — structure et CSS entièrement spécifiés.
**Mode plan : non.**

> Respecte `CLAUDE.md` et `LANGUAGE_SWITCHER_ARCHITECTURE.md` :
>
> - composants déclarés `const Name = ({ … }) => { … }` puis `export default Name;`
>   en **fin de fichier** — jamais `export default function` ;
> - docstrings **Google, en anglais**, avec des `@param` exacts (ils alimentent la
>   table des props générée : une prop décrite mais inexistante fait échouer
>   `npm run build:props -- --strict`) ;
> - commentaires inline **en français, détaillés, à formulation nominale** — au
>   niveau de densité des composants du header (`SidebarSwitcher.jsx`,
>   `Tabs/Tab/Tab.scss`) : on explique le **pourquoi**, pas le **quoi** ;
> - **aucun** `useMemo` ni `useCallback` de performance : le React Compiler est
>   actif (`reactCompiler: true`) ;
> - `'use client'` **uniquement** là où l'architecture le prévoit ;
> - SCSS : jamais de `px` ni de `rem` en dur — toute valeur passe par une propriété
>   personnalisée dérivée de l'échelle de `styles/globals/typography.scss` par
>   `calc()`. Couleurs **toujours** en `hsl(var(--token))` ;
> - fichiers de couleurs : sélecteur `:root, [data-theme]`, **jamais** `:root` seul,
>   puis un bloc `[data-theme="dark"]` pour les surcharges ;
> - JSX : balises sémantiques explicites, aucun `<div>` de commodité, structure la
>   plus épurée possible ;
> - `@use` **relatifs** entre fichiers d'un même groupe de composants ; l'alias `@/`
>   n'est utilisé que pour `src/styles/**`.
>
> ⚠️ Lightning CSS supprime silencieusement une propriété `rotate:` autonome
> cohabitant avec `transform:` dans la même règle : n'écris jamais que `transform`.
>
> Crée `…/LanguageSwitcher/LanguageButton/` avec `LanguageButton.jsx`,
> `LanguageButton.scss`, `_tokens.scss` et `_colors.scss`. **Pas** de `'use client'`.
>
> ### `LanguageButton.jsx`
>
> Props : `language`, `open = false`, `compact = false`, `listId`, `label`,
> `flagSrc`, `onClick`, `onKeyDown`, `ref`.
>
> ```jsx
> <button
>     ref={ref}
>     type="button"
>     className="lang-switch-btn"
>     aria-haspopup="listbox"
>     aria-expanded={open}
>     aria-controls={open ? listId : undefined}
>     aria-label={label}
>     onClick={onClick}
>     onKeyDown={onKeyDown}>
>     <FlagChip country={language?.country} flagSrc={flagSrc} />
>     {!compact && <data className="lang-switch-code" value={language?.code}>{language?.country}</data>}
>     {!compact && <ChevronIcon direction="right" className="lang-switch-chevron" />}
> </button>
> ```
>
> Quatre points sur lesquels ne pas dévier :
>
> 1. **`ref` est une prop ordinaire** (React 19.2). N'utilise **pas** `forwardRef` :
>    déclare `ref` dans la déstructuration comme les autres props. Le `forwardRef` de
>    `TopbarToggleButton` est antérieur à React 19 et n'est pas un modèle.
> 2. **`<data>` et non `<span>`** pour le badge : l'élément affiche le pays (`GB`) et
>    porte en `value` le code langue (`en`). C'est exactement le rôle de `<data>`.
>    Commente-le.
> 3. **`aria-controls` conditionné à `open`** : le prototype le pose en permanence, ce
>    qui référence un id absent du DOM tant que le menu est fermé. Même conditionnement
>    que `SidebarSwitcher.jsx`. Commente-le.
> 4. `label` arrive **déjà interpolé** par le parent : ce composant n'importe ni
>    `interpolate`, ni de dictionnaire.
>
> Importe `ChevronIcon` depuis `@/components/icons` — **aucun SVG inline**. Son tracé
> `direction="right"` (`m9 6 6 6-6 6`) est identique au caractère près à celui du
> prototype.
>
> ### `LanguageButton.scss`
>
> `@use` dans l'ordre `'../tokens'`, `'../colors'`, `'./tokens'`, `'./colors'`.
>
> Reproduis `.lang-switch-btn` du prototype :
>
> - `display: inline-flex; align-items: center; gap: var(--lang-switch-gap);`
> - `height: var(--lang-switch-btn-height); padding: 0 var(--lang-switch-btn-padding-x);`
> - fond `hsl(var(--lang-switch-surface))`, bordure
>   `var(--lang-switch-btn-border-width) solid hsl(var(--lang-switch-border))`
> - `border-radius: var(--lang-switch-btn-radius); cursor: pointer;`
> - `color: hsl(var(--color-text-secondary));`
> - `transition: border-color var(--lang-switch-transition) ease, background-color var(--lang-switch-transition) ease;`
> - `&:hover` → `border-color: hsl(var(--lang-switch-btn-border-hover)); background-color: hsl(var(--lang-switch-btn-bg-hover));`
> - `&:focus-visible` → `outline: var(--lang-switch-btn-focus-ring-width) solid hsl(var(--lang-switch-focus) / 0.45); outline-offset: var(--lang-switch-btn-focus-ring-offset);`
> - variante compacte, écrite avec le sélecteur parent SCSS :
>   `.lang-switch--compact & { width: var(--lang-switch-btn-height); padding: 0; justify-content: center; }`
>   (largeur = hauteur → bouton rond, drapeau seul)
> - `.lang-switch-code` : `font-size`, `font-weight`, `letter-spacing: 0.02em`,
>   `color: hsl(var(--lang-switch-code-color));`
> - `.lang-switch-chevron` : `width`/`height` = `var(--lang-switch-chevron-size)`,
>   `flex-shrink: 0`, `color: hsl(var(--lang-switch-chevron-color));`,
>   `transition: transform var(--lang-switch-transition) ease;`
> - rotation à l'ouverture :
>   `&[aria-expanded="true"] .lang-switch-chevron { transform: rotate(var(--lang-switch-chevron-rotation)); }`
>
> ⚠️ **Une seule propriété `transform`**, jamais `rotate:` autonome : Lightning CSS
> supprime le second silencieusement au build quand les deux cohabitent.
>
> ⚠️ **Ne ressuscite pas** la règle `.lang-switch[aria-expanded="true"] .lang-switch-btn`
> du prototype (changement de bordure à l'ouverture) : elle ne s'appliquait **jamais**,
> l'attribut étant porté par le `<button>` et non par la racine. L'apparence à
> reproduire est celle qui était réellement rendue. Mentionne-le en commentaire pour
> que personne ne « corrige » l'oubli.
>
> ### `_tokens.scss` et `_colors.scss`
>
> Reprends **exactement** les tables §6.3 de
> `LANGUAGE_SWITCHER_ARCHITECTURE.md` (dix tokens dimensionnels, quatre couleurs).
>
> Dans `_colors.scss`, le bloc `[data-theme="dark"]` ne contient **qu'une** ligne :
> `--lang-switch-btn-bg-hover: var(--color-gray-200);`. Commente-la : en thème sombre
> `--color-surface` **vaut** `--color-gray-50`, donc le survol du prototype serait
> strictement identique au fond au repos — survol invisible. Le décalage d'un cran
> est la convention du dépôt (`SelectMenu/_colors.scss`, `ThemeToggleButton/_colors.scss`).
>
> Note aussi que `--border-radius-pill` (999 px) est utilisé et **non**
> `--border-radius-full` (50 %) : le bouton non compact est plus large que haut,
> `50 %` y produirait une ellipse (cf. le commentaire de `typography.scss`).

---

# P4 — `<LanguageMenu>` et `<LanguageOption>` : la liste

**Modèle : Sonnet** — deux composants présentatifs, spécification complète.
**Mode plan : non.**

> Respecte `CLAUDE.md` et `LANGUAGE_SWITCHER_ARCHITECTURE.md` :
>
> - composants déclarés `const Name = ({ … }) => { … }` puis `export default Name;`
>   en **fin de fichier** — jamais `export default function` ;
> - docstrings **Google, en anglais**, avec des `@param` exacts (ils alimentent la
>   table des props générée : une prop décrite mais inexistante fait échouer
>   `npm run build:props -- --strict`) ;
> - commentaires inline **en français, détaillés, à formulation nominale** — au
>   niveau de densité des composants du header (`SidebarSwitcher.jsx`,
>   `Tabs/Tab/Tab.scss`) : on explique le **pourquoi**, pas le **quoi** ;
> - **aucun** `useMemo` ni `useCallback` de performance : le React Compiler est
>   actif (`reactCompiler: true`) ;
> - `'use client'` **uniquement** là où l'architecture le prévoit ;
> - SCSS : jamais de `px` ni de `rem` en dur — toute valeur passe par une propriété
>   personnalisée dérivée de l'échelle de `styles/globals/typography.scss` par
>   `calc()`. Couleurs **toujours** en `hsl(var(--token))` ;
> - fichiers de couleurs : sélecteur `:root, [data-theme]`, **jamais** `:root` seul,
>   puis un bloc `[data-theme="dark"]` pour les surcharges ;
> - JSX : balises sémantiques explicites, aucun `<div>` de commodité, structure la
>   plus épurée possible ;
> - `@use` **relatifs** entre fichiers d'un même groupe de composants ; l'alias `@/`
>   n'est utilisé que pour `src/styles/**`.
>
> ⚠️ Lightning CSS supprime silencieusement une propriété `rotate:` autonome
> cohabitant avec `transform:` dans la même règle : n'écris jamais que `transform`.
>
> Crée deux dossiers sous `…/LanguageSwitcher/` :
> `LanguageMenu/` (`.jsx`, `.scss`, `_tokens.scss` — **pas** de `_colors.scss`) et
> `LanguageOption/` (`.jsx`, `.scss`, `_tokens.scss`, `_colors.scss`).
> Ni l'un ni l'autre ne porte `'use client'`.
>
> ### `LanguageMenu.jsx`
>
> Props : `id`, `align = 'left'`, `label`, `activeDescendantId`, `onKeyDown`,
> `children`, `ref`.
>
> ```jsx
> <ul
>     ref={ref}
>     id={id}
>     role="listbox"
>     tabIndex={-1}
>     className={`lang-switch-menu lang-switch-menu--${align}`}
>     aria-label={label}
>     aria-activedescendant={activeDescendantId}
>     onKeyDown={onKeyDown}>
>     {children}
> </ul>
> ```
>
> Commente les deux choix structurants :
>
> - **le `<ul>` EST le panneau** : c'est lui qui porte fond, bordure, ombre et
>   défilement. Aucun conteneur intermédiaire — convention déjà actée pour les
>   dropdowns de navigation du header ;
> - **`tabIndex={-1}` + `aria-activedescendant`** : le focus DOM reste sur la liste,
>   seul l'attribut désigne l'option courante. C'est le motif APG « Collapsible
>   Dropdown Listbox », et c'est ce qui permet de ne jamais déplacer le focus
>   pendant la navigation aux flèches.
>
> ### `LanguageMenu.scss`
>
> - `position: absolute; top: calc(100% + var(--lang-switch-menu-offset));`
> - `min-width`, `max-height`, `overflow-y: auto`
> - `margin: 0; padding: var(--lang-switch-menu-padding); list-style: none;`
> - fond `hsl(var(--lang-switch-surface))`, bordure `1px solid hsl(var(--lang-switch-border))`
> - `border-radius`, `box-shadow`, `z-index`, `outline: none`
> - `&--left { left: 0; }` / `&--right { right: 0; }`
>
> `z-index` passe de `50` (prototype) à `var(--z-dropdown)` : le dépôt a une échelle
> unique dans `typography.scss`, la superposition relative est inchangée.
> Commente la substitution.
>
> ### `LanguageOption.jsx`
>
> Props : `id`, `language`, `selected = false`, `active = false`, `flagSrc`,
> `onSelect`, `onHover`.
>
> ```jsx
> <li
>     id={id}
>     role="option"
>     lang={language.code}
>     aria-selected={selected}
>     className={`lang-switch-option${active ? ' lang-switch-option--active' : ''}`}
>     onMouseEnter={onHover}
>     onClick={onSelect}>
>     <FlagChip country={language.country} className="lang-switch-option-flag" flagSrc={flagSrc} />
>     <span className="lang-switch-option-name">{language.name}</span>
>     {selected && <CheckIcon className="lang-switch-check" strokeWidth={2.5} />}
> </li>
> ```
>
> Trois commentaires attendus :
>
> 1. **`selected` ≠ `active`** — `selected` est la langue **du site** (coche + gras,
>    `aria-selected`), `active` est la position du **curseur clavier/souris**
>    (surbrillance). Les fusionner ferait disparaître la coche dès qu'on survole une
>    autre ligne.
> 2. **`lang={language.code}`** — fait prononcer « Español » avec la phonétique
>    espagnole plutôt qu'avec celle de la page.
> 3. **`onMouseEnter={onHover}`** — synchronise le curseur clavier sur la souris,
>    pour qu'un `Entrée` après un survol sélectionne bien la ligne survolée.
>
> `CheckIcon` vient de `@/components/icons` avec `strokeWidth={2.5}` : son tracé
> (`M20 6 9 17l-5-5`) et son épaisseur sont ceux du prototype.
>
> La classe `is-active` du prototype devient `lang-switch-option--active` (convention
> BEM du dépôt). Apparence strictement inchangée.
>
> ### `LanguageOption.scss`
>
> - `display: flex; align-items: center; gap: var(--lang-switch-option-gap);`
> - `padding: var(--lang-switch-option-padding-y) var(--lang-switch-option-padding-x);`
> - `border-radius`, `font-size`, `color: hsl(var(--lang-switch-option-color));`
> - `cursor: pointer; white-space: nowrap;`
> - **réduction du drapeau dans ce contexte** :
>   `.lang-switch-option-flag { --lang-switch-flag-size: var(--lang-switch-option-flag-size); }`
>   C'est la réassignation d'une propriété personnalisée sur un descendant, pas une
>   règle de dimension : `FlagChip` n'a pas à connaître ses contextes. Commente-le.
> - `&--active, &:hover` → fond `hsl(var(--lang-switch-option-hover-bg))`,
>   couleur `hsl(var(--lang-switch-option-hover-color))`
> - `&[aria-selected="true"]` → couleur `hsl(var(--lang-switch-option-selected-color))`,
>   `font-weight: var(--lang-switch-option-font-weight-selected)`
> - `.lang-switch-option-name { flex: 1; min-width: 0; }`
> - `.lang-switch-check` → taille `var(--lang-switch-check-size)`, `flex-shrink: 0`,
>   `color: hsl(var(--lang-switch-check-color));`
>
> ### Tokens et couleurs
>
> Reprends **exactement** les tables §6.3 de l'architecture (sept tokens pour le
> menu, huit pour l'option, cinq couleurs pour l'option).
>
> `LanguageMenu` n'a **pas** de `_colors.scss` : il n'utilise que
> `--lang-switch-surface` et `--lang-switch-border`, partagés avec le bouton et déjà
> déclarés à la racine du groupe. Écris-le en commentaire dans `LanguageMenu.scss`.
>
> `LanguageOption/_colors.scss` n'a **pas** de bloc `[data-theme="dark"]` :
> `--color-gray-100` en sombre (11 % de clarté) se détache correctement de la surface
> du menu (7 %). Commente le calcul, sinon quelqu'un ajoutera une surcharge inutile.

---

# P5 — `useLanguageMenu` et la racine `<LanguageSwitcher>`

**Modèle : Opus** — état contrôlé/non contrôlé, effets, ARIA, clavier : c'est là
que se logent les régressions silencieuses.
**Mode plan : oui.**

> Respecte `CLAUDE.md` et `LANGUAGE_SWITCHER_ARCHITECTURE.md` :
>
> - composants déclarés `const Name = ({ … }) => { … }` puis `export default Name;`
>   en **fin de fichier** — jamais `export default function` ;
> - docstrings **Google, en anglais**, avec des `@param` exacts (ils alimentent la
>   table des props générée : une prop décrite mais inexistante fait échouer
>   `npm run build:props -- --strict`) ;
> - commentaires inline **en français, détaillés, à formulation nominale** — au
>   niveau de densité des composants du header (`SidebarSwitcher.jsx`,
>   `Tabs/Tab/Tab.scss`) : on explique le **pourquoi**, pas le **quoi** ;
> - **aucun** `useMemo` ni `useCallback` de performance : le React Compiler est
>   actif (`reactCompiler: true`) ;
> - `'use client'` **uniquement** là où l'architecture le prévoit ;
> - SCSS : jamais de `px` ni de `rem` en dur — toute valeur passe par une propriété
>   personnalisée dérivée de l'échelle de `styles/globals/typography.scss` par
>   `calc()`. Couleurs **toujours** en `hsl(var(--token))` ;
> - fichiers de couleurs : sélecteur `:root, [data-theme]`, **jamais** `:root` seul,
>   puis un bloc `[data-theme="dark"]` pour les surcharges ;
> - JSX : balises sémantiques explicites, aucun `<div>` de commodité, structure la
>   plus épurée possible ;
> - `@use` **relatifs** entre fichiers d'un même groupe de composants ; l'alias `@/`
>   n'est utilisé que pour `src/styles/**`.
>
> ⚠️ Lightning CSS supprime silencieusement une propriété `rotate:` autonome
> cohabitant avec `transform:` dans la même règle : n'écris jamais que `transform`.
>
> Crée `src/features/i18n/hooks/useLanguageMenu.js` et
> `…/LanguageSwitcher/LanguageSwitcher/` (`LanguageSwitcher.jsx`,
> `LanguageSwitcher.scss`, `_tokens.scss`).
>
> Lis d'abord `design-system/project/scripts/language-switcher.jsx` **en entier** :
> le comportement clavier et ARIA doit être porté à l'identique, seule l'organisation
> change.
>
> ### 1. `useLanguageMenu.js` — `'use client'`
>
> Signature :
>
> ```js
> const {
>   value, open, activeIndex,
>   rootRef, buttonRef, listRef,
>   openMenu, closeMenu, toggleMenu, selectIndex, setActiveIndex,
>   onButtonKeyDown, onListKeyDown,
> } = useLanguageMenu({ languages, value, defaultValue, onChange });
> ```
>
> **Mode contrôlé / non contrôlé** — le mode est déterminé par
> `controlledValue !== undefined`, comme dans `Tabs.jsx` et `SelectMenu.jsx`. En
> mode contrôlé, l'état interne existe mais n'est **jamais lu**. `onChange` est
> appelé dans **les deux** modes.
>
> **Valeur initiale** : `defaultValue ?? languages[0]?.code`.
>
> > ⚠️ **Ne porte PAS `pickSystemLanguage`** du prototype. Lire
> > `navigator.languages` à l'initialisation produirait une divergence
> > d'hydratation (le serveur rend `languages[0]`, le client rend autre chose) ; et
> > la négociation système existe déjà, testée et partagée, dans
> > `src/utils/i18n/negotiateLocale.js`, appelée par le redirecteur `/demo`. Écris ce
> > raisonnement en commentaire d'en-tête du hook : c'est la question que le prochain
> > lecteur se posera.
>
> **Exactement deux effets**, tous deux dépendant de `[open]` :
>
> 1. clic extérieur — `document.addEventListener('mousedown', …)` monté **seulement
>    quand `open`**, démonté au retour de l'effet. Ferme si la cible est hors de
>    `rootRef.current` ;
> 2. focus de la liste à l'ouverture — `listRef.current?.focus()`.
>
> Aucun autre effet. Le gestionnaire de clic extérieur est **créé dans l'effet** :
> c'est ce qui garantit l'identité stable exigée par `removeEventListener`, pas une
> mémoïsation. Pas de `useCallback`, pas de `useMemo` — React Compiler actif.
>
> **Clavier — à reproduire exactement :**
>
> | Contexte | Touche | Effet |
> |---|---|---|
> | Bouton | `ArrowDown` `ArrowUp` `Enter` `' '` | `preventDefault` + ouverture, `activeIndex` = index de la langue active (`Math.max(0, findIndex)`) |
> | Liste | `ArrowDown` | `preventDefault` + `Math.min(languages.length - 1, i + 1)` |
> | Liste | `ArrowUp` | `preventDefault` + `Math.max(0, i - 1)` |
> | Liste | `Home` / `End` | `preventDefault` + première / dernière |
> | Liste | `Enter` / `' '` | `preventDefault` + `selectIndex(activeIndex)` |
> | Liste | `Escape` | `preventDefault` + fermeture **avec retour du focus au bouton** |
> | Liste | `Tab` | fermeture **sans** `preventDefault` — la tabulation doit suivre son cours |
>
> Le déplacement est **borné, sans boucle**. C'est une divergence assumée avec
> `useKeyboardNavigation` (`loop: true`) du dépôt, qui n'est donc **pas** réutilisé
> ici : c'est le comportement du prototype et la recommandation APG pour un listbox
> court. Commente la divergence pour qu'elle ne soit pas « harmonisée » plus tard.
>
> `closeMenu(focusButton)` prend un booléen : `true` rend le focus au bouton
> (`Échap`, sélection), `false` ne le fait pas (clic sur le bouton pour refermer —
> le focus y est déjà).
>
> Docstring Google complète en tête du hook, décrivant chaque entrée et chaque sortie.
>
> ### 2. `LanguageSwitcher.jsx` — `'use client'`
>
> Props, défauts et rendu : voir §4.1 de `LANGUAGE_SWITCHER_ARCHITECTURE.md`, à
> reprendre **tel quel**. Points à respecter :
>
> - `DEFAULT_LABELS = { button: 'Changer de langue — {language}', list: 'Langues disponibles' }`,
>   constante de **module** (pas une valeur par défaut de prop : c'est ce qui rend la
>   fusion partielle possible), fusionnée par `mergeLabels(DEFAULT_LABELS, labels)`
>   depuis `@/utils/i18n/mergeLabels` ;
> - le gabarit `{language}` est interpolé par `interpolate` de
>   `@/utils/i18n/interpolate`, **jamais** par un template literal — les libellés
>   doivent rester sérialisables à travers la frontière serveur → client ;
> - `listId` vient de `useId()`, et les ids d'options sont `${listId}-opt-${index}` ;
> - la racine est un **`<section>`**, pas un `<div>`. Commente pourquoi : `<span>`
>   n'accepte que du contenu de phrasé et rendrait le `<ul>` invalide ; `<section>`
>   sans nom accessible n'est pas exposé comme région, donc n'ajoute aucun bruit —
>   c'est ce que fait déjà `<Tabs>` ;
> - le menu est monté **conditionnellement** (`{open && …}`), comme le prototype ;
> - classes de la racine :
>   `['lang-switch', 'lang-switch--' + size, compact && 'lang-switch--compact', className].filter(Boolean).join(' ')` ;
> - `current = languages.find((l) => l.code === value) ?? languages[0]` ; le composant
>   doit rester rendable avec `languages = []` (le bouton affiche alors la pastille de
>   repli vide, aucune exception levée).
>
> ### 3. `LanguageSwitcher.scss` et son `_tokens.scss`
>
> `.lang-switch { position: relative; display: inline-block; }` — c'est le contexte
> de positionnement du menu absolu.
>
> Les modificateurs de taille **réassignent** le pilote unique :
>
> ```scss
> &--sm { --lang-switch-flag-size: var(--lang-switch-flag-size-sm); }
> &--lg { --lang-switch-flag-size: var(--lang-switch-flag-size-lg); }
> ```
>
> `md` n'a pas de modificateur : c'est la valeur par défaut du token partagé.
>
> Le `_tokens.scss` de ce dossier est **probablement vide de tout token propre** — la
> racine ne fait que réassigner des tokens du groupe. Si c'est le cas, ne crée pas le
> fichier plutôt que de créer une coquille vide, et dis-le dans ton compte rendu.
>
> ### 4. Vérification
>
> `npm run lint` doit passer. Rends compte de ce que tu n'as pas pu vérifier sans
> navigateur.

---

# P6 — Branchement sur le routage de langue du site

**Modèle : Opus** — contrat i18n, schéma de configuration, test e2e : plusieurs
invariants transverses à préserver d'un coup.
**Mode plan : oui.**

> Respecte `CLAUDE.md` et `LANGUAGE_SWITCHER_ARCHITECTURE.md` :
>
> - composants déclarés `const Name = ({ … }) => { … }` puis `export default Name;`
>   en **fin de fichier** — jamais `export default function` ;
> - docstrings **Google, en anglais**, avec des `@param` exacts (ils alimentent la
>   table des props générée : une prop décrite mais inexistante fait échouer
>   `npm run build:props -- --strict`) ;
> - commentaires inline **en français, détaillés, à formulation nominale** — au
>   niveau de densité des composants du header (`SidebarSwitcher.jsx`,
>   `Tabs/Tab/Tab.scss`) : on explique le **pourquoi**, pas le **quoi** ;
> - **aucun** `useMemo` ni `useCallback` de performance : le React Compiler est
>   actif (`reactCompiler: true`) ;
> - `'use client'` **uniquement** là où l'architecture le prévoit ;
> - SCSS : jamais de `px` ni de `rem` en dur — toute valeur passe par une propriété
>   personnalisée dérivée de l'échelle de `styles/globals/typography.scss` par
>   `calc()`. Couleurs **toujours** en `hsl(var(--token))` ;
> - fichiers de couleurs : sélecteur `:root, [data-theme]`, **jamais** `:root` seul,
>   puis un bloc `[data-theme="dark"]` pour les surcharges ;
> - JSX : balises sémantiques explicites, aucun `<div>` de commodité, structure la
>   plus épurée possible ;
> - `@use` **relatifs** entre fichiers d'un même groupe de composants ; l'alias `@/`
>   n'est utilisé que pour `src/styles/**`.
>
> ⚠️ Lightning CSS supprime silencieusement une propriété `rotate:` autonome
> cohabitant avec `transform:` dans la même règle : n'écris jamais que `transform`.
>
> Remplace le `<select>` non dessiné de `LocaleSwitcher` par le nouveau composant, et
> fais en sorte qu'ajouter une langue au site reste un geste unique.
>
> ### 1. `config/site.config.json` — nouvelle clé optionnelle
>
> Sous `site`, à côté de `locales` et `defaultLocale` :
>
> ```json
> "localeCountries": { "fr": "FR", "en": "GB" }
> ```
>
> ### 2. `config/schema/site.schema.json`
>
> `$defs.site` a `additionalProperties: false` : sans édition du schéma,
> `npm run validate:config` **échouera**. Ajoute `localeCountries` aux `properties`
> (objet, **non requis**, clés = codes de langue via le `$defs.localeCode` existant,
> valeurs = chaînes de 2 lettres majuscules — `"pattern": "^[A-Z]{2}$"`).
>
> Rédige sa `description` dans le ton des autres entrées du schéma : code pays
> ISO 3166-1 alpha-2 servant à choisir le **drapeau** de la langue ; facultatif, un
> repli est calculé ; nécessaire dès que la langue et le pays divergent (`en` → `GB`,
> `ja` → `JP`).
>
> ### 3. `src/i18n/config.js`
>
> Ajoute :
>
> - `export const LOCALE_COUNTRIES = siteConfig.site.localeCountries ?? {};`
> - `export const countryForLocale = (code) => …` — résolution en **trois passes** :
>   1. `LOCALE_COUNTRIES[code]` ;
>   2. sous-étiquette de région si présente (`pt-BR` → `BR`) ;
>   3. langue en majuscules (`fr` → `FR`).
>
> Docstring Google. Complète la liste « AJOUTER UNE LANGUE » de l'en-tête du fichier
> avec le geste `localeCountries`, en précisant qu'il est facultatif **sauf** quand
> langue et pays divergent — `en` donnerait sinon `EN`, qui n'est pas un pays.
>
> ### 4. `src/i18n/dictionaries/{fr,en}.js`
>
> Dans `localeSwitcher`, ajoute `button` et `list` **dans les deux fichiers** :
>
> | Clé | fr | en |
> |---|---|---|
> | `button` | `Changer de langue — {language}` | `Change language — {language}` |
> | `list` | `Langues disponibles` | `Available languages` |
>
> Conserve `label` et `names`. Le gabarit `{language}` doit être présent des **deux**
> côtés : `npm run check:i18n -- --strict` compare les trous entre traductions et
> échoue si l'un manque.
>
> ### 5. `LocaleSwitcher.jsx` — réécriture complète
>
> Voir §4.7 de l'architecture. Points non négociables :
>
> - **mode contrôlé obligatoire** : `value={locale}` + `onChange={setLocale}`. La
>   langue est décidée par l'URL, pas par un état client — jamais de `defaultValue` ;
> - `menuAlign` par défaut à **`'right'`** (et non `'left'` comme le composant de
>   présentation) : dans le header, le contrôle est collé au bord droit, un menu
>   aligné à gauche déborderait de la fenêtre. Commente ce choix ;
> - `languages` dérivé de `locales` par `countryForLocale` + `dictionary.localeSwitcher.names`,
>   avec repli sur le code brut quand le nom manque (la langue reste sélectionnable,
>   `check:i18n` signale le trou) ;
> - **conserve l'en-tête de commentaire** du fichier actuel dans son esprit, mais
>   réécris-le : les quatre invariants qu'il énumère (nom accessible, noms en langue
>   native, attribut `lang` par option, passage par `setLocale` qui préserve le
>   chemin) sont tous encore vrais et tous encore portés — dis **par quoi**
>   désormais.
>
> Props exposées : `size = 'md'`, `compact = false`, `menuAlign = 'right'`.
>
> ### 6. `LocaleSwitcher.scss`
>
> Le fichier style un `<select>` qui n'existe plus. Vide-le de tout ce qui devient
> mort. S'il ne reste rien d'utile, **supprime le fichier et son import** plutôt que
> de laisser une coquille. Justifie ton choix dans le compte rendu.
>
> ### 7. `e2e/i18n.spec.ts`
>
> Ligne 81 : `await page.selectOption('#locale-switcher', 'en');` ne peut plus
> fonctionner. Remplace par une interaction à deux temps, **par les rôles** et jamais
> par les classes CSS :
>
> ```ts
> await page.getByRole('button', { name: /Changer de langue/ }).click();
> await page.getByRole('option', { name: 'English' }).click();
> ```
>
> Le reste du test (attente d'URL, `html[lang]`, visibilité du bouton de sidebar) est
> inchangé. Vérifie qu'aucun autre test ne cible `#locale-switcher` ou
> `.locale-switcher`.
>
> ### 8. Vérification
>
> ```
> npm run lint
> npm run validate:config
> npm run check:i18n -- --strict
> ```
>
> Ces trois commandes doivent passer. Ne lance pas la suite Playwright complète
> (≈ plusieurs minutes) ; signale simplement que `e2e/i18n.spec.ts` reste à exécuter.

---

# P7 — Registry : publication de l'item

**Modèle : Sonnet** — chaîne outillée, sortie vérifiable par script.
**Mode plan : non.**

> Respecte `CLAUDE.md` et `LANGUAGE_SWITCHER_ARCHITECTURE.md` :
>
> - composants déclarés `const Name = ({ … }) => { … }` puis `export default Name;`
>   en **fin de fichier** — jamais `export default function` ;
> - docstrings **Google, en anglais**, avec des `@param` exacts (ils alimentent la
>   table des props générée : une prop décrite mais inexistante fait échouer
>   `npm run build:props -- --strict`) ;
> - commentaires inline **en français, détaillés, à formulation nominale** — au
>   niveau de densité des composants du header (`SidebarSwitcher.jsx`,
>   `Tabs/Tab/Tab.scss`) : on explique le **pourquoi**, pas le **quoi** ;
> - **aucun** `useMemo` ni `useCallback` de performance : le React Compiler est
>   actif (`reactCompiler: true`) ;
> - `'use client'` **uniquement** là où l'architecture le prévoit ;
> - SCSS : jamais de `px` ni de `rem` en dur — toute valeur passe par une propriété
>   personnalisée dérivée de l'échelle de `styles/globals/typography.scss` par
>   `calc()`. Couleurs **toujours** en `hsl(var(--token))` ;
> - fichiers de couleurs : sélecteur `:root, [data-theme]`, **jamais** `:root` seul,
>   puis un bloc `[data-theme="dark"]` pour les surcharges ;
> - JSX : balises sémantiques explicites, aucun `<div>` de commodité, structure la
>   plus épurée possible ;
> - `@use` **relatifs** entre fichiers d'un même groupe de composants ; l'alias `@/`
>   n'est utilisé que pour `src/styles/**`.
>
> ⚠️ Lightning CSS supprime silencieusement une propriété `rotate:` autonome
> cohabitant avec `transform:` dans la même règle : n'écris jamais que `transform`.
>
> Publie le nouveau groupe dans le registry shadcn du dépôt.
>
> Lis d'abord l'en-tête de `scripts/build-registry.js` : la partie **mécanique** d'un
> item (`type`, `files`, `dependencies`, `registryDependencies`) est **générée** et
> écrasée ; seuls les champs **éditoriaux** (`title`, `description`, `categories`)
> sont préservés d'une exécution à l'autre. N'édite jamais les premiers à la main.
>
> Séquence :
>
> ```
> npm run build:inventory
> node scripts/build-registry.js --sync
> ```
>
> Puis, dans `registry/registry.json`, renseigne les champs éditoriaux de l'item
> `language-switcher` (ou du nom que l'inventaire lui donne) :
>
> - `title` : `Sélecteur de langue`
> - `description` : une phrase, dans le ton des autres items — bouton drapeau + code
>   pays, menu déroulant des langues suivant le motif ARIA listbox, navigable au
>   clavier, avec repli textuel quand le drapeau n'est pas joignable
> - `categories` : `["internationalisation"]`
>
> Termine par `npm run build:registry` (sans `--sync`), qui échoue si `registry.json`
> est périmé vis-à-vis de l'inventaire, puis émet `public/r/*.json` et
> `registry/__registry__.js`.
>
> **À signaler dans ton compte rendu** : `registry/inventory.json` datait du
> 2026-08-05 et ne contenait **aucune** unité `i18n` alors que `src/features/i18n/`
> existe — la feature a été livrée après la dernière génération. La régénération la
> fera apparaître, avec possiblement d'autres unités absentes. Liste ce qui apparaît
> en plus de `language-switcher` ; c'est attendu, mais le diff doit être compris et
> non subi.
>
> Vérifie enfin que l'item respecte l'invariant central du registry : **tout fichier
> porte un `target` explicite** et l'item est publié en `registry:item` (c'est ce qui
> le rend installable sans `components.json`).

---

# P8 — Documentation : playground, exemples, page

**Modèle : Sonnet** — rédaction et câblage, sur des gabarits existants.
**Mode plan : non.**

> Respecte `CLAUDE.md` et `LANGUAGE_SWITCHER_ARCHITECTURE.md` :
>
> - composants déclarés `const Name = ({ … }) => { … }` puis `export default Name;`
>   en **fin de fichier** — jamais `export default function` ;
> - docstrings **Google, en anglais**, avec des `@param` exacts (ils alimentent la
>   table des props générée : une prop décrite mais inexistante fait échouer
>   `npm run build:props -- --strict`) ;
> - commentaires inline **en français, détaillés, à formulation nominale** — au
>   niveau de densité des composants du header (`SidebarSwitcher.jsx`,
>   `Tabs/Tab/Tab.scss`) : on explique le **pourquoi**, pas le **quoi** ;
> - **aucun** `useMemo` ni `useCallback` de performance : le React Compiler est
>   actif (`reactCompiler: true`) ;
> - `'use client'` **uniquement** là où l'architecture le prévoit ;
> - SCSS : jamais de `px` ni de `rem` en dur — toute valeur passe par une propriété
>   personnalisée dérivée de l'échelle de `styles/globals/typography.scss` par
>   `calc()`. Couleurs **toujours** en `hsl(var(--token))` ;
> - fichiers de couleurs : sélecteur `:root, [data-theme]`, **jamais** `:root` seul,
>   puis un bloc `[data-theme="dark"]` pour les surcharges ;
> - JSX : balises sémantiques explicites, aucun `<div>` de commodité, structure la
>   plus épurée possible ;
> - `@use` **relatifs** entre fichiers d'un même groupe de composants ; l'alias `@/`
>   n'est utilisé que pour `src/styles/**`.
>
> ⚠️ Lightning CSS supprime silencieusement une propriété `rotate:` autonome
> cohabitant avec `transform:` dans la même règle : n'écris jamais que `transform`.
>
> Documente le composant selon le dispositif du dépôt : un **playground** (« que fait
> ce composant si je change ce paramètre ? »), des **exemples** figés (« à quoi
> ressemble l'usage canonique ? »), une **page** qui assemble les deux et porte la
> table des props générée.
>
> ### 1. `docs/playgrounds/language-switcher.jsx`
>
> Calque-toi sur `docs/playgrounds/tabs.jsx` (le cas le plus simple : les contrôles
> **sont** les props, donc pas de `toProps`). Le fichier exporte `controls`,
> `scaffold`, `hint` et un composant par défaut.
>
> Types de contrôles disponibles : `radio`, `select`, `boolean`, `text`, `number`,
> `color`.
>
> ```js
> export const controls = {
>     size:      { type: 'radio',   options: ['sm', 'md', 'lg'], label: 'Taille', default: 'md', row: 0 },
>     menuAlign: { type: 'radio',   options: ['left', 'right'],
>                  labels: { left: 'Gauche', right: 'Droite' }, label: 'Alignement du menu',
>                  default: 'left', row: 0 },
>     compact:   { type: 'boolean', label: 'Compact (drapeau seul)', default: false, row: 1 },
>     languageCount: { type: 'number', label: 'Nombre de langues', default: 8, min: 1, max: 8, row: 1 },
> };
> ```
>
> `languageCount` est une molette de **démonstration** et non une prop : liste-la
> dans `scaffold.omit` pour qu'elle agisse sur l'aperçu sans polluer le code généré.
> Le composant de rendu tronque `DEFAULT_LANGUAGES` à cette longueur — c'est ce qui
> permet de vérifier d'un coup d'œil le défilement du menu (`max-height: 280px`) et
> le cas d'une langue unique.
>
> `hint` : une phrase rappelant la navigation clavier (`↓` `↑` parcourent, `Début`
> et `Fin` sautent aux extrémités, `Échap` referme en rendant le focus au bouton).
>
> Ajoute la ligne correspondante dans `docs/playgrounds/index.js`, en respectant
> l'ordre alphabétique et la forme d'`import()` **littérale** (un chemin variable
> embarquerait tout le dossier dans chaque page).
>
> ### 2. `registry/examples/language-switcher-*.jsx`
>
> Cinq exemples, chacun avec un docblock en tête (titre, deux à quatre lignes de
> prose expliquant **ce que le cas démontre**, puis `@item language-switcher`) —
> même forme que `registry/examples/tabs-disabled.jsx`.
>
> | Fichier | Démontre |
> |---|---|
> | `language-switcher-basic.jsx` | l'usage nu : `<LanguageSwitcher />`, huit langues par défaut, mode non contrôlé |
> | `language-switcher-compact.jsx` | `compact` : bouton rond, drapeau seul — le cas des emplacements exigus |
> | `language-switcher-controlled.jsx` | mode contrôlé : `value` + `onChange` avec un état local, et un texte affichant la langue choisie |
> | `language-switcher-custom.jsx` | liste réduite à trois langues fournie en prop, avec `menuAlign="right"` — le cas d'un site trilingue |
> | `language-switcher-local-flags.jsx` | `flagSrc` réécrit vers des SVG auto-hébergés (`withBasePath('/flags/…')`), avec le repli textuel visible tant que les fichiers n'existent pas |
>
> Le dernier est **le plus utile des cinq** : il documente la couture qui permet de
> se passer de `flagcdn.com`. Dis-le explicitement dans son docblock, et signale que
> le repli textuel (code pays) est ce qui s'affiche tant que
> `public/flags/<iso2>.svg` n'est pas fourni.
>
> ### 3. `docs/content/composants/language-switcher.mdx`
>
> Frontmatter `title` / `description` / `order` (prends le numéro suivant : `stat-card`
> est à 1, `tabs` à 2). Structure :
>
> ```mdx
> # LanguageSwitcher
>
> <prose : à quoi sert le composant, et la distinction LanguageSwitcher (présentation)
>  / LocaleSwitcher (branché sur le routage) >
>
> ## Explorer les paramètres
> <ComponentPlayground name="language-switcher" />
>
> ## Cas d'usage
> <ComponentPreview name="language-switcher-basic" />
> … les quatre autres
>
> ## Ajouter ou retirer une langue
> <prose : les deux modes — prop `languages` en autonome ; `site.locales` +
>  `site.localeCountries` + dictionnaires en branché, avec renvoi à `npm run check:i18n` >
>
> ## Drapeaux
> <prose : la fonction `flagSrc`, le défaut flagcdn.com, le passage aux SVG locaux,
>  et le repli textuel purement CSS >
>
> ## Props
> <PropsTable name="LanguageSwitcher" />
> ```
>
> La prose est en français, dans le registre des autres pages de `docs/content/` —
> affirmatif, explicatif, sans emphase commerciale. Explique le **pourquoi** des
> décisions visibles par l'utilisateur, pas la liste des props (elle est générée).
>
> ### 4. Régénération et vérification
>
> ```
> npm run build:registry
> npm run build:props -- --strict
> npm run build:docs-index
> npm run lint
> ```
>
> ⚠️ `build:props -- --strict` **échoue** si une docstring décrit une prop qui
> n'existe pas ou annonce un défaut que le code contredit : c'est le contrôle qui
> valide rétroactivement le travail de P2 à P5. Corrige les docstrings, pas le script.
>
> ⚠️ Ajouter un `.mdx` exige de **relancer `npm run dev`** : `docs/__docs__.js` est
> généré une seule fois au démarrage.

---

# P9 — Vérification de bout en bout

**Modèle : Sonnet** — exécution de la chaîne existante et relecture.
**Mode plan : non.**

> Respecte `CLAUDE.md` et `LANGUAGE_SWITCHER_ARCHITECTURE.md` :
>
> - composants déclarés `const Name = ({ … }) => { … }` puis `export default Name;`
>   en **fin de fichier** — jamais `export default function` ;
> - docstrings **Google, en anglais**, avec des `@param` exacts (ils alimentent la
>   table des props générée : une prop décrite mais inexistante fait échouer
>   `npm run build:props -- --strict`) ;
> - commentaires inline **en français, détaillés, à formulation nominale** — au
>   niveau de densité des composants du header (`SidebarSwitcher.jsx`,
>   `Tabs/Tab/Tab.scss`) : on explique le **pourquoi**, pas le **quoi** ;
> - **aucun** `useMemo` ni `useCallback` de performance : le React Compiler est
>   actif (`reactCompiler: true`) ;
> - `'use client'` **uniquement** là où l'architecture le prévoit ;
> - SCSS : jamais de `px` ni de `rem` en dur — toute valeur passe par une propriété
>   personnalisée dérivée de l'échelle de `styles/globals/typography.scss` par
>   `calc()`. Couleurs **toujours** en `hsl(var(--token))` ;
> - fichiers de couleurs : sélecteur `:root, [data-theme]`, **jamais** `:root` seul,
>   puis un bloc `[data-theme="dark"]` pour les surcharges ;
> - JSX : balises sémantiques explicites, aucun `<div>` de commodité, structure la
>   plus épurée possible ;
> - `@use` **relatifs** entre fichiers d'un même groupe de composants ; l'alias `@/`
>   n'est utilisé que pour `src/styles/**`.
>
> ⚠️ Lightning CSS supprime silencieusement une propriété `rotate:` autonome
> cohabitant avec `transform:` dans la même règle : n'écris jamais que `transform`.
>
> Vérifie l'ensemble du chantier et rends compte, sans rien corriger silencieusement.
>
> ### 1. Chaîne automatisée
>
> ```
> npm run verify
> ```
>
> (`lint` + `test` + `check:palette` + `validate:config` + `check:gql` +
> `check:i18n --strict` + `build:registry` + `build:props --strict` +
> `build:docs-index` + `build:tokens --strict`)
>
> Puis, séparément :
>
> ```
> npx playwright test e2e/i18n.spec.ts
> ```
>
> Si un échec précède ce chantier (il en existe possiblement dans `inventory.json`,
> cf. P7), **distingue-le explicitement** d'une régression introduite ici.
>
> ### 2. Contrôle visuel
>
> Lance `npm run dev` (**sonde d'abord le port** : un serveur peut déjà tourner) et
> ouvre la page de documentation du composant. Vérifie, dans les **deux thèmes** — le
> cadre d'aperçu de la documentation a son propre bouton de bascule :
>
> | # | À vérifier |
> |---|---|
> | 1 | bouton fermé : drapeau rond, code pays, chevron **pointant à droite** |
> | 2 | à l'ouverture : chevron pivoté de 90°, bordure du bouton **inchangée** (cf. §5.1 de l'architecture — ce n'est pas un oubli) |
> | 3 | survol du bouton visible **dans les deux thèmes** (c'est la correction §5.2) |
> | 4 | menu : coche bleue et graisse renforcée sur la langue active, surbrillance distincte sur la ligne survolée |
> | 5 | trois tailles (`sm`/`md`/`lg`) : le bouton grandit proportionnellement, le drapeau des **options** reste à 20 px |
> | 6 | mode compact : bouton parfaitement **rond**, ni code ni chevron |
> | 7 | `menuAlign` : le menu se colle au bon bord |
> | 8 | huit langues : le menu défile au-delà de 280 px de hauteur |
> | 9 | clavier seul : `Tab` jusqu'au bouton, `↓` ouvre, `↓↑` parcourent **sans boucler**, `Entrée` sélectionne et **rend le focus au bouton**, `Échap` referme de même |
> | 10 | header de `/demo/fr` : le sélecteur change de langue **en restant sur la même page**, et `<html lang>` suit |
>
> ### 3. Contrôle du repli de drapeau
>
> Bloque `flagcdn.com` (onglet Réseau du navigateur, ou coupe le réseau) et recharge :
> chaque pastille doit afficher son **code pays** centré, sans image cassée, sans
> décalage de mise en page. C'est la vérification de la décision D4 — la seule qui ne
> puisse pas se faire par lecture de code.
>
> ### 4. Relecture de conformité
>
> Relis les fichiers produits contre les tables §5 et §6 de l'architecture et signale
> **toute** divergence, même mineure : classes CSS, tokens manquants ou en trop,
> valeurs qui ne dérivent pas de l'échelle, `'use client'` en trop, `useMemo` /
> `useCallback` réintroduits, SVG inline au lieu des composants d'icônes.
>
> Termine par une liste explicite de ce que tu **n'as pas pu** vérifier.
