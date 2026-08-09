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

## [1.0.0] - 2026-08-09

Initial public release. Entries are grouped by feature area rather than by
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

[Unreleased]: https://github.com/qbolliet/dashboard-template-frontend/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/qbolliet/dashboard-template-frontend/releases/tag/v1.0.0
