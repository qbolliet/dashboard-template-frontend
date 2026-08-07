/**
 * Onglet désactivé
 *
 * `disabled` sur un `<Tab>` le laisse visible mais le rend non sélectionnable :
 * le clic n'active plus son panneau et la navigation au clavier (flèches) le
 * saute purement et simplement, comme s'il n'était pas dans la piste.
 *
 * @item tabs
 */

// Importation des modules
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';
import { UsersIcon, CogIcon } from '@/components/icons';

const TabsDisabled = () => (
  <Tabs defaultValue="actifs">
    <TabList label="Gestion des accès">
      <Tab value="actifs" icon={<UsersIcon />}>Membres actifs</Tab>
      {/* disabled — onglet non sélectionnable, sauté au clavier : les flèches
          passent directement de « Membres actifs » à « Rôles ». */}
      <Tab value="invites" disabled>Invitations (indisponible)</Tab>
      <Tab value="roles" icon={<CogIcon />}>Rôles</Tab>
    </TabList>
    <TabPanels>
      <TabPanel value="actifs">Membres ayant accès à cet espace.</TabPanel>
      <TabPanel value="invites">Panneau inatteignable.</TabPanel>
      <TabPanel value="roles">Rôles et permissions associés.</TabPanel>
    </TabPanels>
  </Tabs>
);

export default TabsDisabled;
