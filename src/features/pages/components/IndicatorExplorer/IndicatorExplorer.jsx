'use client';

// =================================================================
// INDICATOR EXPLORER — seul îlot client du gabarit indicateur
// =================================================================
// Les trois briques qu'il assemble partagent un même état de filtre, et deux d'entre
// elles reçoivent des fonctions en props : elles ne peuvent donc pas être composées
// depuis le Server Component parent (une fonction ne traverse pas la frontière
// Server → Client). D'où un îlot unique plutôt que trois.
//
// Les valeurs sont volontairement chargées ICI, côté client : une page indicateur est
// prérendue au build, un fetch serveur des lignes figerait donc les chiffres dans le
// HTML jusqu'au prochain déploiement. Le parent ne fournit que la structure (schéma
// de colonnes), stable par nature.

// Importation des modules
import { useState } from 'react';
import {
    Table,
    useFactTableWithMetadata,
    normalizeDefaultFilter,
    evalFilterNode,
} from '@/features/table';
import { Chart, ChartsFeatures as F } from '@/features/chart';
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import { CardGrid, StatCard } from '@/components/ui';
import { formatNumber } from '@/utils/format/formatNumber';
import operations from '@config/filter/operations.json';
import { deriveEncoding, restrictToColumns } from '../../utils/deriveEncoding';
import './IndicatorExplorer.scss';

// Barre d'outils du graphique, en portée MODULE : <Chart> exige une référence stable
// (cf. sa JSDoc), sinon chaque frappe dans le menu de filtres reconstruit le tableau,
// donc le graphique entier. Rien ici ne dépend du nœud, la portée module suffit.
const INDICATOR_TOOLBAR = [F.zoom(), F.minimaps()];

// Paramètres de la requête, repris tels quels dans les extraits GraphQL que la barre
// d'outils du tableau propose de copier.
const QUERY_HINT = { operation: 'getFactTableWithMetadata', limit: 100 };

/**
 * Formats an `[min, max]` extent pair into a readable range.
 *
 * @param {Array} [extent] - Two-element extent from `metadata.extents`.
 * @param {boolean} numeric - Whether to run the bounds through the number formatter.
 * @returns {string|null} The formatted range, or `null` when the extent is missing.
 */
const formatExtent = (extent, numeric) => {
    if (!Array.isArray(extent) || extent.length < 2) return null;

    const [min, max] = numeric
        ? extent.map((v) => formatNumber(v, { decimals: 1 }))
        : extent;

    return `${min} → ${max}`;
};

/**
 * Interactive part of an indicator page: KPI cards, chart and filterable table,
 * all driven by a single shared filter state.
 *
 * @param {Object} props - Component props.
 * @param {string} props.name - Node name, used to title the chart and the table.
 * @param {Array<Object>|null} props.columnsMetadata - Column schema resolved on the
 *   server and already restricted to the dataset's columns. `null` when the server
 *   call failed — the component then falls back on its own fetch.
 * @returns {JSX.Element} The rendered explorer.
 */
const IndicatorExplorer = ({ name, columnsMetadata: serverColumnsMetadata }) => {
    const [filter, setFilter] = useState(null);
    const { columns, data, metadata, columnsMetadata: fetched, loading, error } = useFactTableWithMetadata();

    // Schéma serveur si le prérendu a abouti, repli sur celui du hook sinon.
    const schema = serverColumnsMetadata?.length
        ? serverColumnsMetadata
        : restrictToColumns(columns, fetched);

    const { x, y, hue, labels, format } = deriveEncoding(schema);

    // <Table> applique `defaultFilter` lui-même ; le graphique, lui, reçoit des lignes
    // brutes. On lui applique donc le MÊME filtre, avec le moteur du tableau plutôt
    // qu'une réimplémentation — les deux vues montrent ainsi toujours le même sous-jeu.
    const filterTree = normalizeDefaultFilter(filter);
    const chartData = filterTree ? data.filter((row) => evalFilterNode(row, filterTree)) : data;

    // Variables du menu de filtres : toutes les colonnes du jeu sauf la clé primaire,
    // qui n'a pas de sens comme critère.
    const variables = schema
        .filter((m) => !m.is_primary_key)
        .map((m) => ({
            value: m.name,
            label: m.label,
            sql_type: m.sql_type,
            is_categorical: m.is_categorical,
        }));

    if (error) {
        return (
            <p className="indicator-explorer__status indicator-explorer__status--error" role="alert">
                Données indisponibles : {String(error.message ?? error)}
            </p>
        );
    }

    return (
        <>
            {/* Indicateurs de cadrage, dérivés de `metadata` — pas de recalcul côté
                client : l'API renvoie déjà le compte et les étendues. Une valeur absente
                (chargement en cours) s'affiche en tiret cadratin via formatStatValue. */}
            <CardGrid perRow={3}>
                <StatCard
                    title="Observations"
                    value={metadata?.count}
                    format={{ compact: true }}
                    footerNote="Lignes renvoyées par la requête" />
                <StatCard
                    title="Période couverte"
                    value={formatExtent(metadata?.extents?.[x], false)}
                    footerNote={labels.x} />
                <StatCard
                    title="Amplitude observée"
                    value={formatExtent(metadata?.extents?.[y], true)}
                    footerNote={labels.y} />
            </CardGrid>

            <MultiCriterionMenu
                variables={variables}
                operationsByType={operations}
                onChange={setFilter} />

            {/* <Chart> exige un `y` : sans mesure continue dans le jeu, on l'omet plutôt
                que de le laisser lever. Le tableau, lui, reste pertinent. */}
            {y && (
                <Chart
                    data={chartData}
                    x={x} y={y} hue={hue}
                    format={format}
                    labels={labels}
                    title={name}
                    toolbar={INDICATOR_TOOLBAR}
                    height={420} />
            )}

            <Table
                title={name}
                data={data}
                columnsMetadata={schema}
                defaultFilter={filter}
                queryHint={QUERY_HINT} />

            {loading && (
                <p className="indicator-explorer__status">Chargement des données…</p>
            )}
        </>
    );
};

export default IndicatorExplorer;
