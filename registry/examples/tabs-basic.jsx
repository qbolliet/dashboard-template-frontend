/**
 * Barre d'onglets
 *
 * La composition canonique : `<Tabs>` porte l'état, `<TabList>` les
 * déclencheurs, `<TabPanels>` les contenus. Chaque `<Tab>` s'apparie à son
 * `<TabPanel>` par la prop `value`.
 *
 * @item tabs
 */

// Importation des modules
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';
import { GridIcon, DocIcon, BellIcon } from '@/components/icons';

const TabsBasic = () => (
  <Tabs defaultValue="apercu" variant="underline">
    {/* `label` nomme la barre pour les lecteurs d'écran : indispensable dès
        qu'une page en compte plusieurs. */}
    <TabList label="Vues de l'indicateur">
      <Tab value="apercu" icon={<GridIcon />}>Vue d&apos;ensemble</Tab>
      <Tab value="doc" icon={<DocIcon />}>Documentation</Tab>
      <Tab value="alertes" icon={<BellIcon />} count="3" countLabel="alertes">Alertes</Tab>
    </TabList>
    <TabPanels>
      <TabPanel value="apercu">Chiffres clés et dernières observations.</TabPanel>
      <TabPanel value="doc">Méthodologie de collecte et définitions.</TabPanel>
      <TabPanel value="alertes">Trois anomalies détectées sur le dernier trimestre.</TabPanel>
    </TabPanels>
  </Tabs>
);

export default TabsBasic;
