// =================================================================
// PAGE /test-table — page d'exemples du composant <Table>
// =================================================================
// Composant SERVEUR : entête statique + les sections dont les props sont
// entièrement sérialisables (data / columnsMetadata / defaultFilter — aucune
// fonction) rendent <Table> directement ici. Les sections dont les colonnes
// portent des fonctions (render/format) ou un état interactif (bascule,
// MultiCriterionMenu en direct) vivent dans TableShowcase.jsx, seul fichier
// client de la page : une fonction ne peut pas traverser la frontière
// Server → Client (contrainte RSC), même si <Table> lui-même est 'use client'
// (D3 de TABLE_ARCHITECTURE.md). Calqué sur le style de /test-chart (page.js
// statique + playground client, entête + blocs titrés).

// Importation des modules
// NB : import direct du composant (PAS du barrel '@/features/table') — ce
// dernier réexporte aussi useFactTableWithMetadata (hook SWR, sans 'use
// client' propre), que le compilateur RSC refuse de résoudre côté serveur
// dès qu'un Server Component importe le barrel. TableShowcase.jsx (client)
// peut en revanche importer le barrel sans problème.
import Table from '@/features/table/components/Table';
import mockFactTable from '@/features/table/sources/mockFactTable.json';
import { CatalogueTable, CustomToolsTable, McmLiveTable } from './TableShowcase';
import './page.scss';

const { data: MOCK_ROWS, columnsMetadata: MOCK_COLUMNS_METADATA } = mockFactTable;

// Paramètres de snippets GraphQL communs aux six démonstrations.
const QUERY_HINT = { operation: 'getFactTableWithMetadata', limit: MOCK_ROWS.length };

// defaultFilter figé au format EXACT de sortie de filterEngine.buildTree
// (racine = groupe de profondeur 0) : secteur ∈ {Macro, Finance} ET
// observations > 100. Les feuilles portent sqlType / isCategorical (pas de
// type abstrait), comme la sortie réelle d'un <MultiCriterionMenu> (D6).
const DEFAULT_FILTER = {
  tree: {
    type: 'group',
    depth: 0,
    group: 0,
    connector: null,
    children: [
      {
        type: 'criterion',
        depth: 0,
        group: 0,
        connector: null,
        variable: 'sector',
        operation: 'in',
        value: ['Macro', 'Finance'],
        sqlType: 'text',
        isCategorical: true,
        complete: true,
      },
      {
        type: 'criterion',
        depth: 0,
        group: 0,
        connector: 'AND',
        variable: 'observations',
        operation: 'gt',
        value: 100,
        sqlType: 'integer',
        isCategorical: false,
        complete: true,
      },
    ],
  },
};

