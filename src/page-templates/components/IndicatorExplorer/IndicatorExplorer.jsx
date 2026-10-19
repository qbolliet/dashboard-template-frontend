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
import { useMemo, useState } from 'react';
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
import { connectorsFrom, resolveOperationLabels } from '@/features/filter/utils/filterTypes';
import { metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import { interpolate } from '@/utils/i18n/interpolate';
import { intlLocaleFor, formatsFor } from '@/i18n/formats';
import { DEFAULT_LOCALE } from '@/i18n/config';
import operations from '@config/filter/operations.json';
import { deriveEncoding } from '../../utils/deriveEncoding';
import { rowsExtent } from '../../utils/rowsExtent';
import './IndicatorExplorer.scss';

// Barre d'outils du graphique. Elle était en portée MODULE, ce qui n'est plus possible :
// ses libellés dépendent de la langue. Or <Chart> exige une RÉFÉRENCE STABLE (cf. sa
// JSDoc) — sans quoi chaque frappe dans le menu de filtres reconstruirait le tableau,
// donc le graphique entier.
//
// C'est l'un des cas où CLAUDE.md autorise `useMemo` malgré le React Compiler :
// l'identité stable est ici FONCTIONNELLEMENT requise, pas une optimisation. La
// dépendance est le dictionnaire de la barre, qui ne change qu'au changement de langue.
const useIndicatorToolbar = (chartLabels) => useMemo(
    () => [
        F.zoom({ label: chartLabels.wheelZoom }),
        F.minimaps({ label: chartLabels.showMinimaps }),
    ],
    [chartLabels.wheelZoom, chartLabels.showMinimaps],
);

// Paramètres de la requête, repris tels quels dans les extraits GraphQL que la barre
// d'outils du tableau propose de copier.
const QUERY_HINT = { operation: 'getFactTableWithMetadata', limit: 100 };

/**
 * Formats an `[min, max]` extent pair into a readable range.
 *
 * @param {Array} [extent] - Two-element extent from `metadata.extents`.
 * @param {boolean} numeric - Whether to run the bounds through the number formatter.
 * @param {string} intlLocale - Full Intl tag, driving the number conventions.
 * @param {string} separator - Range separator, from the dictionary.
 * @returns {string|null} The formatted range, or `null` when the extent is missing.
 */
const formatExtent = (extent, numeric, intlLocale, separator) => {
    if (!Array.isArray(extent) || extent.length < 2) return null;

    const [min, max] = numeric
        ? extent.map((v) => formatNumber(v, { decimals: 1, locale: intlLocale }))
        : extent;

    return `${min}${separator}${max}`;
};

/**
 * Interactive part of an indicator page: KPI cards, chart and filterable table,
 * all driven by a single shared filter state.
 *
 * @param {Object} props - Component props.
 * @param {string} props.name - Node name, used to title the chart and the table.
 * @param {Array<Object>|null} props.columnsMetadata - Metadata of the dataset's columns
 *   (`fields` of getFactTableWithMetadata), resolved on the server. `null` when the
 *   server call failed — the component then falls back on its own fetch.
 * @param {string} props.locale - Current locale code.
 * @param {Object} props.labels - `pages` namespace of the dictionary.
 * @param {Object} props.dictionary - The full dictionary: this island composes four
 *   features (chart, table, filter, cards), each with its own namespace.
 * @returns {JSX.Element} The rendered explorer.
 */
const IndicatorExplorer = ({
    name,
    columnsMetadata: serverColumnsMetadata,
    locale = DEFAULT_LOCALE,
    labels,
    dictionary,
}) => {
    const [filter, setFilter] = useState(null);
    const intlLocale = intlLocaleFor(locale);
    const { dateMask, dateOrder, firstDayOfWeek } = formatsFor(locale);
    const toolbar = useIndicatorToolbar(dictionary.chart);

    // Les libellés d'opérateurs viennent de config/filter/operations.json, qui accepte
    // la forme `{ fr, en }`. On les aplatit ici, à la frontière, pour que
    // <MultiCriterionMenu> reçoive des chaînes.
    const operationLabels = resolveOperationLabels(operations, locale, DEFAULT_LOCALE);
    const { data, metadata, columnsMetadata: fetched, loading, error } = useFactTableWithMetadata();

    // Schéma serveur si le prérendu a abouti, repli sur celui du hook sinon. Les deux
    // sont les `fields` du jeu, déjà alignés sur ses colonnes.
    const schema = serverColumnsMetadata?.length ? serverColumnsMetadata : fetched;

    // `labels` de deriveEncoding nomme les AXES du graphique (une colonne → son
    // intitulé) : rien à voir avec les libellés d'interface reçus en prop, d'où le
    // renommage local.
    const { x, y, hue, labels: axisLabels, format } = deriveEncoding(schema);

    // <Table> applique `defaultFilter` lui-même ; le graphique, lui, reçoit des lignes
    // brutes. On lui applique donc le MÊME filtre, avec le moteur du tableau plutôt
    // qu'une réimplémentation — les deux vues montrent ainsi toujours le même sous-jeu.
    const filterTree = normalizeDefaultFilter(filter);
    const chartData = filterTree ? data.filter((row) => evalFilterNode(row, filterTree)) : data;

    // Les cartes suivent le filtre. `isFiltered` vaut vrai dès qu'un arbre de filtre existe,
    // même s'il laisse passer toutes les lignes : le total d'origine reste alors affiché,
    // ce qui confirme au lecteur que son filtre a bien été pris en compte.
    const isFiltered = Boolean(filterTree);
    const extentOf = (column) => (isFiltered ? rowsExtent(chartData, column) : metadata?.extents?.[column]);

    // Variables du menu de filtres : toutes les colonnes du jeu, sauf les colonnes de
    // libellés (`labelFor`), qui décrivent un code au lieu d'être une variable. Les
    // colonnes de clé (`isPrimaryKey`) restent : au contrat 0.3.0 ce sont les
    // coordonnées de la ligne (pays, date…), les critères les plus naturels.
    const variables = metadataToVariables(schema);

    if (error) {
        return (
            <p className="indicator-explorer__status indicator-explorer__status--error" role="alert">
                {interpolate(labels.error, { message: String(error.message ?? error) })}
            </p>
        );
    }

    return (
        <>
            {/* Indicateurs de cadrage. Sans filtre ils viennent de `metadata` (l'API renvoie
                déjà le compte et les étendues) ; filtre actif, ils sont recalculés sur les
                lignes retenues pour rester d'accord avec le graphique et le tableau, et le
                total d'origine passe en note. Une valeur absente (chargement en cours)
                s'affiche en tiret cadratin via formatStatValue. */}
            <CardGrid perRow={3}>
                <StatCard
                    title={labels.observations}
                    value={isFiltered ? chartData.length : metadata?.count}
                    format={{ compact: true, locale: intlLocaleFor(locale) }}
                    footerNote={isFiltered
                        ? interpolate(labels.observationsFilteredNote, {
                            total: formatNumber(metadata?.count ?? data.length, { decimals: 0, locale: intlLocale }),
                        })
                        : labels.observationsNote} />
                <StatCard
                    title={labels.period}
                    value={formatExtent(extentOf(x), false, intlLocale, labels.rangeSeparator)}
                    footerNote={axisLabels.x} />
                <StatCard
                    title={labels.amplitude}
                    value={formatExtent(extentOf(y), true, intlLocale, labels.rangeSeparator)}
                    footerNote={axisLabels.y} />
            </CardGrid>

            <MultiCriterionMenu
                variables={variables}
                operationLabels={operationLabels}
                connectorOptions={connectorsFrom(dictionary.filter)}
                labels={dictionary.filter}
                intlLocale={intlLocale}
                dateMask={dateMask}
                dateOrder={dateOrder}
                firstDayOfWeek={firstDayOfWeek}
                onChange={setFilter} />

            {/* <Chart> exige un `y` : sans mesure continue dans le jeu, on l'omet plutôt
                que de le laisser lever. Le tableau, lui, reste pertinent. */}
            {y && (
                <Chart
                    data={chartData}
                    x={x} y={y} hue={hue}
                    format={format}
                    labels={axisLabels}
                    title={name}
                    toolbar={toolbar}
                    locale={locale}
                    uiLabels={dictionary.chart}
                    height={420} />
            )}

            <Table
                title={name}
                data={data}
                columnsMetadata={schema}
                defaultFilter={filter}
                locale={locale}
                labels={dictionary.table}
                queryHint={QUERY_HINT} />

            {loading && (
                <p className="indicator-explorer__status">{labels.loading}</p>
            )}
        </>
    );
};

export default IndicatorExplorer;
