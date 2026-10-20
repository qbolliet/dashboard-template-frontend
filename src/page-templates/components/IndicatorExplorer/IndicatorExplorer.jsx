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
//
// Le filtrage est fait par l'API, jamais sur les lignes chargées : le filtre du menu
// (toFilterNode) et les filtres de colonne du tableau (critères IN) forment un seul
// FilterNode, envoyé en `structuredFilters`. Graphique, tableau et indicateurs
// montrent donc le jeu filtré, pas un sous-ensemble de la première page.

// Importation des modules
import { useMemo, useState } from 'react';
import { Table, useFactTableWithMetadata } from '@/features/table';
import { Chart, ChartsFeatures as F } from '@/features/chart';
import { useFieldStats } from '@/hooks/fieldStats/useFieldStats';
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import { CardGrid, StatCard } from '@/components/ui';
import { formatNumber } from '@/utils/format/formatNumber';
import { formatValue } from '@/utils/format/formatValue';
import { connectorsFrom, isNumericFamily, resolveOperationLabels } from '@/features/filter/utils/filterTypes';
import { toFilterNode, columnCriteria, andNodes } from '@/features/filter/utils/filterEngine';
import { metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import { interpolate } from '@/utils/i18n/interpolate';
import { intlLocaleFor, formatsFor } from '@/i18n/formats';
import { DEFAULT_LOCALE } from '@/i18n/config';
import operations from '@config/filter/operations.json';
import { deriveEncoding } from '../../utils/deriveEncoding';
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

// Familles de type dont `min` / `max` sont des bornes au sens d'une période ou d'une
// amplitude (une colonne texte a aussi un min et un max, lexicaux, qui ne veulent rien dire ici).
const BOUNDED_FAMILIES = new Set(['INTEGER', 'NUMBER', 'DATE', 'TIMESTAMP']);

/**
 * Turns the getFieldStats of a column into the `[min, max]` pair `formatExtent` reads.
 *
 * @param {?{min: *, max: *}} stats - Stats of the column under the current filter.
 * @param {?{typeFamily: string}} field - Metadata of the column.
 * @returns {Array|null} `[min, max]`, or `null` when stats are missing, empty or not bounds.
 */
const extentFromStats = (stats, field) => (
    stats && field && BOUNDED_FAMILIES.has(field.typeFamily) && stats.min != null && stats.max != null
        ? [stats.min, stats.max]
        : null
);

/**
 * Formats an `[min, max]` extent pair into a readable range.
 *
 * @param {Array} [extent] - Two-element `[min, max]` extent (from getFieldStats).
 * @param {?Object} field - Metadata of the column: a numeric one has its bounds run
 *   through its `displayFormat` and `unit`, or through one decimal when it has no
 *   `displayFormat`; any other (a period) shows its bounds as received.
 * @param {string} intlLocale - Full Intl tag, driving the number conventions.
 * @param {string} separator - Range separator, from the dictionary.
 * @returns {string|null} The formatted range, or `null` when the extent is missing.
 */
const formatExtent = (extent, field, intlLocale, separator) => {
    if (!Array.isArray(extent) || extent.length < 2) return null;

    const numeric = isNumericFamily(field?.typeFamily);
    const [min, max] = numeric
        ? extent.map((v) => formatValue(v, field, intlLocale)
            ?? formatNumber(v, { decimals: 1, locale: intlLocale }))
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
    // Sélections des filtres de colonne du tableau (mode distant de <Table>)
    const [columnFilters, setColumnFilters] = useState({});
    const intlLocale = intlLocaleFor(locale);
    const { dateMask, dateOrder, firstDayOfWeek } = formatsFor(locale);
    const toolbar = useIndicatorToolbar(dictionary.chart);

    // Les libellés d'opérateurs viennent de config/filter/operations.json, qui accepte
    // la forme `{ fr, en }`. On les aplatit ici, à la frontière, pour que
    // <MultiCriterionMenu> reçoive des chaînes.
    const operationLabels = resolveOperationLabels(operations, locale, DEFAULT_LOCALE);

    // Jeu NON filtré : sert de repli au schéma et donne le total d'origine affiché en
    // note quand un filtre est actif. Même clé SWR que la requête filtrée sans filtre :
    // aucune requête de plus tant que rien n'est filtré, le cache ensuite.
    const baseline = useFactTableWithMetadata();

    // Schéma serveur si le prérendu a abouti, repli sur celui du hook sinon. Les deux
    // sont les `fields` du jeu, déjà alignés sur ses colonnes.
    const schema = serverColumnsMetadata?.length ? serverColumnsMetadata : baseline.columnsMetadata;

    // FilterNode envoyé à l'API. Le menu émet un arbre buildTree (déjà debouncé) :
    // critères incomplets omis, expression non équilibrée → aucun filtre. Les dates y
    // sont saisies dans l'ordre de la langue (dateOrder), converties en ISO 8601.
    // Les filtres de colonne s'y ajoutent en ET, le filtre du menu gardé en sous-groupe.
    const menuNode = filter ? toFilterNode(filter.tree, { balanced: filter.balanced, dateOrder }) : null;
    const tableColumns = (schema ?? []).map((m) => ({ key: m.name, typeFamily: m.typeFamily }));
    const structuredFilters = andNodes(menuNode, columnCriteria(columnFilters, tableColumns));

    // Sans filtre, `structuredFilters` est nul : même clé, donc même requête, que `baseline`.
    const { data, metadata, loading, error } = useFactTableWithMetadata({ structuredFilters });

    // `labels` de deriveEncoding nomme les AXES du graphique (une colonne → son
    // intitulé) : rien à voir avec les libellés d'interface reçus en prop, d'où le
    // renommage local.
    const { x, y, hue, labels: axisLabels, format } = deriveEncoding(schema);

    // Les cartes suivent le filtre : `metadata.total` est le nombre de lignes retenues
    // (et non la taille de la page, `count`), et les bornes de x et y viennent de
    // getFieldStats sous le même filtre — `metadata.extents` ne couvre que la page
    // courante. `isFiltered` vaut vrai dès qu'un filtre est envoyé, même s'il laisse
    // passer toutes les lignes : le total d'origine reste alors affiché, ce qui confirme
    // au lecteur que son filtre a bien été pris en compte.
    const isFiltered = Boolean(structuredFilters);
    const xStats = useFieldStats({ fieldName: x, structuredFilters, enabled: !!x }).stats;
    const yStats = useFieldStats({ fieldName: y, structuredFilters, enabled: !!y }).stats;
    const fieldOf = (column) => schema?.find((m) => m.name === column);

    // Variables du menu de filtres : toutes les colonnes du jeu, sauf les colonnes de
    // libellés (`labelFor`), qui décrivent un code au lieu d'être une variable. Les
    // colonnes de clé (`isPrimaryKey`) restent : au contrat 0.3.0 ce sont les
    // coordonnées de la ligne (pays, date…), les critères les plus naturels.
    const variables = metadataToVariables(schema);

    // Message d'erreur de chargement, commun aux deux cas ci-dessous.
    const errorStatus = (err) => (
        <p className="indicator-explorer__status indicator-explorer__status--error" role="alert">
            {interpolate(labels.error, { message: String(err.message ?? err) })}
        </p>
    );

    // Jeu injoignable : rien d'autre à montrer.
    if (baseline.error) return errorStatus(baseline.error);

    return (
        <>
            {/* Indicateurs de cadrage : total de la requête filtrée et bornes de x et y sous
                le même filtre, donc d'accord avec le graphique et le tableau. Filtre actif,
                le total d'origine passe en note. Une valeur absente (chargement en cours) s'affiche en tiret
                cadratin via formatStatValue. */}
            <CardGrid perRow={3}>
                <StatCard
                    title={labels.observations}
                    value={metadata?.total}
                    format={{ compact: true, locale: intlLocaleFor(locale) }}
                    footerNote={isFiltered
                        ? interpolate(labels.observationsFilteredNote, {
                            total: formatNumber(baseline.metadata?.total ?? baseline.data.length, { decimals: 0, locale: intlLocale }),
                        })
                        : labels.observationsNote} />
                <StatCard
                    title={labels.period}
                    value={formatExtent(extentFromStats(xStats, fieldOf(x)), fieldOf(x), intlLocale, labels.rangeSeparator)}
                    footerNote={axisLabels.x} />
                <StatCard
                    title={labels.amplitude}
                    value={formatExtent(extentFromStats(yStats, fieldOf(y)), fieldOf(y), intlLocale, labels.rangeSeparator)}
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
                structuredFilters={structuredFilters}
                onChange={setFilter} />

            {/* Requête FILTRÉE refusée (BAD_USER_INPUT…) : le menu reste en place pour que
                le lecteur corrige son filtre, plutôt que de tout remplacer par l'erreur. */}
            {error && errorStatus(error)}

            {/* <Chart> exige un `y` : sans mesure continue dans le jeu, on l'omet plutôt
                que de le laisser lever. Le tableau, lui, reste pertinent. */}
            {y && (
                <Chart
                    data={data}
                    x={x} y={y} hue={hue}
                    fields={schema}
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
                columnFilters={columnFilters}
                onColumnFiltersChange={setColumnFilters}
                locale={locale}
                labels={dictionary.table}
                queryHint={{ ...QUERY_HINT, structuredFilters: menuNode }} />

            {loading && (
                <p className="indicator-explorer__status">{labels.loading}</p>
            )}
        </>
    );
};

export default IndicatorExplorer;
