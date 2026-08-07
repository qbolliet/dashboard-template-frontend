/**
 * Sans `defaultValue` — repli du roving tabindex
 *
 * Aucun onglet ne correspond à la valeur active (ici inexistante) : tous
 * porteraient `tabindex="-1"` et la piste serait entièrement sautée à la
 * tabulation. `<TabList>` désigne alors un onglet de repli qui expose
 * `tabindex="0"` sans pour autant l'activer — `aria-selected` reste `false`,
 * aucun panneau ne s'affiche et `onChange` n'est pas appelé. Ce repli ouvre
 * juste une porte d'entrée au clavier ; il faut ensuite Entrée/Espace ou une
 * flèche pour réellement sélectionner un onglet.
 *
 * @item tabs
 */

// Importation des modules
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';
import { GridIcon } from '@/components/icons';

const TabsNoDefault = () => (
  <Tabs variant="pills" accent="warning">
    <TabList label="Répartition géographique">
      <Tab value="monde" icon={<GridIcon />}>Monde</Tab>
      <Tab value="europe">Europe</Tab>
      <Tab value="france">France</Tab>
    </TabList>
    <TabPanels>
      {/* Aucun panneau ne s'affiche tant qu'aucun onglet n'a été choisi : c'est
          attendu, rien n'est actif à l'arrivée sur la page. */}
      <TabPanel value="monde">Agrégats mondiaux.</TabPanel>
      <TabPanel value="europe">Agrégats européens.</TabPanel>
      <TabPanel value="france">Agrégats français.</TabPanel>
    </TabPanels>
  </Tabs>
);

export default TabsNoDefault;
