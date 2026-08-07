'use client';

// Importation des modules
import Table from '@/features/table/components/Table';
import factTable from '@/lib/api/fixtures/factTable.json';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — Table
// =================================================================
// Porté depuis le panneau de contrôle de /test-table (sections « Catalogue complet »,
// « Colonnes auto » et « Mode sobre ») — les sections à fonctions/état interactif
// (« Opérations custom », « MultiCriterionMenu en direct ») restent des cas d'usage
// figés : elles relèvent des exemples de registry (`table-extra-tools`,
// `table-with-filter`), pas d'un playground à contrôles.
//
// IMPORT DIRECT, PAS LE BARREL '@/features/table'. Repris tel quel de
// /test-table/page.js : ce dernier réexporte aussi useFactTableWithMetadata (hook SWR,
// sans 'use client' propre), que le compilateur RSC refuse de résoudre côté serveur dès
// qu'un Server Component importe le barrel. Ce fichier est déjà 'use client' et n'est
// donc pas directement exposé au problème, mais l'import direct est conservé pour ne
// jamais réintroduire ce piège si ce schéma finit un jour consommé depuis un Server
// Component (ComponentPlayground est un composant client, mais rien ne garantit qu'un
// futur wrapper le reste).
//
// `columnsMode` N'EST PAS UNE PROP DE <Table> : c'est une molette de démonstration qui
// choisit entre deux façons de peupler les colonnes — `columnsMetadata` seul (dérivation
// automatique du libellé et de l'alignement) ou `columnsMetadata` + `columns` (surcharge
// manuelle, par clé). Sans étape de dérivation (`toProps`), le code généré montrerait un
// `columnsMode="custom"` qui ne correspond à aucune prop réelle et ne compile pas.

const { data: rows, columnsMetadata } = factTable;

// Colonnes manuelles, cas « custom » : un sous-ensemble volontairement court (le
// catalogue complet de /test-table en compte huit) pour que le snippet généré reste
// lisible tout en montrant les trois leviers courants — mono, emphase, format compact.
const CUSTOM_COLUMNS = [
    { key: 'code', label: 'Code', mono: true },
    { key: 'indicator', label: 'Indicateur', strong: true },
    { key: 'sector', label: 'Secteur' },
    { key: 'observations', label: 'Observations', type: 'number', format: { compact: true } },
];

// Représentation source de CUSTOM_COLUMNS : un expr() sur l'objet le sérialiserait en
// JSON illisible (fonctions comprises, ici absentes mais le format le permet), alors que
// le code à coller est ce littéral tel quel.
const CUSTOM_COLUMNS_CODE = `[
    { key: 'code', label: 'Code', mono: true },
    { key: 'indicator', label: 'Indicateur', strong: true },
    { key: 'sector', label: 'Secteur' },
    { key: 'observations', label: 'Observations', type: 'number', format: { compact: true } },
  ]`;

export const controls = {
    enableSort: { type: 'boolean', label: 'Tri', default: true, row: 0 },
    enableFilter: { type: 'boolean', label: 'Filtre par valeurs', default: true, row: 0 },
    enableColumnRemoval: { type: 'boolean', label: 'Suppression de colonne', default: true, row: 0 },
    columnsMode: {
        type: 'radio',
        options: ['auto', 'custom'],
        labels: { auto: 'Auto', custom: 'Manuel' },
        label: 'Colonnes',
        default: 'auto',
        row: 1,
    },
    title: { type: 'text', label: 'Titre', default: 'Catalogue des indicateurs', row: 2 },
};

export const scaffold = {
    component: 'Table',
    imports: [
        "import Table from '@/features/table/components/Table';",
        "import factTable from '@/lib/api/fixtures/factTable.json';",
    ],
    data: 'rows',
    dataCode: 'const { data: rows, columnsMetadata } = factTable;',
    // columnsMode : molette de démonstration, jamais une prop de <Table>.
    omit: ['columnsMode'],
    // columnsMetadata : constante du point de vue de toProps (elle ne dépend d'aucun
    // contrôle) — sans `always`, la règle 1 la comparerait à elle-même et l'omettrait,
    // et le snippet copié ne compilerait plus (Table exige columns OU columnsMetadata).
    always: ['columnsMetadata'],
};

export const hint = (
    <>
        <code>Colonnes</code> est une molette de démonstration, pas une prop de{' '}
        <code>&lt;Table&gt;</code> : en <em>Auto</em>, seules les <code>columnsMetadata</code>{' '}
        pilotent libellé et alignement ; en <em>Manuel</em>, un tableau <code>columns</code>{' '}
        figé reprend la main (par clé) sur ce qui serait dérivé.
    </>
);

/**
 * Maps the control values onto real `<Table>` props.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = (values) => {
    const { enableSort, enableFilter, enableColumnRemoval, columnsMode, title } = values;

    return {
        title,
        enableSort,
        enableFilter,
        enableColumnRemoval,
        // expr() : dans le code il faut lire l'identifiant `columnsMetadata`, pas la
        // sérialisation du tableau qu'il désigne.
        columnsMetadata: expr('columnsMetadata', columnsMetadata),
        // columns ne s'ajoute qu'en mode « Manuel » : en mode « Auto », son ABSENCE est
        // la démonstration (dérivation automatique à partir de columnsMetadata seul).
        columns: columnsMode === 'custom' ? expr(CUSTOM_COLUMNS_CODE, CUSTOM_COLUMNS) : undefined,
        // Molette de démonstration, cf. scaffold.omit — nécessaire ici pour que le
        // composant de rendu ci-dessous sache l'exclure du spread.
        columnsMode,
    };
};

/**
 * Live preview of the table playground.
 *
 * @param {Object} props - Props derived from the controls.
 * @param {string} props.columnsMode - Demo-only knob, excluded from the spread below
 *   (it drives no real `<Table>` prop — `columns`/`columnsMetadata` already encode it).
 * @param {Array<Object>} props.columnsMetadata - Pulled out of the spread (rather than
 *   read from the module-level constant) so it never collides with the copy `toProps`
 *   also carries for the generated snippet.
 * @returns {JSX.Element} The rendered table.
 */
const TablePlayground = ({ columnsMode, columnsMetadata, ...tableProps }) => (
    <Table data={rows} columnsMetadata={columnsMetadata} {...tableProps} />
);

export default TablePlayground;
