'use client';

/**
 * Mode contrôlé
 *
 * `value` et `onChange` transfèrent la propriété de l'onglet actif au parent :
 * `<Tabs>` ne garde alors plus aucun état interne, il se contente de refléter
 * la valeur reçue et de notifier chaque changement. Pratique pour synchroniser
 * l'onglet actif avec le reste de l'interface — ici, une simple ligne de texte.
 *
 * @item tabs
 */

// Importation des modules
import { useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';

const TabsControlled = () => {
  const [period, setPeriod] = useState('jour');

  return (
    <>
      {/* Écho de l'état du parent : preuve que l'onglet actif est bien piloté
          depuis l'extérieur du composant, pas depuis un state interne. */}
      <p>Granularité active : <code>{period}</code></p>
      <Tabs value={period} onChange={setPeriod} variant="enclosed" accent="positive">
        <TabList label="Granularité">
          <Tab value="jour">Jour</Tab>
          <Tab value="semaine">Semaine</Tab>
          <Tab value="mois">Mois</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="jour">Agrégation quotidienne.</TabPanel>
          <TabPanel value="semaine">Agrégation hebdomadaire.</TabPanel>
          <TabPanel value="mois">Agrégation mensuelle.</TabPanel>
        </TabPanels>
      </Tabs>
    </>
  );
};

export default TabsControlled;
