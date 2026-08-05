'use client';

/**
 * Deux lectures d'un même jeu de données
 *
 * `shared` place une valeur dans le contexte des onglets ; chaque `<TabPanel>`
 * la reçoit par render-prop. C'est le motif « graphique ou tableau » : une
 * seule source de données, deux représentations.
 *
 * @item tabs
 * @item chart
 */

// Importation des modules
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';
import { ChartIcon, TableIcon } from '@/components/icons';
import { Chart } from '@/features/chart';

// Constante de module : la référence de `shared` reste ainsi stable d'un rendu
// à l'autre.
const CA_TRIM = [
  { Trimestre: 'T1 2025', CA: 1180000 },
  { Trimestre: 'T2 2025', CA: 1245000 },
  { Trimestre: 'T3 2025', CA: 1322000 },
  { Trimestre: 'T4 2025', CA: 1410000 },
];

// L'instanciation d'un Intl.NumberFormat est coûteuse : une seule fois.
const CA_FORMAT = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 2,
});

const TabsShared = () => (
  <Tabs defaultValue="graph" shared={{ data: CA_TRIM }}>
    <TabList label="Vues du chiffre d'affaires">
      <Tab value="graph" icon={<ChartIcon />}>Graphique</Tab>
      <Tab value="table" icon={<TableIcon />}>Tableau</Tab>
    </TabList>
    <TabPanels>
      <TabPanel value="graph">
        {({ data }) => (
          <Chart data={data} x="Trimestre" y="CA" labels={{ y: "Chiffre d'affaires (€)" }} title="Évolution trimestrielle" />
        )}
      </TabPanel>
      <TabPanel value="table">
        {({ data }) => (
          <table>
            <caption>Chiffre d&apos;affaires trimestriel</caption>
            <thead>
              <tr><th scope="col">Trimestre</th><th scope="col">Chiffre d&apos;affaires</th></tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.Trimestre}>
                  <th scope="row">{row.Trimestre}</th>
                  <td>{CA_FORMAT.format(row.CA)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </TabPanel>
    </TabPanels>
  </Tabs>
);

export default TabsShared;
