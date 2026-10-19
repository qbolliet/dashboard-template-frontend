# LANGUAGE SWITCHER — Architecture

Portage du prototype `design-system/project/scripts/language-switcher.jsx` +
`design-system/project/styles/language-switcher.css` dans le dépôt, sous la forme
d'un groupe de composants de la feature `src/features/i18n/`.

Document de référence de l'implémentation. Les prompts d'exécution sont dans
[LANGUAGE_SWITCHER_PROMPTS.md](./LANGUAGE_SWITCHER_PROMPTS.md).

> **Note sur le bundle de design.** Le fichier `design-system/project/ds/language-switcher.html`
> mentionné dans la demande **n'existe pas** dans le bundle exporté : le dossier `ds/`
> a été élagué, seuls `index.html`, `scripts/` et `styles/` sont présents. Les deux
> sources de vérité sont donc `scripts/language-switcher.jsx` (structure JSX, ARIA,
> clavier) et `styles/language-switcher.css` (apparence, lue ligne à ligne ci-dessous).
> C'est suffisant : le HTML n'aurait fait que monter le composant dans la coquille du
> design system.

---

## 1. Objet

Un bouton compact affichant le **drapeau rond** de la langue active et son **code
pays ISO 2** (`FR`, `GB`…), suivi d'un chevron façon `<select>`. Au clic, un menu
déroulant liste les langues : drapeau à gauche, **nom de la langue dans sa propre
langue** à droite, coche à droite pour la langue active.

Deux usages, et c'est la décision structurante du document (§2.2) :

| Usage | Composant | Où |
|---|---|---|
| **Présentation pure**, autonome, installable seul depuis le registry | `<LanguageSwitcher>` | `src/features/i18n/components/LanguageSwitcher/` |
| **Branché** sur le routage de langue du site (`/demo/fr` ⇄ `/demo/en`) | `<LocaleSwitcher>` | `src/features/i18n/components/LocaleSwitcher/` |

Le second est un adaptateur d'une trentaine de lignes autour du premier. Il
**remplace** l'actuel `<select>` non dessiné de `LocaleSwitcher.jsx`, dont l'en-tête
annonce lui-même qu'il « n'est pas le sélecteur définitif du template ».

---

## 2. Décisions d'architecture

Chaque décision est numérotée : les prompts y renvoient.

### D1 — Emplacement : `src/features/i18n/`, pas une nouvelle feature

La demande dit « une nouvelle feature dans `src/features`, à l'image du
`ThemeToggleButton` ». Or `ThemeToggleButton` **n'est pas** une feature : c'est un
composant de la feature `theme`, qui possède aussi le provider (`ThemeProvider`) et
le hook (`useTheme`) dont il dépend.

L'analogue exact est donc `src/features/i18n/`, qui possède déjà `LocaleProvider` et
`useLocale`. Créer `src/features/language/` séparerait le sélecteur de la source de
vérité qu'il pilote, et donnerait deux features pour un seul sujet.

```
features/theme/                        features/i18n/
├── providers/ThemeProvider.js         ├── providers/LocaleProvider.jsx
├── hooks/useTheme.js                  ├── hooks/useLanguageMenu.js        ← nouveau
└── components/ThemeToggleButton/      ├── components/LanguageSwitcher/    ← nouveau
                                       ├── components/LocaleSwitcher/      ← réécrit
                                       └── components/LocaleRedirect/
```

### D2 — Séparation présentation / branchement

`<LanguageSwitcher>` ne connaît **ni** `src/i18n/`, **ni** `LocaleProvider`, **ni**
`next/navigation`. Il reçoit un tableau `languages`, une `value` et un `onChange`.

Raison — c'est une règle explicite de `CLAUDE.md` (§ `src/i18n/`) :

> Cette couche remplit les props `labels` des composants, **jamais l'inverse** : un
> composant ne lit pas le dictionnaire et n'importe jamais `src/i18n/`. C'est ce qui
> permet de l'installer seul depuis le registry.

Conséquence pratique : `npx shadcn add …/language-switcher` dans un projet tiers
installe un composant qui fonctionne sans aucune infrastructure d'i18n.

`<LocaleSwitcher>` fait la jonction : il lit `useLocale()`, construit le tableau
`languages` et appelle `setLocale`.

### D3 — Frontière client : **un seul** `'use client'` par arbre

| Fichier | `'use client'` | Pourquoi |
|---|:---:|---|
| `useLanguageMenu.js` | ✅ | hooks + `document.addEventListener` |
| `LanguageSwitcher.jsx` (racine) | ✅ | détient l'état, ouvre la frontière |
| `LanguageButton.jsx` | ❌ | présentation pure, aucun hook |
| `LanguageMenu.jsx` | ❌ | idem |
| `LanguageOption.jsx` | ❌ | idem |
| `FlagChip.jsx` | ❌ | idem (voir D4) |
| `LocaleSwitcher.jsx` | ✅ | consomme `useLocale()` |

La directive est **contagieuse par import** : tout module importé depuis un module
client entre dans le graphe client. La répéter dans les sous-composants n'apporte
rien et interdirait leur réutilisation éventuelle depuis un Server Component. C'est
la convention déjà en place dans le dépôt (`TabPanels.jsx`, `SidebarNode.jsx` n'ont
pas la directive).

### D4 — `FlagChip` sans état : le repli d'image passe en CSS

Le prototype gère l'échec de chargement du drapeau avec un état React :

```js
const [errored, setErrored] = useState(false);
… <img onError={() => setErrored(true)} /> : <span>{country}</span>
```

Cela force le composant à être client **et** à re-rendre. Le même résultat visuel
s'obtient sans une ligne de JavaScript : le repli textuel est **toujours rendu**,
posé dans la même cellule de grille que l'image, **sous** elle.

```jsx
<span className="lang-switch-flag" aria-hidden="true">
  <span className="lang-switch-flag-fallback">{country}</span>
  {src && <img src={src} alt="" loading="lazy" decoding="async" />}
</span>
```

```scss
.lang-switch-flag { display: inline-grid; place-items: center; }
.lang-switch-flag > * { grid-area: 1 / 1; }   // superposition, pas d'empilement
```

