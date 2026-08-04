# Dashboard Template Frontend

A configurable [Next.js](https://nextjs.org) dashboard template for presenting
the results of statistical and prediction models. It is meant to be forked
and adapted: swap the navigation config, point it at your GraphQL API, and
you have a data-exploration dashboard.

It targets teams who need to ship an internal or public-facing dashboard
without rebuilding navigation, filtering, and charting from scratch —
data/ML teams exposing model outputs, or anyone standing up a
metadata-driven analytics UI on top of a GraphQL backend.

## Key features

### Configurable navigation
The header combines a search bar, a light/dark theme toggle, and a
navigation tree driven entirely by a JSON config
(`config/navigation.json`). Depending on the depth of that tree, the
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

By default the template serves the local fixtures in `src/lib/api/fixtures/`.
To query a real GraphQL API, copy `.env.example` to `.env.local` and set
`NEXT_PUBLIC_API_URL` to your endpoint — see `.env.example` for details.

That variable is the single switch: `src/lib/api/client.js` picks the GraphQL
or the fixture transport from it, and the `sources/` hooks are identical in
both modes. Adding an operation means adding a document in
`src/lib/api/documents/` and a resolver in `src/lib/api/transports/mock.js`.

### Configuring the navigation

Edit `config/navigation.json` to describe your site's page tree (`path`,
`name`, `type`, and nested `children`). The header picks the top bar or
sidebar layout automatically based on the resulting tree depth.

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

- `npm run dev` — start the development server
- `npm run lint` — lint the codebase with ESLint
- `npm run check:palette` — verify design-system color palette consistency
- `npm run verify` — run lint + palette check

## License

MIT — see [LICENSE](./LICENSE).
