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

### Changed

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
