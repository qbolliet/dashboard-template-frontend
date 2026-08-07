'use client';

/**
 * Persistance d'un panneau avec `keepMounted`
 *
 * Sans `keepMounted`, un `<TabPanel>` inactif est démonté (il retourne `null`)
 * et perd tout état interne à chaque changement d'onglet. Ici, le texte saisi
 * dans « Brouillon » doit survivre à un aller-retour par « Aperçu » : c'est la
 * preuve que le panneau reste monté en arrière-plan — simplement masqué via
 * `[hidden]` — plutôt que recréé à chaque activation.
 *
 * @item tabs
 */

// Importation des modules
import { useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';
import { DocIcon, GridIcon } from '@/components/icons';

const TabsKeepMounted = () => {
  const [draft, setDraft] = useState('');

  return (
    <Tabs defaultValue="brouillon" keepMounted variant="pills">
      <TabList label="Rédaction">
        <Tab value="brouillon" icon={<DocIcon />}>Brouillon</Tab>
        <Tab value="apercu" icon={<GridIcon />}>Aperçu</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="brouillon">
          <label>
            Note de travail
            {/* Champ contrôlé : sans keepMounted, ce state serait perdu dès
                le passage sur l'onglet « Aperçu » (démontage du panneau). */}
            <input
              type="text"
              value={draft}
              placeholder="Saisissez du texte…"
              onChange={(e) => setDraft(e.target.value)}
            />
          </label>
        </TabPanel>
        <TabPanel value="apercu">
          Revenez sur « Brouillon » : la saisie est intacte, le panneau n&apos;a
          jamais été démonté.
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

export default TabsKeepMounted;
