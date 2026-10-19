# Contributing

This document is for people working on the template itself — not on a
dashboard built from it. If you're consuming the template (via *Use this
template* or the component registry), see the [README](./README.md) and the
[documentation site](https://qbolliet.github.io/dashboard-template-frontend)
instead.

## Layer structure

`src/` is organized in four layers with a strict dependency direction. Full
detail — including CSS token scoping — lives in [CLAUDE.md](./CLAUDE.md) and
[the design-system pages](./docs/content/fondations/design-system.mdx); the short version:

```
styles/      → global CSS primitives and semantic tokens
components/  → atomic, stateless, feature-agnostic UI (icons, buttons, inputs)
hooks/       → generic React hooks, no UI, no feature ties
utils/       → generic pure functions, no React, no feature ties
i18n/        → labels/dictionaries; fills components' `labels` props, never the reverse
lib/         → cross-cutting infra (today: the GraphQL client in lib/api)
features/    → self-contained modules that assemble components into a feature
app/         → Next.js App Router pages/layouts
```

`components/` must never import from `features/`, and `lib/` must never
import from `features/` or `components/`. When a rule like that would be
violated, the resolution lives in `utils/`, not in an exception.

## Conventions

The authoritative source is [CLAUDE.md](./CLAUDE.md) — read it before your
first PR. The conventions Claude Code is instructed to follow apply to human
contributions the same way. Highlights:

- Components start as **JavaScript**; convert to TypeScript only once a
  component is finished.
- Docstrings in **English** (Google convention); inline comments in
  **French**.
- SCSS for styling; Tailwind only for rapid page-level layout. Font sizes,
  spacing and radii come from `typography.scss` custom properties — never
  hardcoded `px`/`rem`. Colors are always `hsl(var(--color-name))`.
- Server Components and Server Actions by default; `'use client'` only when
  interactivity or a browser API requires it.
- No manual `useMemo`/`useCallback` — the React Compiler handles it. The only
  exceptions are a stable identity a `useEffect` genuinely depends on, or a
  heavy computation invariant across a high-frequency re-render whose inputs
  still change identity every render (see the KDE block in
  `ViolinMarks.jsx`); comment why when you use one.
- No `d3-format`/`d3-time-format` imported directly, and no hardcoded
  `'fr-FR'` — go through `d3LocaleFor(locale)` / `intlLocaleFor(locale)` so
  number/date formatting stays locale-aware.
- Named arrow function components (`const Name = (props) => {...}`), default
  exported at the end of the file.

## The verify chain

`npm run verify` is what CI (`.github/workflows/verify.yml`) runs on every
PR and on push to `main`; run it locally before opening a PR:

```bash
npm run verify
```

In order: `lint` → unit `test` → `check:palette` (color tokens in sync
across primitives/tokens files) → `validate:config` (site manifest against
its schema) → `check:gql` (GraphQL documents against `scripts/schema.graphql`)
→ `check:i18n --strict` (no missing dictionary keys) → `build:registry`
→ `build:props --strict` (every distributed component has valid JSDoc) →
`build:docs-index` → `build:tokens --strict`. Playwright end-to-end tests
(`npm run test:e2e`) are not part of `verify` — run them separately when
touching interactive components.

## Adding a component to the registry

The registry (`registry/registry.json`, published under `public/r/`) is
generated, not hand-written, except for its editorial fields. To add a new
distributable component:

1. Build the component under `src/components/` or `src/features/<feature>/components/`
   following the standard folder shape (`Component.jsx`, `.scss`,
   `_tokens.scss`, `_colors.scss`) — see [CLAUDE.md](./CLAUDE.md#code-structure).
   Every visual value must be reachable through a token; nothing that only a
   JS prop can reach.
2. Run `npm run build:inventory` to regenerate `registry/inventory.json` and
   confirm your component is picked up as its own unit (or correctly folds
   into an existing family, e.g. `tabs`, `icons`).
3. Add one or more usage examples under `registry/examples/<name>-*.jsx`.
4. Run `node scripts/build-registry.js --sync` to regenerate
   `registry/registry.json`'s mechanical fields (`type`, `files`,
   `dependencies`, `registryDependencies`) from the inventory and examples.
5. Fill in the editorial fields the sync step preserves but doesn't write:
   `title`, `description`, `categories`, `docs`, and, if relevant, `author`
   and `published`.
6. Write the documentation page: a `.mdx` file under `docs/content/composants/`
   (or the relevant section) with a `<ComponentPlayground>` and one
   `<ComponentPreview>` per example — the page doubles as the component's
   test bench (dogfooding; see `docs-internal/TEMPLATIZATION_ARCHITECTURE.md`).
7. Run `npm run verify` — `build:props --strict` fails the build if the
   component's JSDoc is incomplete, and `build:registry` (non-`--sync` mode)
   fails if `registry.json` is stale relative to the inventory.

## Versioning

This template follows [Semantic Versioning](https://semver.org/), adapted
for a project that's mostly **distributed by copy** (`Use this template`) or
by pulling individual items from the registry, rather than updated via
`git pull` or a package manager. There is no automated migration path
between versions — the changelog is how a consumer who copied `v0.1.0`
finds out what changed in `v0.2.0`.

The project is in **0.x**: until it deliberately moves to 1.0, a breaking
change as defined below bumps the **minor** number (`0.y.0`), and everything
else bumps the patch.

Given that distribution model, a **breaking (major) change** is any change
that would silently break a project someone already copied or installed
from the registry, specifically:

- Renaming or removing a CSS custom property (design token) at any layer
  (primitive, semantic, feature, or component) — a consumer's overrides or
  direct references to `var(--token-name)` stop resolving.
- Any change to the *shape* of `config/site.config.json` (renamed/removed
  keys, changed nesting, changed type of an existing field) that
  `validate:config`'s schema would reject for a manifest written against the
  previous version.
- A changed prop signature on a registry component — a renamed/removed prop,
  a changed prop type, or a changed default that alters existing behavior.
- A changed shape of a GraphQL document or fixture that a consumer's own
  `NEXT_PUBLIC_API_URL` backend would need to match.

**Minor** releases add tokens, manifest fields (with backward-compatible
defaults), components, or registry items without breaking existing ones.
**Patch** releases are fixes that don't change any public shape — bug fixes,
accessibility fixes, performance improvements, documentation.

Every release gets an entry in [CHANGELOG.md](./CHANGELOG.md) before being
tagged (`git tag -a vX.Y.Z`), and a corresponding GitHub Release.
