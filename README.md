# Dashboard Template Frontend

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
- `npm run check:palette` — verify design-system color palette consistency
- `npm run validate:config` — validate the site manifest against its JSON Schema
- `npm run check:gql` — validate the GraphQL documents against `scripts/schema.graphql`
- `npm run verify` — the full gate: lint, palette, config, GraphQL documents, and
  the generated registry / props / docs-index / tokens artifacts

## License

MIT — see [LICENSE](./LICENSE).
