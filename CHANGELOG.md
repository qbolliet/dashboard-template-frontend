# Changelog

All notable changes to this template are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/) as
scoped for a distribute-by-copy template — see [CONTRIBUTING.md](./CONTRIBUTING.md#versioning)
for what counts as a breaking change here. Because most users install by
copying a snapshot (*Use this template*) or pulling individual pieces from
the [registry](./CONTRIBUTING.md#adding-a-component-to-the-registry) rather
than tracking git history, this file is the only record of what changed
since the copy they took.

## [Unreleased]

### Breaking

- **`<Globe>` — layer API aligned on `<Chart>`.** `points` and `arcs` now each take a
  layer spec, a "mini-Chart": `{ data, mark, hue, z, labels, format }` (plus `fill`,
  `pulse` and `icon` for points). An array alone is still accepted as a shorthand for
  `{ data }`, so `<Globe points={rows} arcs={flows} />` keeps working. The flat props of
  the earlier entries below (`arcHue`, `arcVariant`, `pointVariant`, `pointSize`,
  `pointPulse`, `labels`) are gone, with no alias:

  | Before | After |
  |---|---|
  | `pointVariant="badge" \| "dot"` | `points.mark = 'badge' \| 'bubble'` (the sober dot is a bubble without `hue` or `z`) |
  | `pointSize="key"` | `points.z = 'key'` |
  | `pointSize={12}` (px) | removed: `--globe-marker-size` / `--globe-marker-dot-size` tokens |
  | `pointPulse` | `points.pulse` (default: on for a badge, off for a bubble) |
  | `iconFor` | `points.icon` (badge only) |
  | `colorFor` | removed: `points.hue[0]` — precompute a categorical column to color by thresholds |
  | `tooltipFor` | removed: structured tooltip of `<Chart>`, toggled by the `tooltips` tool |
  | `arcVariant` | `arcs.mark` |
  | `arcHue` | `arcs.hue` |
  | `arc.value` ∈ [0, 1] | `arcs.z = 'key'`, any scale (divided by the largest value) |
  | `labels.color` / `labels.style` (flows) | `arcs.labels.color` / `arcs.labels.style` |
  | `labels.size` | `points.labels.z` |

  New in the same move: `points.hue` on bubbles encodes color, style (hatch when filled,
  dashed outline with `fill: 'line'`) and marker shape with the grammar of
  `<BubbleMarks>` — badges take `hue[0]` as color; both layers share `GLOBE_PALETTE`
  (PALETTE minus its blue hues) without collision: the flow colors continue after the
  point categories, and a category found in both layers keeps one color. One `ChannelLegend` per layer; hovering an item
  emphasizes the matching points (new engine method `setPointHighlight`) or flows.
  `title` (figure caption and accessible name, as on `<Chart>`), `fields` and
  `format.z` (formatting of `z` in the tooltip and the size legend, same precedence as
  `<Chart>`). The tooltip is now the chart's, rendered by React: the engine only reports
  the hovered target (`onHover`, on change) and moves the host element, so no data is
  injected as HTML any more — the badge icon is the only trusted HTML left. The
  `globe.flowIntensity` UI label is gone. New registry examples `globe-bubble-hue` and
  `globe-hero`; the others are migrated. Engine options renamed accordingly
  (`arcMark`, `pointMark`, `pointRatioFor`, `arcRatioFor`, `point*For` accessors).
- **`ChartTooltip` promoted to `src/components/tooltip/DataTooltip/`** (second consumer:
  the globe), with an optional `subtitle` and an optional `position` (without it the
  host positions the bubble). Classes `.chart-tooltip*` → `.data-tooltip*`, tokens
  `--chart-tooltip-*` → `--data-tooltip-*`. `GlobeTooltip` (HTML templates and their
  styles) is removed.
- **Shared encoding and toolbar primitives.** `hatchScale`, `markerScale`, `HATCH_TYPES`
  and `MARKER_TYPES` moved from `src/features/chart/utils/encoding.js` to
  `src/utils/encoding/scales.js` (still re-exported by `@/features/chart`); `fieldOf`
  and `typeFromField` to `src/utils/format/fields.js` (still re-exported by
  `fieldTypes.js`). New `tooltipTool()` factory in `src/components/toolbar/tools.js` and
  `TooltipIcon`, shared by the chart and globe toolbars; `ToolIcon.Tooltip` and
  `GlobeToolIcon.tip` are removed. `ChannelLegend` accepts a `className`.

### Added

- **`<MultiCriterionMenu dependentValues>` — slider bounds follow the other criteria.** In a
  multi-criterion menu, the slider track of a numeric or date card now spans the values the
  OTHER criteria still reach: the card is replaced by TRUE in the whole expression, which is
  then simplified with AND before OR (`A AND B` → bounded by B; `A OR B` → whole column;
  `A AND B OR D` → bounded by `B OR D`). Computed on the debounced criteria, by the new pure
  `scopeWithout(criteria, excludedId, { dateOrder })` of `filterEngine`. Only the track
  moves: the "out of bounds" validation, the calendar's selectable days and the step stay on
  the whole column, so editing one card never invalidates another. `dependentValues` defaults
  to `true`; `false` restores whole-column bounds, and the prop will govern the categorical
  menus' options too. New pass-through props: `CriterionMenu` `valuesScope`, `ValueField` /
  `ConstraintField` `trackScope` (track only, unlike `scopeFilters`). Nothing changes outside
  the multi-criterion menu: a standalone `CriterionMenu`, the table filters and a standalone
  `ConstraintField` keep whole-column (or `scopeFilters`) bounds. `buildTree` leaves now
  carry the card's `id` when given.

- **`<Chart zMark="bubble">` — the third dimension as bubble size.** With a numeric `z`,
  `zMark` (`'density'` by default, rendering unchanged) can be set to `'bubble'`: one marker
  per row (per cell × hue series on two categorical axes) centered on (x, y), its AREA
  proportional to z; z ≤ 0 or null draws nothing, and a message replaces the plot when no
  z is positive. A single new kind `'bubble'` (`detectChart`) and mark
  (`marks/BubbleMarks/`); zoom, brush and minimaps follow the kind it replaces
  (`layoutKindOf`), bubble sizes never change with the zoom. New `SizeLegend`, tokens
  `--chart-bubble-max-radius`, `--chart-marks-bubble-*`, `--chart-size-legend-*`,
  `--chart-empty-message-color`, and the `chart.noPositiveZ` UI label. `planAggregation` /
  `useAggregatedChart` take `zMark`: categorical × categorical bubbles are aggregated by the
  API grouped by x, y and the hue columns. New registry example `chart-bubble`.
  `aggregationMode` now accepts `xType` / `yType` (needed for `'bubble'` only).

- **`<Globe arcHue>`: flow color and line style from hue keys.** `arcHue: string | string[]`
  names keys of the `arcs` objects. `arcHue[0]` picks the stroke color and `arcHue[1]` the
  dash style, with the same scales as `<Chart>`. The colors come from the categorical
  palette minus its three blue hues (navy, steel blue, slate), which blend into the ocean, so
  a category may not get the same color on a chart and on the globe. The chart's channel
  legend is shown beside the globe, laid out like on `<Chart>`: on the right by default, above
  it in expanded mode (new `expand` toolbar tool, `defaults.expanded`), and above it whenever
  the frame would get narrower than `--globe-frame-min-width` (22rem). Its titles come from
  `labels: { color?, style? }` (default: the key name), and hovering one of its items
  emphasizes the matching flows (new engine method `setArcHighlight`). The arc tooltip lists
  the hue values of the flow. New UI labels `globe.expand`, `globe.collapse`,
  `globe.noLegendToMove` and `globe.legend`, new registry example `globe-arc-hue`, and the demo
  `GLOBE_ARCS` gain `mode` / `kind` columns. Without `arcHue`, rendering keeps a single
  `--globe-arc` color.

- **`<Globe arcVariant>`: arrows, undirected lines or a decorative glow.** `'arrow'` (default)
  draws the arrows described below. `'line'` draws the same stroke without a head, for flows
  with no direction. `'glow'` keeps the look from before the arrows: a thin additive stroke
  (new token `--globe-arc-glow-width`, 1 px) growing brighter towards the destination, whose
  brightness follows `value`, with a bright comet when animated. Hue colors and dashes apply
  to all three. New registry examples `globe-undirected-flows` and `globe-glow-flows`.

- **`<Globe pointVariant pointPulse pointSize>`: point look and size.** `pointVariant`
  (`'badge'` by default, the current badge with its ring and the `iconFor` icon, or `'dot'`,
  a plain disc with a thin border and no icon) and `pointPulse` (the animated halo, `true` by
  default) combine into four looks. `pointSize` takes a diameter in px for every point, or the
  key of a numeric value: each point's AREA is then proportional to it, like the bubbles of
  `<Chart zMark="bubble">`, the largest one reaching the new `--globe-marker-max-size` token
  (34 px), and a point without a positive value is not drawn. A size legend (the chart's
  `SizeLegend`, titled by `labels.size`) then joins the legend, its values formatted in the
  new `locale` prop. New token `--globe-marker-dot-size` (10 px, default diameter of a dot),
  new registry example `globe-sober-points`.

### Changed

- **Globe flows are arrows by default.** The 1 px additive lines become solid ribbons of
  constant on-screen width with an arrow head at the destination, in both globe and flat-map
  modes (the former look remains available as `arcVariant="glow"`). The head stops at the edge
  of the destination badge (its `sizeFor` diameter, or `--globe-marker-size`) rather than
  vanishing under it, and the atmosphere glow is now drawn beneath the flows. `value` now
  drives the stroke width between the new `--globe-arc-width-min` / `--globe-arc-width-max`
  tokens (1.5 to 4 px, their mean when absent) instead of the opacity. The head size and the
  opacities are tokens too (`--globe-arc-head-length`, `--globe-arc-head-width`,
  `--globe-arc-opacity`, `--globe-arc-dimmed-opacity`, all in
  `src/features/globe/_tokens.scss`). On hover the arrow thickens and the other ones fade.

- **Flatter globe flows.** The arc height is now proportional to the chord between its
  endpoints (20 to 30 % of it, depending on `value`) instead of starting at 0.14 globe radius:
  short flows such as Paris–Frankfurt no longer loop high above the map, and flows leaving the
  same hub no longer tangle. On the flat map the height is also lifted less (×0.8 instead of
  ×1.7), so flows bend about half as much as on the globe. Long flows keep their height.

- **Globe flows now start static** (visible default change, formerly `defaultArcsDynamic`,
  now `defaults.arcsDynamic`, which defaults to `false`). The toolbar button still animates
  them. Pass `defaults={{ arcsDynamic: true }}` to restore the previous behaviour. The
  animation is now a plain opacity modulation along the stroke.

- **Palette and line-style scales promoted to `src/utils/encoding/scales.js`.** `PALETTE`,
  `SEQUENTIAL`, `LINE_STYLES`, `colorScale`, `styleScale` and `distinctVals` moved out of
  `src/features/chart/utils/encoding.js`, since the globe is a second consumer.
  `@/features/chart` still re-exports them, so its public API is unchanged. Code that imported
  them from `@/features/chart/utils/encoding` directly must import them from
  `@/utils/encoding/scales` instead. `npm run check:palette` now reads the new file.
  `colorScale` takes an optional second argument, the colors to cycle through. Likewise,
  `D3_SYMBOL` and `markerPath` moved to `src/utils/encoding/markers.js`.

- **Chart channel legend promoted to `src/components/legend/`.** `ChannelLegend` and
  `LegendGlyph` moved out of `src/features/chart/components/ChartLegend/`, since the globe
  is a second consumer (new registry units `channel-legend`, `legend-glyph`, `legend-tokens`).
  Rendering is unchanged, but the classes and tokens lose their `chart-` prefix:
  `.chart-legend*` becomes `.legend*` and `--chart-legend-*` becomes `--legend-*` (in
  `src/components/legend/_tokens.scss` and `_colors.scss`), also for `SequentialLegend`,
  `SizeLegend` and `MultiLegend`. Only `--chart-legend-right-*` and the `.chart-legend-top` /
  `.chart-legend-right` frame areas keep their names. Overrides of the old tokens must be
  renamed.

- **`<Globe>` API aligned on `<Chart>` (breaking).** Migration:
  - the seven `default*` props become one `defaults` object keyed like the toolbar tools:
    `defaultMode` → `defaults.mode`, `defaultAutoRotate` → `defaults.rotate`,
    `defaultWheelZoom` → `defaults.wheelZoom`, `defaultShowPoints` → `defaults.points`,
    `defaultShowArcs` → `defaults.arcs`, `defaultTooltips` → `defaults.tooltips`,
    `defaultArcsDynamic` → `defaults.arcsDynamic`, plus the new `defaults.expanded`;
  - the interface wording moves from `labels` to `uiLabels`, and `labels` now titles the
    data (`{ color, style, size }`), replacing `arcHueLabels`. The `globe.flowsLegend` UI
    label becomes `globe.legend`;
  - `sizeFor` is removed: use `pointSize` (a number of px, or a key for an area proportional
    to a value). The demo accessor `pointSize` of `sources/demoData.js` is removed and
    `GLOBE_ARC_HUE_LABELS` becomes `GLOBE_LABELS`;
  - the `toolbar` keys gain `'expand'`, in a fourth group of its own (greyed out when there
    is no legend).

- **`<Globe>` markup.** The root `<figure>` now has the `globe` class and lays out the frame
  and the legend; the `.globe-frame` panel (border, space background, `height`) is a `<div>`
  inside it. A `className` passed to `<Globe>` still lands on the root.

- **Shared toolbar tool `expandTool`** (`src/components/toolbar/tools.js`), used by the chart
  and the globe, with the new `ExpandIcon` / `CompressIcon` icons; the chart's `Expand` /
  `Compress` entries of `ToolIcon` are gone. Rendering unchanged.

- **`SizeLegend`, `useCssLength` and `measureText` promoted.** `SizeLegend` moved to
  `src/components/legend/SizeLegend/` (new registry unit `size-legend`) with its reference
  values (`bubbleLegendValues` of `utils/bubble.js` becomes `sizeLegendValues`),
  `useCssLength` to `src/hooks/cssLength/` (`hooks-css-length`) and `measureText` to
  `src/utils/text/` (`utils-text`; the chart's `utils/measureText.js` re-exports it). The
  size legend classes and tokens lose their `chart-` prefix (`.chart-size-legend*` →
  `.legend-size*`, `--chart-size-legend-stroke(-width)` → `--legend-size-stroke(-width)`),
  and the scale values of the sequential and size legends share `--legend-value-font-size` /
  `--legend-value-color` (formerly `--chart-seq-scale-font-size` / `--chart-seq-scale-color`).

- **Chart dodge geometry shared.** Violins and bubbles dodge their series through
  `utils/dodge.js` (`dodgeScale`, `dodgeSlot`); rendering unchanged.

- **`LanguageSwitcher` flags fall back local file → flagcdn.com → country code.** `flagSrc`
  may now return `string | string[] | null`; `<FlagChip>` tries each candidate on load
  failure. The new default `defaultFlagSrc` returns `[/flags/<iso2>.svg, flagcdn.com URL]`.
  A single-string `flagSrc` behaves as before. The eight `public/flags/*.svg` now ship with
  the `language-switcher` registry unit; the `language-switcher-local-flags` example became
  "remote flags only" (`flagSrc={flagCdnSrc}`).

## [0.2.0] - 2026-10-20

This release moves the template onto the **0.3.0 contract of the API**
(`dashboard-template-api`) and contains breaking changes for anyone who
copied the template, or installed registry items, before it. Read
[Breaking](#breaking) and [Migrating from 0.1.0](#migrating-from-010) first.

### Breaking

Grouped by the step of the API migration that introduced them (F1 to F7).

- **F1 — pinned schema.** `scripts/schema.graphql` is now a generated copy of
  the API's SDL, written by `npm run sync:schema` from the release pinned in
  `PINNED_REF` (`scripts/sync-schema.js`), never edited by hand. It replaces
  the hand-maintained copy; `npm run check:gql` and the mock server
  (`npm run mock:api`) read it, so a stale copy now fails `verify` instead of
  passing silently.
- **F2 — metadata, types, operations, headers.**
  - Field metadata is `camelCase`: `sql_type`, `is_categorical`,
    `is_primary_key` became `sqlType`, `isCategorical`, `isPrimaryKey`;
    `python_type` is gone. New fields: `typeFamily`, `filterOperations`, `unit`,
    `displayFormat`, `labelFor`, `labelFields`, `parentName`,
    `defaultAggregation`.
  - Components route on the **type family** (`INTEGER`, `NUMBER`, `DATE`,
    `TIMESTAMP`, `TEXT`, `BOOLEAN`, `OTHER`), never on the SQL type. Criteria
    carry `typeFamily` / `isCategorical` instead of `sql_type` /
    `is_categorical`; the per-SQL-type operation tables are removed from
    `filterTypes.js`.
  - Filter operations are the API's `FilterOperation` enum values, **upper
    case** (`EQ`, `GTE`, `BETWEEN`, `IN`, `BEFORE`…). A lower-case starting
    criterion (`'between'`) is no longer recognised.
  - `config/filter/operations.json` holds **labels only**, keyed by enum value
    (a string, or a `{ fr, en }` map). It used to list the operations offered
    per SQL type; that list now comes from each column's `filterOperations`,
    narrowed to what its input widget can edit (`resolveOperations`).
  - `CriterionMenu` / `MultiCriterionMenu`: the `operationsByType` prop is
    replaced by `operationLabels`.
  - The GraphQL transport no longer sends `X-Catalog-Id` / `X-Schema-Id`:
    `catalog` and `schema` are query arguments only, and `request(document,
    variables)` loses its third `headers` argument. The API's CORS does not
    allow those headers; sending them failed the browser preflight.
  - Documents changed: `getCatalogSchema` and `getFactTableWithMetadata` select
    the new `Metadata` fields, and `getFactTableWithMetadata` returns `fields`
    next to `columns`, so `useFactTableWithMetadata` makes one request instead
    of two parallel ones.
- **F3 — filtering is done by the API.** The dashboard filter is sent as a
  `FilterNode` (`structuredFilters`) built by `toFilterNode`, and the table's
  column filters as `IN` leaves (`columnCriteria`, combined by `andNodes`).
  `getFactTableWithMetadata` takes `structuredFilters`; the client-side
  `evalFilterNode` is no longer used on API data (it still filters static
  `data`). Copied query snippets match the table's real request and carry no
  `Authorization` header — the API has no authentication.
- **F4 — options, bounds, totals.** `getGroupedSelectOptions` no longer exists:
  grouped menus use `getSelectOptionsTree`, and the grouped mode is deduced
  from `Metadata.parentName` (`groupField` only forces it). Slider bounds
  (`useRangeBounds`) and the page indicators read `getFieldStats`;
  `metadata.extents` only covers the current page. Row totals use
  `metadata.total`, not `count`. The two shared field hooks (`useFieldMetadata`,
  `useFieldStats`) live in `src/hooks/`.
- **F5 — exports.** Backed by the API (remote table mode with
  `NEXT_PUBLIC_API_URL` or `queryHint.apiBase`), the CSV and Parquet buttons
  download the whole filtered dataset through `/api/export` instead of the
  loaded rows. Without the API, CSV exports the loaded rows and the Parquet
  button is hidden unless `onExportParquet` is given.
- **F6 — one source of types and formats.** `<Chart>` takes `fields` and types
  each described column from its `typeFamily` (value sampling is skipped for it);
  axes and tooltips follow `displayFormat` and `unit`. `<Table>` formats numeric
  cells the same way and gains `codeLabels`. A single formatter
  (`src/utils/format/formatValue.js`) serves both. Charts no longer need a
  hand-written `format={{ y: '.1f' }}`.
- **F7 — server-side aggregates.** Grouping charts (bars, horizontal bars,
  heatmap, lines) are drawn from `getAggregates` over the whole filtered dataset,
  with each measure's `defaultAggregation`, instead of from the loaded page of
  rows. On raw rows, grouped marks reduce with `defaultAggregation` and use the
  mean when it is missing — before, always the mean. `<Chart>` gains `aggregate`
  (data already aggregated: never re-aggregate); `useAggregatedChart` /
  `useAggregates` fetch and map the result.

### Migrating from 0.1.0

For a repository created from the template (*Use this template*) before this
release. Work on a clean tree and review each diff.

1. **Take the contract first.** Run `npm run sync:schema`, then
   `npm run check:gql`: it lists every GraphQL document that no longer
   compiles. Take `scripts/sync-schema.js` and `scripts/schema.graphql` as they
   are.
2. **Documents and transports.** Replace `src/lib/api/documents/` and
   `src/lib/api/transports/` (graphql, mock, `mockResolvers.js`) and
   `src/lib/api/fixtures/`, and update `src/lib/api/client.js` (`request` takes
   no headers). If you added documents or fixtures of your own, rename their
   fields to `camelCase`, drop the headers, and give your fixtures `typeFamily`
   and `filterOperations` (`fixtures/metadata.js` replays the server's
   derivation).
3. **Filter module.** Take `src/features/filter/utils/filterTypes.js`,
   `filterEngine.js`, `sources/useVariableMetadata.js` and the two menus, and
   replace `config/filter/operations.json` — if you customised its wording, move
   your labels onto the enum keys (`EQ`, `GT`, `BETWEEN`…); the per-SQL-type
   lists are dropped.
4. **Data hooks and components.** Take `src/features/chart/`,
   `src/features/table/`, `src/hooks/` and `src/utils/format/`, and
   `src/components/filter/` (`SelectMenu`, `ConstraintField`).
5. **Your own code.** `operationsByType={…}` → `operationLabels={…}`;
   `sql_type` / `is_categorical` → `typeFamily` / `isCategorical`; lower-case
   operations → upper case in initial criteria and `defaultFilter` seeds; remove
   `evalFilterNode` filtering of API rows and pass `structuredFilters` to the
   hooks; pass `fields` to `<Chart>` and drop the `format` you wrote only to
   format a measure; call `getSelectOptionsTree` instead of
   `getGroupedSelectOptions`.
6. **Registry installs.** Re-run `npx shadcn add …/r/<item>.json` for `filter`,
   `table`, `chart` and `api-client` on a clean tree, and review the diff.
7. Run `npm run verify`.

The full walkthrough, with the before/after table, is in *Brancher l'API
GraphQL → Migrer depuis la version précédente*
(`docs/content/guides/api-graphql.mdx`).

### Added

- **API pinning** — `npm run sync:schema` and the `API_SCHEMA_REF` /
  `API_SCHEMA_PATH` / `API_SCHEMA_REPO` variables, documented in the API guide.
- **Aggregates and statistics** — `getAggregates` (`useAggregates`,
  `useAggregatedChart`), `getFieldStats` (`useFieldStats`) and
  `getSelectOptionsTree` documents, with mock resolvers that also run behind
  `npm run mock:api`.
- **Table** — remote mode (`columnFilters` / `onColumnFiltersChange`), full
  dataset export, `codeLabels`.
- **Registry examples** — `table-code-labels` and `chart-aggregated`; `table-api`
  shows the remote mode and the full export, `chart-api` the `fields` path.
- **Documentation** — the *Chart*, *Table*, *Filter* and *Page indicateur* pages
  are written (they were placeholders).
- **Language switcher** — `LanguageSwitcher`, a flag button opening a listbox
  of languages (ARIA *Collapsible Dropdown Listbox*: arrows, Home/End, Escape
  returning focus to the button). It knows nothing about the site's i18n —
  languages, current value and labels arrive as props — so it installs alone
  from the registry (`language-switcher`). Its flag image falls back to the
  country code when it fails to load. The header mounts it through
  `LocaleSwitcher`, an adapter that maps `site.locales`, the current
  dictionary and a path-preserving navigation onto those props. No label or
  `aria-*` string is hardcoded in French any more: the remaining ones were
  moved to the dictionaries (`npm run check:i18n` lists what is missing).
- **Eject** — `npm run eject` detaches a repository created from the template
  from its documentation: the manifest-driven application is lifted from
  `/demo` to the root and the whole documentation surface is removed
  (`--keep-docs` keeps it under `/docs`, reduced to a skeleton; `--dry-run`
  previews). It also removes what only concerns the template (changelog,
  contributing guide, work notes), requires a clean git tree, runs every
  replacement as a dry pass first and fails loudly when an expected string has
  disappeared. A CI job (`eject`) runs it on a copy, then lints, tests and
  builds the result. See `docs/content/introduction/installation.mdx`.
- **Search** — navigation nodes accept an optional `keywords` list in
  `config/site.config.json`: terms a page must be found under without them
  appearing on screen (acronyms, former names, another trade's vocabulary).
  Plain array for terms that don't translate, locale map otherwise — the same
  duality as `name` and `description`.
- **Search** — suggestions now show the page's breadcrumb next to its title,
  so pages that share a name (three "GDP" under three countries) are told
  apart at a glance.

### Changed

- **Navigation** — the layout (horizontal top bar or collapsible sidebar) is
  derived from the depth of the navigation tree, and an internal node can be
  either a link or a folder.
- **Pages** — the per-URL page modules became `src/page-templates/`: one
  template per manifest node `type`, registered in `src/config/pageTypes.js`.
- **Next.js 16** — dependency update; the dev server was made to start
  reliably and the Windows path pitfalls are documented.
- **Search** — the matcher went from one contiguous substring in one field to
  all query terms, each matched by word prefix, each in whichever field suits
  it: "gdp france" now finds the page, which it could not before. Fields are
  weighted (title > keywords > breadcrumb > description) and results ranked by
  score, then by tree depth. Elision and hyphens are handled by tokenisation
  (`l'emploi`, `Bouches-du-Rhône`), on top of the existing case and diacritics
  folding.
- **Search index** — entries gained `breadcrumb` (ancestor labels) and a
  populated `keywords`; `flattenNavigation` now returns `ancestors` alongside
  `depth`. Re-run `npm run build:search` (already wired into `dev` and
  `prebuild`).

### Fixed

- **Dark theme** — the page background is applied in dark mode, contrasts meet
  WCAG AA, and the preview theme renders identically across hydration.
- **Layout** — pages no longer scroll horizontally on narrow viewports.
- **Demo** — the home page has real content and only the current page is
  marked as current.
- **End-to-end suite** — stabilised, and its reference snapshots refreshed.

## [0.1.0] - 2026-08-09

Initial public release (first tagged as 1.0.0; the project stays in 0.x, so any
breaking change from here on is a minor version). Entries are grouped by feature area rather than by
commit, matching the order the template was built in (`qb-header-migration`
→ `qb-globe` → `qb-templatization`).

### Added

- **Navigation** — header combining a search bar and light/dark theme toggle
  with a nav tree driven by `config/site.config.json`; renders as a
  horizontal top bar for shallow trees or a collapsible sidebar for deeper
  ones, with no code changes required to restructure pages.
- **Filtering** — `CriterionMenu` / `MultiCriterionMenu` filter builder:
  variable select, operator select (greater/less/equal for numeric and date
  variables, "in" for categorical ones), and a value input that adapts to
  the variable's type (text, date picker, or select). Constraints combine
  with parentheses and logical connectors and compile to GraphQL variables.
- **Charts** — a single `Chart` component that picks its mark type (scatter,
  line, bar, heatmap, violin, 2D/3D) from the types of the variables mapped
  to `x`/`y`/`z`/`hue`; includes axes/legend, a minimap with brush and zoom,
  and a shared toolbar.
- **Table** — `DataTable` with per-column filter popovers, chip row, CSV
  export, and the same toolbar shared with `Chart`.
- **Tabs** — accessible, keyboard-navigable tabs with roving tabindex and
  overflow handling.
- **Cards** — `LinkCard`, `StatCard`, `StatBadge` and trend/format utilities
  for KPI displays.
- **Globe** — an interactive Three.js globe (arcs, markers, tooltips) that
  follows the active theme and disposes its GPU resources on unmount.
- **GraphQL API layer** (`src/lib/api`) — a single injectable client with two
  transports (real GraphQL endpoint / local mock fixtures), selected by
  `NEXT_PUBLIC_API_URL`; data-source hooks are identical in both modes.
- **Site manifest** — routes, navigation tree and page content generated
  from `config/site.config.json`, validated in CI (`npm run validate:config`).
- **Component registry** — every distributable primitive, feature component
  and token file published as a universal `registry:item`, installable with
  `npx shadcn add https://.../r/<item>.json` without `components.json` or
  Tailwind.
- **Documentation site** — MDX-based docs (`docs/content`) served at
  `/`, with interactive component playgrounds, live code previews, and
  auto-generated props tables (`react-docgen` + a custom JSDoc parser) and
  design-token reference.
- **Internationalization** — labels and dictionaries kept out of components
  (`src/i18n`, `src/utils/i18n`), locale negotiation, and d3 number/date
  formatters resolved per locale instead of defaulting to `en-US`.
- **Testing & CI** — unit tests (Vitest) for pure functions and visual
  components, Playwright end-to-end smoke/visual/edge-case suites, and a
  `verify` GitHub Actions workflow (lint, tests, palette/config/GraphQL/i18n
  checks, registry and docs build) gating `main`.

### Changed

- **Next.js 16 / React 19.2 migration** — adopted the React Compiler
  (`reactCompiler: true`), removing manual `useMemo`/`useCallback` outside
  the few cases where a stable identity is functionally required.
- **Performance pass** across header, filters and charts: debounced inputs
  and drag handlers, memoized default filters, dynamic imports for 3D chart
  marks, SWR-based data fetching, and the root layout converted to a Server
  Component.
- **Color system** unified into a single primitives → semantic tokens →
  feature/component tokens cascade; legacy, duplicated color aliases removed.
- All internal imports migrated to `@/` path aliases.

### Fixed

- CSV export in the table component sanitized against formula/CSV injection.
- SSR/hydration issues in navigation (`useId` mismatches) and chart
  components (layout effects running on the server).
- Numerous accessibility fixes across navigation, tabs and table
  components (focus trap, `aria-*` attributes, semantic roles and tags,
  roving tabindex).

[Unreleased]: https://github.com/qbolliet/dashboard-template-frontend/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/qbolliet/dashboard-template-frontend/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/qbolliet/dashboard-template-frontend/releases/tag/v0.1.0