const TestTablePage = () => (
  <main className="test-table-page">
    <header className="test-table-header">
      <h1 className="test-table-title">Tableau de données interactif</h1>
      <p className="test-table-sub">
        Un seul composant — <code>&lt;Table&gt;</code> — qui dérive ses colonnes des
        métadonnées de catalogue (<code>columnsMetadata</code>) ou les reçoit toutes
        faites (<code>columns</code>), et matérialise en filtres modifiables la sortie
        d&apos;un <code>&lt;MultiCriterionMenu&gt;</code> (<code>defaultFilter</code>).
        Survolez un tableau pour faire apparaître sa barre d&apos;outils (haut-droit) :
        réinitialisation, exports CSV/Parquet, copies de requête JS/PY/cURL.
      </p>
    </header>

    {/* ── 1. Catalogue complet ── colonnes manuelles, formats variés, badge de statut. */}
    <section className="table-block">
      <header className="table-block-head">
        <h2 className="table-block-title">Catalogue complet</h2>
        <span className="table-block-meta">columns manuelles</span>
      </header>
      <p className="table-block-note">
        Colonnes déclarées à la main : <code>code</code> en monospace, <code>indicator</code>{' '}
        en emphase, <code>observations</code> en notation compacte, un <code>montant</code>{' '}
        dérivé formaté en devise (<code>style: &apos;currency&apos;</code>), <code>lastUpdate</code>{' '}
        via une fonction de formatage libre, et <code>status</code> rendu en{' '}
        <code>&lt;Badge&gt;</code> (<code>render</code>, prioritaire sur <code>format</code>).
        Tri, filtre par valeurs et suppression de colonne actifs.
      </p>
      <CatalogueTable data={MOCK_ROWS} queryHint={QUERY_HINT} />
    </section>

    {/* ── 2. Filtre par défaut ── defaultFilter = sortie figée de filterEngine.buildTree. */}
    <section className="table-block">
      <header className="table-block-head">
        <h2 className="table-block-title">Filtre par défaut</h2>
        <span className="table-block-meta">defaultFilter = arbre MCM</span>
      </header>
      <p className="table-block-note">
        <code>defaultFilter</code> matérialise secteur ∈ {'{Macro, Finance}'} ET
        observations {'>'} 100 en sélections de valeurs par colonne : rouvrir l&apos;entonnoir
        d&apos;une colonne touchée recoche les valeurs retirées, et Reset efface tout —
        y compris ce seed initial.
      </p>
      <Table
        title="Indicateurs — secteur filtré"
        data={MOCK_ROWS}
        columnsMetadata={MOCK_COLUMNS_METADATA}
        defaultFilter={DEFAULT_FILTER}
        queryHint={QUERY_HINT} />
    </section>

    {/* ── 3. Mode sobre ── tri, filtre et suppression de colonne désactivés. */}
    <section className="table-block">
      <header className="table-block-head">
        <h2 className="table-block-title">Mode sobre</h2>
        <span className="table-block-meta">enableSort · enableFilter · enableColumnRemoval = false</span>
      </header>
      <p className="table-block-note">
        Lecture seule : ni tri, ni entonnoir de filtre, ni croix de suppression au survol
        des en-têtes. Seuls le reset (masqué, rien à réinitialiser) et les exports/copies
        restent dans la barre d&apos;outils.
      </p>
      <Table
        title="Indicateurs — lecture seule"
        data={MOCK_ROWS}
        columnsMetadata={MOCK_COLUMNS_METADATA}
        enableSort={false}
        enableFilter={false}
        enableColumnRemoval={false}
        queryHint={QUERY_HINT} />
    </section>

    {/* ── 4. Colonnes auto ── columnsMetadata seul, zéro `columns`. */}
    <section className="table-block">
      <header className="table-block-head">
        <h2 className="table-block-title">Colonnes auto</h2>
        <span className="table-block-meta">columnsMetadata seul (getCatalogSchema)</span>
      </header>
      <p className="table-block-note">
        Aucune prop <code>columns</code> : le libellé et l&apos;alignement (numérique si
        <code> sql_type</code> numérique et non catégoriel) sont entièrement dérivés de{' '}
        <code>columnsMetadata</code>, la forme renvoyée par <code>getCatalogSchema</code>.
      </p>
      <Table
        title="Indicateurs — colonnes dérivées"
        data={MOCK_ROWS}
        columnsMetadata={MOCK_COLUMNS_METADATA}
        queryHint={QUERY_HINT} />
    </section>

    {/* ── 5. Opérations custom ── extraTools : bascule de densité factice. */}
    <section className="table-block">
      <header className="table-block-head">
        <h2 className="table-block-title">Opérations custom</h2>
        <span className="table-block-meta">extraTools</span>
      </header>
      <p className="table-block-note">
        <code>extraTools</code> injecte des opérations arbitraires en tête de la barre
        d&apos;outils, dans le même format que la toolbar mutualisée. Démonstration : une
        bascule de densité d&apos;affichage pilotée par un état local du consommateur.
      </p>
      <CustomToolsTable data={MOCK_ROWS} columnsMetadata={MOCK_COLUMNS_METADATA} queryHint={QUERY_HINT} />
    </section>

    {/* ── 6. MCM en direct ── MultiCriterionMenu alimente defaultFilter en direct. */}
    <section className="table-block">
      <header className="table-block-head">
        <h2 className="table-block-title">MultiCriterionMenu en direct</h2>
        <span className="table-block-meta">onChange → defaultFilter</span>
      </header>
      <p className="table-block-note">
        Le <code>onChange</code> d&apos;un <code>&lt;MultiCriterionMenu&gt;</code> alimente en
        direct le <code>defaultFilter</code> du tableau : composez des critères ci-dessous,
        les colonnes concernées se filtrent aussitôt.
      </p>
      <McmLiveTable data={MOCK_ROWS} columnsMetadata={MOCK_COLUMNS_METADATA} queryHint={QUERY_HINT} />
    </section>
  </main>
);

export default TestTablePage;
