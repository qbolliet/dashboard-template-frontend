# Dashboard Template Frontend

[![Verify](https://github.com/qbolliet/dashboard-template-frontend/actions/workflows/verify.yml/badge.svg)](https://github.com/qbolliet/dashboard-template-frontend/actions/workflows/verify.yml)
[![Deploy docs](https://github.com/qbolliet/dashboard-template-frontend/actions/workflows/docs.yml/badge.svg)](https://github.com/qbolliet/dashboard-template-frontend/actions/workflows/docs.yml)

A configurable [Next.js](https://nextjs.org) dashboard template for presenting
the results of statistical and prediction models. Swap the site manifest, point
it at your GraphQL API, and you have a data-exploration dashboard.

There are two ways to pick it up, and **forking is neither of them** — a fork
creates a permanent upstream link, shares the parent's GitHub network, and is
the tool of contributing back rather than of starting a project:

- **Starting a new dashboard** — use the *Use this template* button, which gives
  you a full copy with a clean history and no link to this repository;
- **Adding pieces to an existing Next.js app** — install them from the registry,
  `npx shadcn@latest add https://qbolliet.github.io/dashboard-template-frontend/r/<item>.json`.
  Items are published as universal `registry:item`s, so no `components.json`
  and no Tailwind are required.

See the [Installation guide](https://qbolliet.github.io/dashboard-template-frontend/introduction/installation)
for both paths in full.

It targets teams who need to ship an internal or public-facing dashboard
without rebuilding navigation, filtering, and charting from scratch —
data/ML teams exposing model outputs, or anyone standing up a
metadata-driven analytics UI on top of a GraphQL backend.

## Key features

### Configurable navigation
The header combines a search bar, a light/dark theme toggle, and a
navigation tree driven entirely by a JSON config
(`config/site.config.json`). Depending on the depth of that tree, the
navigation renders as a horizontal top bar (shallow trees) or a
collapsible sidebar (deeper trees) — no code changes required to restructure
your site's pages.

### GraphQL-backed filtering
A filter builder lets users compose query constraints against your data
source: a first select for the variable, a second for the operation
(greater than / less than / equal for numerical and date variables, "in"
for categorical ones), and a third input that adapts to the variable's type
(text, date picker, or select). Constraints can be combined with
parentheses and logical connectors (AND / OR) to build arbitrarily complex
filters, which are translated into GraphQL query variables.

### Adaptive charting
A single chart component takes `x`, `y`, `z`, and `hue` parameters and picks
the appropriate chart type based on the types of the variables mapped to
them (e.g. scatter, line, bar, heatmap), so callers describe *what* to plot
rather than *how*.

## Getting started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

### Connecting to your data

`NEXT_PUBLIC_API_URL` is the single switch: `src/lib/api/client.js` picks the
GraphQL or the fixture transport from it, and the `sources/` hooks are
identical in all modes. Adding an operation means adding a document in
`src/lib/api/documents/` and a resolver in `src/lib/api/transports/mock.js`
(and, if it's one of the operations listed below, in
`scripts/mock-api-server.js`).

Three ways to run the app:

| Command | Data source | When to use it |
| --- | --- | --- |
| `npm run dev` | In-memory fixtures (`src/lib/api/fixtures/`), no network call | Default — fastest inner loop, no server to keep alive |
| `npm run dev:mock` | A real local GraphQL endpoint (`http://localhost:4000/graphql`) on the same fixtures | See the app talk to an actual GraphQL server — request/response cycle, network tab, pagination — without deploying the real API |
| `npm run dev:api` | Your real API, via `NEXT_PUBLIC_API_URL` in `.env.local` | Final integration against live data |

`dev:mock` runs `scripts/mock-api-server.js` (graphql-yoga +
`@graphql-tools/mock`, serving the API's real schema — vendored at
`scripts/schema.graphql` — mocked with `@graphql-tools/mock`) alongside
`next dev` pointed at it. `getFactTableWithMetadata`, `getCatalogSchema`,
`getSelectOptions` and `getGroupedSelectOptions` — the operations the
template actually consumes — resolve to the same fixtures as `npm run dev`
(and honor `limit` / `offset` / `sort`, so `<Table>`'s pagination is
genuinely exercised); every other operation in the schema is auto-mocked
with arbitrary but type-correct values. Run just the server on its own with
`npm run mock:api`.

To query your own API instead, copy `.env.example` to `.env.local` and set
`NEXT_PUBLIC_API_URL` — see `.env.example` for details — then run
`npm run dev`.

### Configuring the site

`config/site.config.json` is the single manifest describing the site: its
title, description and locale under `site`, and its page tree under
`navigation`. Each node carries a `path` (a segment **relative to its parent**,
concatenated down the tree), a `name`, a `type`, optional `children`, and the
optional `description` and `searchable` fields that feed the search. Set
`navigation.type` to `topbar` or `sidebar` to pick the header layout.

The manifest declares its own JSON Schema (`config/schema/site.schema.json`),
so an editor that understands `$schema` — VS Code does out of the box — gives
you autocompletion and documents every property on hover as you type. Run
`npm run validate:config` to check the file from the command line; it is part
of `npm run verify`.

## Project structure

```
src/
├── styles/      # Global CSS foundations: primitives, semantic tokens, typography
├── components/  # Atomic, stateless UI primitives (buttons, inputs, icons…)
├── hooks/       # Generic, feature-agnostic React hooks
├── utils/       # Generic, feature-agnostic pure functions
├── lib/         # Infrastructure: the API client, its transports and documents
├── features/    # Self-contained features (navigation, filter, chart, table…)
└── app/         # Next.js App Router pages and layouts
```

See `CLAUDE.md` and `DESIGN_SYSTEM.md` for the full architecture and design
token conventions.

## Development commands

- `npm run dev` — start the development server (in-memory fixtures)
- `npm run dev:mock` — start the dev server against a local mock GraphQL endpoint
- `npm run dev:api` — start the dev server against `NEXT_PUBLIC_API_URL`
- `npm run mock:api` — start just the mock GraphQL endpoint (`http://localhost:4000/graphql`)
- `npm run lint` — lint the codebase with ESLint
- `npm run test` — run the unit tests (Vitest)
- `npm run test:e2e` — run the Playwright suite (smoke, visual regression, edge cases)
- `npm run check:palette` — verify design-system color palette consistency
- `npm run validate:config` — validate the site manifest against its JSON Schema
- `npm run check:gql` — validate the GraphQL documents against `scripts/schema.graphql`
- `npm run verify` — the full gate: lint, unit tests, palette, config, GraphQL
  documents, and the generated registry / props / docs-index / tokens artifacts

## Testing

Two layers, colocated with what they exercise:

- **Unit tests** (`src/**/*.test.js`, `npm run test`) — pure functions: filter
  engine, cell formatting, channel assignment, navigation resolvers…
- **End-to-end tests** (`e2e/`, `npm run test:e2e`, [Playwright](https://playwright.dev)) —
  three nets, all driving the real documentation site rather than a separate test
  harness (same dogfooding principle as the rest of the docs — see
  `docs/content/composants/index.mdx`):
  - `smoke.spec.ts` — every documentation page (from `docs/content/**.mdx`) and every
    route generated from `config/site.config.json` loads with no console error and no
    failed request. Routes are derived at test-collection time
    (`e2e/helpers/routes.js`), never hard-coded, so a new page or manifest node is
    covered automatically.
  - `visual.spec.ts` — screenshot regression of the key components (header, in both
    its topbar and sidebar variants; chart; table; stat card; criterion menu), in
    light and dark, captured via their documentation playground frozen on its default
    values.
  - `edge-cases.spec.ts` — the limit cases inherited from the removed `/test-*` pages
    (see `TEMPLATIZATION_PROMPTS.md`, P4.6): chart ISO-date coercion and
    loading/error/success branching, the heatmap's two legend layouts, table
    loading/error/empty states, the globe's `prefers-reduced-motion` behavior and
    repeated-mount WebGL context handling, and the five Tabs limit cases (disabled,
    `keepMounted`, controlled, no default, overflow).

  First run, install the browser binary once: `npx playwright install chromium`.
  `npm run test:e2e` then starts its own dev server on port 3100 (see
  `playwright.config.ts`), so it won't collide with one you're already running on
  3000.

  **Regenerating screenshots** — after an intentional visual change:

  ```bash
  npm run test:e2e:update
  ```

  This overwrites every `*.png` under `e2e/*.spec.ts-snapshots/`; review the diff
  before committing (`git diff --stat e2e/`) to make sure only the components you
  meant to change actually moved. To regenerate a single suite, add a grep filter:
  `npx playwright test visual.spec.ts --update-snapshots`.

  Playwright names snapshots with the OS and browser they were captured on
  (`*-chromium-win32.png`, `*-chromium-linux.png`…) — a baseline generated on your
  machine and one generated in CI are **different files**, not a mismatch of the
  same one. Regenerate from whichever environment is the source of truth for your
  workflow; to match a Linux CI runner exactly (font rendering can differ enough to
  matter), regenerate inside the official
  [`mcr.microsoft.com/playwright`](https://playwright.dev/docs/docker) image rather
  than on a different host OS.

  **Instability sources are neutralized deliberately, not incidentally**:
  - `prefers-reduced-motion: reduce` is the project-wide default (`playwright.config.ts`),
    which freezes both CSS animations/transitions and the globe's JS-driven rotation
    (`src/features/globe/components/Globe/Globe.jsx` reads the same media feature at
    mount). Screenshot assertions additionally freeze CSS animations/transitions on
    their own.
  - The globe is **excluded from pixel-based comparison** rather than given a loose
    threshold: this WebGL canvas was found, in practice, unreadable through
    `toDataURL`/`getImageData` (always returns a blank buffer) and unable to reach
    Playwright's "stable frame" precondition for `.screenshot()` under software
    rendering (headless, no GPU) — see the comments at the top of the `Globe`
    `describe` block in `edge-cases.spec.ts`. Its coverage is DOM/console-based
    instead: it mounts without a console error under reduced motion, and repeated
    client-side mount/unmount cycles don't leak a WebGL context error.
  - Table/StatCard/Chart playgrounds use static or seeded demo data — no timestamped
    values to freeze.

## License

MIT — see [LICENSE](./LICENSE).
