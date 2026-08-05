// Importation des modules
// ATTENTION : aucun import des barils `@/features/table` ni `@/features/chart` ici.
// Ils réexportent des hooks SWR qui n'ont pas de directive 'use client' propre, que le
// compilateur RSC refuse de résoudre depuis un Server Component (piège documenté en
// tête de src/app/test-table/page.js). Tout ce qui touche à ces features vit dans
// l'îlot client IndicatorExplorer.
import { requestSafe } from '@/lib/api/serverRequest';
import { GET_CATALOG_SCHEMA, GET_FACT_TABLE_WITH_METADATA } from '@/lib/api/documents';
import { restrictToColumns } from '../../utils/deriveEncoding';
import PageBody from '../PageBody/PageBody';
import PageHeader from '../PageHeader/PageHeader';
import IndicatorExplorer from '../IndicatorExplorer/IndicatorExplorer';

/**
 * Page template for `indicator` nodes: KPI cards, a chart and a filterable table.
 *
 * Splits the work along the freshness axis. The STRUCTURE — which columns exist, their
 * labels and types — is fetched here, on the server: it is stable metadata, so freezing
 * it in the prerendered HTML is correct and it spares the page a flash of empty filter
 * menu. The VALUES are fetched by the client island, because they depend on the user's
 * filter state and must never be frozen at build time.
 *
 * Server Component. Renders no `<main>`: the catch-all route already provides it.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.node - Manifest node, with resolved absolute paths.
 * @returns {JSX.Element} The rendered indicator page.
 */
const IndicatorPage = async ({ node }) => {
    // Deux appels tolérants à la panne (cf. requestSafe) : le schéma du catalogue, et
    // une seule ligne de faits dont on ne garde QUE la liste des colonnes — le schéma
    // décrit tout le catalogue, les lignes n'en portent qu'un sous-ensemble.
    const [schemaResult, sampleResult] = await Promise.all([
        requestSafe(GET_CATALOG_SCHEMA),
        requestSafe(GET_FACT_TABLE_WITH_METADATA, { limit: 1, offset: 0, format: 'OBJECTS' }),
    ]);

    const catalogSchema = schemaResult?.getCatalogSchema ?? [];
    const columns = sampleResult?.getFactTableWithMetadata?.columns ?? [];

    // `null` signale explicitement l'échec du rendu serveur : l'îlot refera alors le
    // travail à partir de ses propres données plutôt que d'afficher un tableau vide.
    const columnsMetadata = catalogSchema.length && columns.length
        ? restrictToColumns(columns, catalogSchema)
        : null;

    return (
        <PageBody>
            <PageHeader name={node.name} description={node.description} />
            <IndicatorExplorer name={node.name} columnsMetadata={columnsMetadata} />
        </PageBody>
    );
};

export default IndicatorPage;