Une image dont le chargement échoue **et dont l'`alt` est vide** n'est pas peinte
par les navigateurs (elle est décorative, il n'y a rien à annoncer ni à dessiner) :
le repli, resté dessous, redevient visible tout seul. Aucun `onError`, aucun état,
aucun re-rendu — exactement l'interaction « rendue en CSS » demandée.

### D5 — Pas de détection `navigator.language` dans le composant

Le prototype initialise l'état non contrôlé avec `pickSystemLanguage(languages)`,
qui lit `navigator.languages`. **Interdit ici**, pour deux raisons cumulées :

1. **Divergence d'hydratation.** Le serveur rend `languages[0]`, le client rend la
   langue système : React signale un mismatch et remonte le sous-arbre. Le dépôt a
   déjà payé ce prix (cf. la garde `useSyncExternalStore` de `ThemeToggleButton`).
2. **Redondance.** La négociation système existe déjà, testée et partagée :
   `src/utils/i18n/negotiateLocale.js`, appelée par `src/app/(site)/demo/page.jsx`
   et par `examples/middleware.ts`. Une seconde implémentation dériverait.

Règle retenue : `defaultValue ?? languages[0]?.code`. La négociation reste le
travail du redirecteur d'entrée, la **mémorisation** celui de `LocaleProvider`
(`localStorage` + cookie `NEXT_LOCALE`), et la langue courante est **décidée par
l'URL**. `pickSystemLanguage` n'est **pas** porté.

### D6 — Drapeaux : une fonction `flagSrc` injectable

Le prototype construit `https://flagcdn.com/{iso2}.svg`. On conserve ce défaut
(apparence identique, zéro asset à produire) mais on l'expose comme **couture** :

```js
export const flagCdnSrc = (country) =>
  country ? `https://flagcdn.com/${country.toLowerCase()}.svg` : null;
```

`<LanguageSwitcher flagSrc={…}>` permet de basculer sur des SVG auto-hébergés sans
toucher au composant :

```jsx
<LanguageSwitcher flagSrc={(c) => withBasePath(`/flags/${c.toLowerCase()}.svg`)} />
```

**`<img>` natif, pas `next/image`.** Deux raisons : (a) l'URL par défaut est
distante, ce qui exigerait `images.remotePatterns` ; (b) sous `output: 'export'` +
`images.unoptimized`, `next/image` recopie le `src` **tel quel** sans y ajouter le
`basePath` (constaté et documenté dans `next.config.ts`) — un piège que `<img>` +
`withBasePath` évite frontalement. Le repli de D4 couvre de toute façon l'absence
de réseau.

### D7 — Le motif ARIA du prototype est conservé intégralement

C'est le motif APG « Collapsible Dropdown Listbox » : bouton
`aria-haspopup="listbox"` + `aria-expanded`, menu `role="listbox"` qui **prend le
focus DOM**, option active désignée par `aria-activedescendant` (et non par le
focus), `lang` sur chaque option.

Une variante « tout en CSS » à base de `<details>`/`<summary>` a été écartée : elle
ne sait pas exprimer `role="option"` + `aria-selected` + `aria-activedescendant`, ni
la navigation par flèches, ni la fermeture sur `Échap` avec retour du focus au
bouton. Le gain (supprimer ~60 lignes de JS déjà écrites) ne compense pas la perte
d'accessibilité sur un contrôle qui, par définition, sert à des lecteurs qui ne
lisent pas la langue affichée. Ce qui **peut** passer en CSS y passe : rotation du
chevron, survol, focus, repli de drapeau (D4).

### D8 — Cascade de tokens en quatre niveaux

Conforme à `DESIGN_SYSTEM.md` et calquée sur le groupe `Tabs` (le modèle le plus
récent du dépôt) :

```
styles/globals/primitives/colors.scss        --color-gray-100…
styles/globals/tokens/semantic-colors.scss   --color-surface, --color-border…
LanguageSwitcher/_tokens.scss + _colors.scss  tokens PARTAGÉS du groupe
LanguageSwitcher/<Sous-composant>/_tokens.scss + _colors.scss   tokens PROPRES
```

Règle d'affectation, à appliquer sans exception : **un token utilisé par deux
sous-composants ou plus monte à la racine du groupe ; un token utilisé par un seul
reste chez lui.** Le détail est en §6.

### D9 — Libellés : `DEFAULT_LABELS` + `mergeLabels`

Comme tous les composants traduisibles du dépôt (`Header`, `ThemeToggleButton`,
`SelectMenu`) : une constante de **module** en français, une prop `labels`
partielle, fusionnées par `mergeLabels` (qui refuse toute surcharge vide, garantie
qu'aucun `aria-label` ne devient muet). Les trous dynamiques sont des **gabarits**
`{…}` interpolés par `interpolate` — jamais des fonctions, qui ne traverseraient pas
la frontière de sérialisation serveur → client.

### D10 — Ajouter ou supprimer une langue : un tableau, trois gestes

**Usage autonome** — un élément dans la prop `languages` :

```jsx
<LanguageSwitcher languages={[
  { code: 'fr', country: 'FR', name: 'Français' },
  { code: 'ja', country: 'JP', name: '日本語' },
]} />
```

**Usage branché sur le site** — la liste est dérivée de la configuration, donc
d'un seul endroit. Le geste devient :

1. le code dans `site.locales` de `config/site.config.json` ;
2. **son drapeau** dans le nouvel objet `site.localeCountries` du même fichier ;
3. `src/i18n/dictionaries/<code>.js` + `localeSwitcher.names.<code>` dans **tous**
   les dictionnaires ;
4. les gestes déjà documentés dans `src/i18n/config.js` (branche du `switch` de
   `getDictionary`, entrée dans `FORMATS`).

`npm run check:i18n` liste ce qui manque, `npm run validate:config` valide le
schéma. Le point 2 est le seul ajout de ce chantier ; il est **facultatif** —
`countryForLocale()` retombe sur la sous-étiquette de région (`pt-BR` → `BR`) puis
sur la langue en majuscules (`fr` → `FR`).

---

## 3. Arborescence

```
src/features/i18n/
├── components/
│   ├── LanguageSwitcher/                     ← LE GROUPE (nouveau)
│   │   ├── LanguageSwitcher/
│   │   │   ├── LanguageSwitcher.jsx          'use client' — racine, état, ARIA
│   │   │   ├── LanguageSwitcher.scss
│   │   │   └── _tokens.scss                  paliers de taille (sm/md/lg)
│   │   ├── LanguageButton/
│   │   │   ├── LanguageButton.jsx            drapeau + code + chevron
│   │   │   ├── LanguageButton.scss
│   │   │   ├── _tokens.scss
│   │   │   └── _colors.scss
│   │   ├── LanguageMenu/
│   │   │   ├── LanguageMenu.jsx              <ul role="listbox">
│   │   │   ├── LanguageMenu.scss
│   │   │   └── _tokens.scss                  (aucune couleur propre — cf. §6.3)
│   │   ├── LanguageOption/
│   │   │   ├── LanguageOption.jsx            <li role="option">
│   │   │   ├── LanguageOption.scss
│   │   │   ├── _tokens.scss
│   │   │   └── _colors.scss
│   │   ├── FlagChip/
│   │   │   ├── FlagChip.jsx                  pastille ronde + repli CSS
│   │   │   ├── FlagChip.scss
│   │   │   ├── _tokens.scss
│   │   │   └── _colors.scss
│   │   ├── languages.js                      DEFAULT_LANGUAGES, flagCdnSrc
│   │   ├── index.js                          baril du groupe
│   │   ├── _tokens.scss                      tokens PARTAGÉS du groupe
│   │   └── _colors.scss                      couleurs PARTAGÉES du groupe
│   ├── LocaleSwitcher/
│   │   ├── LocaleSwitcher.jsx                RÉÉCRIT — adaptateur useLocale()
│   │   └── LocaleSwitcher.scss               RÉDUIT — cf. §7.1
│   └── LocaleRedirect/                       inchangé
├── hooks/
│   └── useLanguageMenu.js                    'use client' — NOUVEAU
└── providers/LocaleProvider.jsx              inchangé
```

Fichiers **hors** de la feature qui bougent :

| Fichier | Nature du changement |
|---|---|
| `src/i18n/config.js` | + `LOCALE_COUNTRIES`, + `countryForLocale()` |
| `config/site.config.json` | + `site.localeCountries` |
| `config/schema/site.schema.json` | + la propriété correspondante (`additionalProperties: false`) |
| `src/i18n/dictionaries/{fr,en}.js` | + `localeSwitcher.button` / `.list` |
| `e2e/i18n.spec.ts` | `selectOption('#locale-switcher')` → clic sur l'option |
| `registry/registry.json` | + item `language-switcher` |
| `docs/playgrounds/{index.js,language-switcher.jsx}` | + playground |
| `registry/examples/language-switcher-*.jsx` | + 5 exemples |
| `docs/content/composants/language-switcher.mdx` | + page |

**Aucun** fichier de `src/components/`, `src/features/header/` ou
`src/page-templates/` n'est modifié : `<Header>` expose déjà une prop `actions`
prévue pour ce composant (« This is the slot a language switcher goes into »).

---

## 4. Signature des composants

Convention de déclaration imposée partout : `const Name = ({ … }) => { … }` puis
`export default Name;` en fin de fichier. Docstring **Google en anglais**,
commentaires inline **en français, détaillés, à formulation nominale**.

### 4.1 `<LanguageSwitcher>` — racine

`src/features/i18n/components/LanguageSwitcher/LanguageSwitcher/LanguageSwitcher.jsx`
· `'use client'`

| Prop | Type | Défaut | Rôle |
|---|---|---|---|
| `languages` | `Array<{code, country, name}>` | `DEFAULT_LANGUAGES` | Langues proposées. `code` = code langue (attribut `lang`, valeur remontée), `country` = ISO 3166-1 alpha-2 (drapeau + badge), `name` = nom **natif** de la langue. |
| `value` | `string` | — | Langue active. **Sa présence** fait passer en mode contrôlé. |
| `defaultValue` | `string` | `languages[0]?.code` | Langue active au départ, mode non contrôlé. |
| `onChange` | `(code: string) => void` | — | Appelé à chaque sélection, dans les deux modes. |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Diamètre du drapeau, donc hauteur du bouton (dérivée). |
| `compact` | `boolean` | `false` | Bouton rond, drapeau seul : ni code, ni chevron. |
| `menuAlign` | `'left' \| 'right'` | `'left'` | Bord du bouton sur lequel le menu s'aligne. |
| `flagSrc` | `(country: string) => string \| null` | `flagCdnSrc` | Résolution de l'URL du drapeau (D6). |
| `labels` | `{button, list}` | `DEFAULT_LABELS` | Libellés ARIA, fusionnés par `mergeLabels`. |
| `className` | `string` | — | Classes additionnelles sur la racine. |
| `style` | `Object` | — | Styles inline sur la racine. |

État interne (via `useLanguageMenu`) : `open`, `activeIndex`, et la valeur non
contrôlée. Aucun autre.

Rendu :

```jsx
<section ref={rootRef} className={classes} style={style}>
    <LanguageButton
        ref={buttonRef}
        language={current}
        open={open}
        compact={compact}
        listId={listId}
        flagSrc={flagSrc}
        label={current ? interpolate(labels.button, { language: current.name }) : labels.button}
        onClick={toggleMenu}
        onKeyDown={onButtonKeyDown} />

    {open && (
        <LanguageMenu
            ref={listRef}
            id={listId}
            align={menuAlign}
            label={labels.list}
            activeDescendantId={`${listId}-opt-${activeIndex}`}
            onKeyDown={onListKeyDown}>
            {languages.map((language, index) => (
                <LanguageOption
                    key={language.code}
                    id={`${listId}-opt-${index}`}
                    language={language}
                    flagSrc={flagSrc}
                    selected={language.code === value}
                    active={index === activeIndex}
                    onHover={() => setActiveIndex(index)}
                    onSelect={() => selectIndex(index)} />
            ))}
        </LanguageMenu>
    )}
</section>
```

**Pourquoi `<section>` et non `<div>`.** La racine n'est qu'un contexte de
positionnement, mais elle groupe deux éléments solidaires (le déclencheur et sa
liste). `<span>` est exclu : il n'accepte que du contenu de phrasé, or `<ul>` est du
contenu de flux — le HTML serait invalide. `<section>` est ce qu'utilise déjà
`<Tabs>` pour le même besoin, et sans nom accessible il n'est pas exposé comme
région : aucun bruit ajouté dans l'arbre d'accessibilité.

`listId` vient de `useId()` : stable entre SSR et hydratation, unique même avec
plusieurs instances sur la page.

### 4.2 `<LanguageButton>` — déclencheur

`…/LanguageButton/LanguageButton.jsx` · **pas** de `'use client'`

| Prop | Type | Défaut | Rôle |
|---|---|---|---|
| `language` | `{code, country, name}` | — | Langue active (peut être `undefined` si `languages` est vide). |
| `open` | `boolean` | `false` | Alimente `aria-expanded` **et** la rotation CSS du chevron. |
| `compact` | `boolean` | `false` | Masque code et chevron. |
| `listId` | `string` | — | Id du menu, pour `aria-controls`. |
| `label` | `string` | — | `aria-label` **déjà interpolé** par le parent. |
| `flagSrc` | `Function` | — | Transmis à `<FlagChip>`. |
| `onClick` | `() => void` | — | Bascule d'ouverture. |
| `onKeyDown` | `(e) => void` | — | Ouverture au clavier (↓ ↑ Entrée Espace). |
| `ref` | `React.Ref<HTMLButtonElement>` | — | Retour du focus après `Échap`/sélection. |

> **React 19 : `ref` est une prop ordinaire.** Ne **pas** utiliser `forwardRef`.
> Il est déclaré dans la déstructuration comme n'importe quelle autre prop. Le
> `forwardRef` de `TopbarToggleButton` est antérieur et n'est pas un modèle à suivre.

```jsx
<button
    ref={ref}
    type="button"
    className="lang-switch-btn"
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={open ? listId : undefined}
    aria-label={label}
    onClick={onClick}
    onKeyDown={onKeyDown}>
    <FlagChip country={language?.country} flagSrc={flagSrc} />
    {!compact && <data className="lang-switch-code" value={language?.code}>{language?.country}</data>}
    {!compact && <ChevronIcon direction="right" className="lang-switch-chevron" />}
</button>
```

Deux points à ne pas rater :

- **`<data>` et non `<span>`** pour le badge : l'élément affiche le pays (`GB`) et
  porte la valeur machine, le code langue (`en`). C'est précisément le rôle de
  `<data>`, et c'est la balise explicite que le prototype n'avait pas.
- **`aria-controls` conditionné à `open`** : le prototype le pose en permanence, ce
  qui référence un id absent du DOM tant que le menu est fermé — une erreur
  d'accessibilité. `SidebarSwitcher.jsx` du dépôt fait déjà le conditionnement.

### 4.3 `<LanguageMenu>` — la liste

`…/LanguageMenu/LanguageMenu.jsx` · **pas** de `'use client'`

| Prop | Type | Rôle |
|---|---|---|
| `id` | `string` | Cible de l'`aria-controls` du bouton. |
| `align` | `'left' \| 'right'` | Modificateur de classe d'alignement. |
| `label` | `string` | `aria-label` de la liste. |
| `activeDescendantId` | `string` | Id de l'option active (`aria-activedescendant`). |
| `onKeyDown` | `(e) => void` | Navigation clavier, fournie par le hook. |
| `children` | `React.ReactNode` | Les `<LanguageOption>`. |
| `ref` | `React.Ref<HTMLUListElement>` | Le hook y pose le focus à l'ouverture. |

```jsx
<ul
    ref={ref}
    id={id}
    role="listbox"
    tabIndex={-1}
    className={`lang-switch-menu lang-switch-menu--${align}`}
    aria-label={label}
    aria-activedescendant={activeDescendantId}
    onKeyDown={onKeyDown}>
    {children}
</ul>
```

Le `<ul>` **est** le panneau : c'est lui qui porte fond, bordure, ombre et
défilement. Aucun conteneur intermédiaire — convention déjà actée pour la
navigation du header (« dropdown panel = the ul »).

### 4.4 `<LanguageOption>` — une langue

`…/LanguageOption/LanguageOption.jsx` · **pas** de `'use client'`

| Prop | Type | Rôle |
|---|---|---|
| `id` | `string` | Cible possible de `aria-activedescendant`. |
| `language` | `{code, country, name}` | La langue décrite. |
| `selected` | `boolean` | Langue **active du site** → `aria-selected` + coche. |
| `active` | `boolean` | Langue **survolée / sous le curseur clavier** → surbrillance. |
| `flagSrc` | `Function` | Transmis à `<FlagChip>`. |
| `onSelect` | `() => void` | Clic. |
| `onHover` | `() => void` | Synchronise le curseur clavier sur la souris. |

```jsx
<li
    id={id}
    role="option"
    lang={language.code}
    aria-selected={selected}
    className={`lang-switch-option${active ? ' lang-switch-option--active' : ''}`}
    onMouseEnter={onHover}
    onClick={onSelect}>
    <FlagChip country={language.country} className="lang-switch-option-flag" flagSrc={flagSrc} />
    <span className="lang-switch-option-name">{language.name}</span>
    {selected && <CheckIcon className="lang-switch-check" strokeWidth={2.5} />}
</li>
```

`selected` et `active` sont **deux états distincts** et ne doivent pas être
fusionnés : la langue active reste en gras avec sa coche pendant que le curseur
clavier parcourt les autres. L'attribut `lang` fait prononcer « Español » avec la
phonétique espagnole au lieu de la phonétique de la page.

### 4.5 `<FlagChip>` — pastille de drapeau

`…/FlagChip/FlagChip.jsx` · **pas** de `'use client'`, **aucun hook**

| Prop | Type | Rôle |
|---|---|---|
| `country` | `string` | Code ISO 3166-1 alpha-2. Sert au repli textuel. |
| `flagSrc` | `(country) => string \| null` | Résolution de l'URL. |
| `className` | `string` | Classe additionnelle (le contexte « option » y réduit le diamètre). |

Structure et repli : cf. D4. `aria-hidden="true"` sur la pastille — le nom de la
langue est déjà porté par le texte de l'option et par l'`aria-label` du bouton ;
annoncer « drapeau du Royaume-Uni » en plus serait redondant, et faux (un drapeau
n'est pas une langue).

**Le prototype passait un `size` à `FlagChip` qui n'était branché sur rien** : le
CSS ne définit jamais `.lang-switch-flag--sm/md/lg`, le diamètre vient de
`--ls-flag` posé sur la racine. La prop est donc supprimée ; le diamètre réduit des
options passe par un token réassigné dans le contexte `.lang-switch-option`.

### 4.6 `useLanguageMenu` — la mécanique

`src/features/i18n/hooks/useLanguageMenu.js` · `'use client'`

```js
const {
  value, open, activeIndex,
  rootRef, buttonRef, listRef,
  openMenu, closeMenu, toggleMenu, selectIndex, setActiveIndex,
  onButtonKeyDown, onListKeyDown,
} = useLanguageMenu({ languages, value, defaultValue, onChange });
```

| Entrée | Rôle |
|---|---|
| `languages` | Pour les bornes de navigation et la résolution d'index. |
| `value` | Mode contrôlé si `!== undefined`. |
| `defaultValue` | Amorce du mode non contrôlé. |
| `onChange` | Notifié à chaque sélection. |

Trois effets, et **rien d'autre** :

1. **Clic extérieur** — `mousedown` sur `document`, monté **seulement quand
   `open`**, démonté à la fermeture. Dépendance : `[open]`.
2. **Focus du menu à l'ouverture** — `listRef.current?.focus()`. Dépendance :
   `[open]`. C'est ce qui rend `aria-activedescendant` opérant : le focus DOM reste
   sur la liste, seul l'attribut se déplace.
3. Aucun troisième.

> **Pas de `useCallback`, pas de `useMemo`.** Le React Compiler est actif
> (`reactCompiler: true`). Les fonctions retournées sont de simples `const`. La
> seule identité stable qui compte ici est celle du gestionnaire passé à
> `addEventListener` — elle est garantie par le fait qu'il est **créé dans l'effet**,
> pas par une mémoïsation.

Clavier, à implémenter à l'identique du prototype :

| Contexte | Touche | Effet |
|---|---|---|
| Bouton | `↓` `↑` `Entrée` `Espace` | Ouvre, curseur sur la langue active |
| Liste | `↓` / `↑` | Déplace le curseur (**bornage, pas de boucle**) |
| Liste | `Début` / `Fin` | Première / dernière langue |
| Liste | `Entrée` / `Espace` | Sélectionne, ferme, focus au bouton |
| Liste | `Échap` | Ferme, focus au bouton |
| Liste | `Tab` | Ferme **sans** `preventDefault` (la tabulation suit son cours) |

Le bornage (`Math.min` / `Math.max`) est volontaire : il diverge de
`useKeyboardNavigation` (`loop: true` par défaut) du dépôt, qui n'est donc **pas**
réutilisé ici. Cette divergence est celle du prototype et doit être préservée —
elle est aussi la recommandation APG pour un listbox court.

### 4.7 `<LocaleSwitcher>` — l'adaptateur

`src/features/i18n/components/LocaleSwitcher/LocaleSwitcher.jsx` · `'use client'`

| Prop | Type | Défaut | Rôle |
|---|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Transmis tel quel. |
| `compact` | `boolean` | `false` | Transmis tel quel. |
| `menuAlign` | `'left' \| 'right'` | `'right'` | **Défaut différent** : dans le header, le contrôle est collé au bord droit ; un menu aligné à gauche déborderait de la fenêtre. |

```jsx
const LocaleSwitcher = ({ size = 'md', compact = false, menuAlign = 'right' }) => {
    const { locale, locales, dictionary, setLocale } = useLocale();
    const labels = dictionary.localeSwitcher;

    // Descripteurs dérivés de la configuration : ajouter une langue au manifeste
    // suffit à la faire apparaître ici (cf. D10). Repli sur le code brut quand le
    // nom manque — la langue reste sélectionnable, `npm run check:i18n` signale le trou.
    const languages = locales.map((code) => ({
        code,
        country: countryForLocale(code),
        name: labels.names[code] ?? code,
    }));

    return (
        <LanguageSwitcher
            languages={languages}
            value={locale}
            onChange={setLocale}
            size={size}
            compact={compact}
            menuAlign={menuAlign}
            labels={{ button: labels.button, list: labels.list }} />
    );
};
```

**Mode contrôlé obligatoire** : la langue est décidée par l'URL, pas par un état
client. `value={locale}` + `onChange={setLocale}` ; jamais `defaultValue`.

### 4.8 `languages.js`

```js
/** @type {Array<{code: string, country: string, name: string}>} */
export const DEFAULT_LANGUAGES = [
  { code: 'fr', country: 'FR', name: 'Français' },
  { code: 'en', country: 'GB', name: 'English'  },
  { code: 'es', country: 'ES', name: 'Español'  },
  { code: 'de', country: 'DE', name: 'Deutsch'  },
  { code: 'it', country: 'IT', name: 'Italiano' },
  { code: 'pt', country: 'PT', name: 'Português'},
  { code: 'nl', country: 'NL', name: 'Nederlands' },
  { code: 'ja', country: 'JP', name: '日本語'    },
];

export const flagCdnSrc = (country) => …;
```

Liste reprise **à l'identique** du prototype, ordre compris.

### 4.9 `src/i18n/config.js` — ajouts

```js
/** @type {Object<string, string>} */
export const LOCALE_COUNTRIES = siteConfig.site.localeCountries ?? {};

/**
 * Resolves the flag country of a locale code.
 * @param {string} code - Locale code, e.g. 'fr' or 'pt-BR'.
 * @returns {string} ISO 3166-1 alpha-2 country code.
 */
export const countryForLocale = (code) => { … };
```

Résolution en trois passes : (1) `LOCALE_COUNTRIES[code]` ; (2) sous-étiquette de
région si présente (`pt-BR` → `BR`) ; (3) langue en majuscules (`fr` → `FR`).
`en` → `GB` **exige** donc une entrée explicite dans `localeCountries` : `EN` n'est
pas un pays et `flagcdn.com` renverrait un 404 — que D4 rattrape visuellement, mais
autant ne pas déclencher la requête.

---

## 5. Correspondance prototype → implémentation

Table de vérification ligne à ligne de `styles/language-switcher.css`. Toute
divergence non listée ici est une **régression**.

| Sélecteur du prototype | Fichier cible | Devient |
|---|---|---|
| `.lang-switch` | `LanguageSwitcher.scss` | `position: relative; display: inline-block;` + `--lang-switch-flag-size` selon le modificateur de taille |
| `.lang-switch--sm/--lg` | `LanguageSwitcher.scss` | réassignation de `--lang-switch-flag-size` |
| `.lang-switch-btn` | `LanguageButton.scss` | identique, valeurs → tokens |
| `.lang-switch-btn:hover` | `LanguageButton.scss` | identique (**+ surcharge sombre**, §5.2) |
| `.lang-switch-btn:focus-visible` | `LanguageButton.scss` | identique |
| `.lang-switch--compact .lang-switch-btn` | `LanguageButton.scss` | via `.lang-switch--compact &` |
| `.lang-switch-code` | `LanguageButton.scss` | s'applique à `<data>` |
| `.lang-switch-chevron` | `LanguageButton.scss` | 13px, `--color-text-tertiary` |
| `…[aria-expanded="true"] .lang-switch-chevron` | `LanguageButton.scss` | `transform: rotate(90deg)` |
| `.lang-switch-flag` | `FlagChip.scss` | + `> * { grid-area: 1/1 }` (D4) |
| `.lang-switch-flag img` | `FlagChip.scss` | identique |
| `.lang-switch-flag-fallback` | `FlagChip.scss` | identique |
| `.lang-switch-option .lang-switch-flag` | `LanguageOption.scss` | réassigne `--lang-switch-flag-size` à 20px |
| `.lang-switch-menu` | `LanguageMenu.scss` | identique, `z-index: 50` → `var(--z-dropdown)` |
| `.lang-switch-menu--left/--right` | `LanguageMenu.scss` | identique |
| `.lang-switch-option` | `LanguageOption.scss` | identique |
| `.lang-switch-option.is-active` | `LanguageOption.scss` | → `.lang-switch-option--active` |
| `.lang-switch-option:hover` | `LanguageOption.scss` | identique |
| `.lang-switch-option[aria-selected="true"]` | `LanguageOption.scss` | identique |
| `.lang-switch-option-name` | `LanguageOption.scss` | identique |
| `.lang-switch-check` | `LanguageOption.scss` | 14px, `--color-primary-500` |

### 5.1 Règles mortes du prototype — à ne pas ressusciter

Deux sélecteurs du CSS ne s'appliquaient **jamais**, parce qu'ils visent
`aria-expanded` sur `.lang-switch` (la racine `<div>`), alors que l'attribut est
porté par le `<button>` :

```css
.lang-switch[aria-expanded="true"] .lang-switch-btn { border-color: …; }
.lang-switch[aria-expanded="true"] .lang-switch-chevron { transform: rotate(90deg); }
```

L'apparence réellement obtenue est donc : **le chevron pivote** (via le second
sélecteur du même bloc, `.lang-switch-btn[aria-expanded="true"] .lang-switch-chevron`,
qui lui s'applique), **la bordure du bouton ne change pas à l'ouverture**.

C'est cette apparence-là qui est portée, conformément à la consigne « ne pas
modifier l'apparence ». Si le changement de bordure à l'ouverture était l'intention,
c'est une modification à demander explicitement ; elle tient alors en une ligne :
`.lang-switch-btn[aria-expanded="true"] { border-color: hsl(var(--lang-switch-border-hover)); }`.

### 5.2 Deux corrections de thème sombre

Le prototype a été dessiné en thème clair. Deux valeurs y sont invisibles en sombre,
parce que l'échelle de gris est **inversée** dans `primitives/colors.scss` :

| Règle | Problème en sombre | Correction |
|---|---|---|
| `.lang-switch-btn:hover { background: --color-gray-50 }` | En sombre `--color-surface: var(--color-gray-50)` : le survol vaut **exactement** le fond au repos → survol invisible | `[data-theme="dark"] { --lang-switch-btn-bg-hover: var(--color-gray-200); }` |
| `.lang-switch-flag { box-shadow: inset … hsl(var(--color-gray-900) / .08) }` | **Aucun** | `--color-gray-900` s'inverse tout seul (`220 39% 11%` → `210 40% 96%`) : l'anneau devient clair sans surcharge. Ne **pas** ajouter de bloc sombre. |

`--lang-switch-option-hover-bg: var(--color-gray-100)` reste tel quel : en sombre,
gris-100 (11 % de clarté) se détache bien de la surface du menu (7 %).

Le décalage d'un cran des fonds interactifs en sombre est la convention du dépôt,
déjà appliquée par `SelectMenu/_colors.scss` et `ThemeToggleButton/_colors.scss`.

### 5.3 Icônes : rien à créer

Les deux tracés SVG du prototype existent **au caractère près** dans le dépôt :

| Prototype | Composant existant |
|---|---|
| `<path d="m9 6 6 6-6 6" />` | `<ChevronIcon direction="right" />` (`PATHS.right`) |
| `<path d="M20 6 9 17l-5-5" />` (`strokeWidth="2.5"`) | `<CheckIcon strokeWidth={2.5} />` |

Les deux posent déjà `fill="none" stroke="currentColor" strokeLinecap="round"
strokeLinejoin="round" aria-hidden="true"`. Aucun SVG inline dans le JSX.

---

## 6. Tokens

Nommage : préfixe `--lang-switch-*` pour tout le groupe (§ *Scope naming* de
`CLAUDE.md`). Toutes les valeurs hors échelle sont **dérivées par `calc()`** de
l'échelle d'espacement, jamais écrites en pixels bruts — sauf les trois exceptions
signalées, qui portent leur commentaire.

### 6.1 `LanguageSwitcher/_tokens.scss` — partagés (`:root`)

| Token | Valeur | Prototype |
|---|---|---|
| `--lang-switch-flag-size-sm` | `18px` | `--ls-flag` en `--sm` |
| `--lang-switch-flag-size-md` | `22px` | `--ls-flag` par défaut |
| `--lang-switch-flag-size-lg` | `26px` | `--ls-flag` en `--lg` |
| `--lang-switch-flag-size` | `var(--lang-switch-flag-size-md)` | valeur **courante**, réassignée par `.lang-switch--sm/--lg` et par `.lang-switch-option` |
| `--lang-switch-gap` | `calc(var(--spacing-xs) + var(--spacing-2px))` | `gap: 6px` |
| `--lang-switch-transition` | `var(--transition-fast)` | `var(--transition-fast) ease` |

`--lang-switch-flag-size` est **le pilote unique** de l'échelle : la hauteur du
bouton, sa largeur en mode compact et le diamètre de la pastille en dérivent par
`calc()`. Trois paliers exposés séparément pour rester modifiables sans toucher au
SCSS.

### 6.2 `LanguageSwitcher/_colors.scss` — partagées

| Token | Valeur | Utilisé par |
|---|---|---|
| `--lang-switch-surface` | `var(--color-surface)` | bouton **et** menu |
| `--lang-switch-border` | `var(--color-border)` | bouton **et** menu |
| `--lang-switch-focus` | `var(--color-focus)` | anneau de focus du bouton |

Aucun bloc `[data-theme="dark"]` : les trois tokens sémantiques se réévaluent seuls.

**Rappel de cascade** — le sélecteur des fichiers de couleurs est
`:root, [data-theme]` (jamais `:root` seul). C'est ce qui rend un thème local
scopable, et c'est ce dont dépend le cadre d'aperçu de la documentation
(`PreviewFrame`). Le bloc sombre reste `[data-theme="dark"]`, après.

### 6.3 Par sous-composant

**`LanguageButton/_tokens.scss`**

| Token | Valeur | Prototype |
|---|---|---|
| `--lang-switch-btn-padding-x` | `calc(var(--spacing-xs) + var(--spacing-px))` | `0 5px` |
| `--lang-switch-btn-border-width` | `1px` | `1px solid` |
| `--lang-switch-btn-radius` | `var(--border-radius-pill)` | `999px` |
| `--lang-switch-code-font-size` | `var(--font-size-xs)` | `var(--font-size-xs)` |
| `--lang-switch-code-font-weight` | `600` | `600` |
| `--lang-switch-chevron-size` | `calc(var(--spacing-md) + var(--spacing-px))` | `13px` |
| `--lang-switch-chevron-rotation` | `90deg` | `rotate(90deg)` |
| `--lang-switch-btn-focus-ring-width` | `2px` | `outline: 2px` |
| `--lang-switch-btn-focus-ring-offset` | `1px` | `outline-offset: 1px` |

**Pas de token dédié pour la hauteur du bouton.** `height` (non compact) et `width`
(compact) portent directement `calc(var(--lang-switch-flag-size) + var(--spacing-md))`
dans `LanguageButton.scss`, sans passer par une variable intermédiaire. Une propriété
personnalisée héritée transmet sa valeur **déjà calculée** à l'élément qui la déclare,
pas son expression à réévaluer plus bas dans l'arbre : un `--lang-switch-btn-height`
défini une seule fois sur `:root` figerait `--lang-switch-flag-size` à sa valeur `md`
vue depuis `:root`, sourd aux réassignations `sm`/`lg` de `LanguageSwitcher.scss`
pourtant portées par un ANCÊTRE du bouton — régression constatée (le bouton restait à
34px en `sm` comme en `lg`, seul le drapeau changeait de diamètre, débordant du bouton
compact en `lg`). C'est le même piège que `:root, [data-theme]` corrige pour les
couleurs (§6.2), mais sans second sélecteur de thème à ajouter ici : la seule parade
est d'écrire le `calc()` là où il est consommé, pas dans un token séparé.

`--border-radius-pill` (999px) et **non** `--border-radius-full` (50 %) : `full` est
un pourcentage, correct sur le bouton compact (carré) mais produirait une ellipse
sur le bouton large. Le commentaire de `typography.scss` le dit explicitement.

**`LanguageButton/_colors.scss`**

| Token | Clair | Sombre |
|---|---|---|
| `--lang-switch-btn-bg-hover` | `var(--color-gray-50)` | `var(--color-gray-200)` (§5.2) |
| `--lang-switch-btn-border-hover` | `var(--color-border-hover)` | — |
| `--lang-switch-code-color` | `var(--color-text-primary)` | — |
| `--lang-switch-chevron-color` | `var(--color-text-tertiary)` | — |

**`LanguageMenu/_tokens.scss`** — pas de `_colors.scss` : le menu n'utilise que
`--lang-switch-surface` et `--lang-switch-border`, partagés avec le bouton.

| Token | Valeur | Prototype |
|---|---|---|
| `--lang-switch-menu-offset` | `var(--spacing-sm)` | `top: calc(100% + 8px)` |
| `--lang-switch-menu-min-width` | `190px` | `min-width: 190px` |
| `--lang-switch-menu-max-height` | `280px` | `max-height: 280px` |
| `--lang-switch-menu-padding` | `var(--spacing-xs)` | `var(--spacing-xs)` |
| `--lang-switch-menu-radius` | `var(--border-radius-lg)` | idem |
| `--lang-switch-menu-shadow` | `var(--shadow-lg)` | idem |
| `--lang-switch-menu-z-index` | `var(--z-dropdown)` | `z-index: 50` |

`min-width`/`max-height` restent en pixels : ce sont des **bornes de gabarit**
(largeur minimale d'un nom de langue, hauteur au-delà de laquelle la liste défile),
pas des multiples de l'échelle d'espacement. Même statut que
`--nav-drawer-width: 280px` dans `header/_tokens.scss`.

**`LanguageOption/_tokens.scss`**

| Token | Valeur | Prototype |
|---|---|---|
| `--lang-switch-option-padding-y` | `calc(var(--spacing-sm) - var(--spacing-px))` | `7px` |
| `--lang-switch-option-padding-x` | `var(--spacing-sm)` | `var(--spacing-sm)` |
| `--lang-switch-option-gap` | `var(--spacing-sm)` | idem |
| `--lang-switch-option-radius` | `var(--border-radius-md)` | idem |
| `--lang-switch-option-font-size` | `var(--font-size-sm)` | idem |
| `--lang-switch-option-font-weight-selected` | `600` | `600` |
| `--lang-switch-option-flag-size` | `var(--spacing-xl)` | `20px` |
| `--lang-switch-check-size` | `var(--font-size-sm)` | `14px` |

**`LanguageOption/_colors.scss`**

| Token | Clair | Sombre |
|---|---|---|
| `--lang-switch-option-color` | `var(--color-text-secondary)` | — |
| `--lang-switch-option-hover-bg` | `var(--color-gray-100)` | — (§5.2) |
| `--lang-switch-option-hover-color` | `var(--color-text-primary)` | — |
| `--lang-switch-option-selected-color` | `var(--color-text-primary)` | — |
| `--lang-switch-check-color` | `var(--color-primary-500)` | — |

**`FlagChip/_tokens.scss`**

| Token | Valeur | Prototype |
|---|---|---|
| `--lang-switch-flag-radius` | `var(--border-radius-full)` | `50%` (forme carrée → cercle) |
| `--lang-switch-flag-ring-width` | `1px` | `inset 0 0 0 1px` |
| `--lang-switch-flag-fallback-font-size` | `0.5rem` | `8px` — **exception documentée**, hors échelle typographique (même statut que `--select-option-padding-y: 0.45rem`) |
| `--lang-switch-flag-fallback-font-weight` | `700` | `700` |

**`FlagChip/_colors.scss`**

| Token | Valeur |
|---|---|
| `--lang-switch-flag-bg` | `var(--color-gray-100)` |
| `--lang-switch-flag-ring` | `var(--color-gray-900)` — appliqué à `0.08` d'alpha, s'inverse seul en sombre (§5.2) |
| `--lang-switch-flag-fallback-color` | `var(--color-text-tertiary)` |

### 6.4 Ordre des `@use`

Chaque `.scss` de sous-composant, dans cet ordre exact (modèle : `Tabs/Tab/Tab.scss`) :

```scss
@use '../tokens' as *;   // Tokens partagés du groupe
@use '../colors' as *;   // Couleurs partagées du groupe
@use './tokens' as *;    // Tokens propres
@use './colors' as *;    // Couleurs propres (quand le fichier existe)
```

⚠️ **Piège de résolution SCSS** : ces chemins sont **relatifs**, jamais aliasés en
`@/`. Seuls les chemins vers `src/styles/**` utilisent l'alias.

---

## 7. Intégration

### 7.1 Header et layout

`src/app/(site)/demo/[locale]/layout.jsx` reste **inchangé** : il passe déjà
`actions={<LocaleSwitcher />}` à `<Header>`. C'est l'intérêt de garder le nom
`LocaleSwitcher` pour l'adaptateur.

`LocaleSwitcher.scss` : le fichier actuel style un `<select>` qui disparaît. Il est
**vidé** — ne subsiste que l'alignement vertical du contrôle dans la barre
d'actions, si nécessaire. Le nouveau composant se dimensionne seul ; il n'a pas à
s'aligner sur `--header-control-size` (le bouton fait `22 + 12 = 34px` en `md`,
contre 36px pour la recherche : proche, et voulu par le design).

### 7.2 Dictionnaires

Deux clés à ajouter dans `localeSwitcher`, dans **tous** les dictionnaires :

```js
localeSwitcher: {
    label: 'Langue',                    // conservé (repli, et usage hors bouton)
    button: 'Changer de langue — {language}',
    list:   'Langues disponibles',
    names:  { fr: 'Français', en: 'English' },
},
```

Le gabarit `{language}` doit être présent **dans chaque traduction** : `check:i18n`
compare les trous entre langues et échoue en `--strict` si l'un manque.

### 7.3 Registry

Un item `language-switcher`, `type: "registry:block"` (comme `theme`), dépendances
de registry : `icons`, `tokens-global`, `utils-i18n`… selon ce que
`build-inventory.js` détecte. **La partie mécanique est générée** :

```
npm run build:inventory
node scripts/build-registry.js --sync     # écrase type/files/dependencies
                                          # préserve title/description/categories
npm run build:registry
```

Ne **jamais** éditer à la main les champs mécaniques de `registry/registry.json` :
la commande sans `--sync` échoue si le fichier est périmé vis-à-vis de l'inventaire.

> **À vérifier au passage** : `registry/inventory.json` date du 2026-08-05 et ne
> contient **aucune** unité `i18n`, alors que `src/features/i18n/` existe. La feature
> a été livrée après la dernière génération. `npm run build:inventory` la fera
> apparaître — c'est attendu, ce n'est pas une régression de ce chantier.

### 7.4 Documentation

Trois artefacts, selon le dispositif du §5.2 de `TEMPLATIZATION_ARCHITECTURE.md` :

| Artefact | Fichier | Répond à |
|---|---|---|
| Playground | `docs/playgrounds/language-switcher.jsx` + ligne dans `index.js` | « que fait ce composant si je change ce paramètre ? » |
| Exemples | `registry/examples/language-switcher-*.jsx` | « à quoi ressemble l'usage canonique ? » |
| Page | `docs/content/composants/language-switcher.mdx` | la prose et la table des props |

La table des props est **générée** par `scripts/build-props-doc.js` en croisant la
signature déstructurée et les `@param`. Elle échoue en `--strict` si une docstring
décrit une prop inexistante ou annonce un défaut que le code contredit — d'où
l'exigence que les `@param` soient exacts au caractère près.

⚠️ Ajouter un `.mdx` ou éditer son frontmatter **exige de relancer `npm run dev`** :
`docs/__docs__.js` est généré une fois au démarrage.

### 7.5 Tests

- **e2e** — `e2e/i18n.spec.ts:81` fait `page.selectOption('#locale-switcher', 'en')`.
  Le `<select>` disparaît : remplacer par ouverture du bouton puis clic sur
  l'option, en ciblant les **rôles** (`getByRole('button', …)` puis
  `getByRole('option', { name: 'English' })`), jamais les classes CSS.
- **unitaire** — un `useLanguageMenu.test.js` (Vitest + Testing Library) est
  souhaitable : bornage des flèches, `Échap` rend le focus, mode contrôlé
  n'écrit pas l'état interne. Non bloquant.

---

## 8. Écarts assumés vis-à-vis du prototype

Récapitulatif, pour relecture rapide.

| # | Écart | Justification |
|---|---|---|
| 1 | `pickSystemLanguage` non porté | D5 — hydratation + doublon de `negotiateLocale` |
| 2 | `FlagChip` sans `useState` | D4 — repli CSS, composant purement présentatif |
| 3 | Prop `size` de `FlagChip` supprimée | §4.5 — elle n'était branchée sur aucun CSS |
| 4 | `aria-controls` conditionné à `open` | §4.2 — le prototype référence un id absent |
| 5 | `is-active` → `lang-switch-option--active` | convention BEM du dépôt ; apparence inchangée |
| 6 | `z-index: 50` → `var(--z-dropdown)` | échelle unique du dépôt ; superposition inchangée |
| 7 | `<div>` racine → `<section>` ; `<span>` code → `<data>` | balises explicites demandées |
| 8 | Survol du bouton corrigé en sombre | §5.2 — invisible sinon |
| 9 | Chevron et coche = composants d'icônes existants | §5.3 — tracés identiques |
| 10 | Deux règles CSS mortes non ressuscitées | §5.1 — l'apparence rendue fait foi |

---

## 9. Points de vigilance

Pièges déjà rencontrés dans ce dépôt, qui s'appliquent ici.

1. **Lightning CSS supprime `rotate:` autonome.** Mélanger `rotate: 90deg;` et
   `transform: …;` dans une même règle fait **perdre silencieusement** le `rotate`
   au build. Le chevron doit s'écrire `transform: rotate(var(--lang-switch-chevron-rotation));`
   et rien d'autre.
2. **`:root, [data-theme]`, jamais `:root` seul** dans les `_colors.scss` (§6.2).
3. **`@use` relatifs** dans les fichiers de composants (§6.4).
4. **ESLint `react-hooks` v6** est strict : pas de `setState` dans un effet de
   synchronisation de prop, pas de compteur au niveau module. `useId()` couvre le
   besoin d'identifiant.
5. **Pas de `useMemo`/`useCallback` de performance** — React Compiler actif.
6. **`npm run build` type-checke tout `.tsx` égaré**, et un cache `.next` périmé
   casse le build : `rm -rf .next` avant de conclure à une régression.
7. **Ne pas écrire de regex ni de JSX via un heredoc `cat <<'EOF'`** : les antislashs
   sont corrompus. Passer par les outils d'écriture de fichier.
