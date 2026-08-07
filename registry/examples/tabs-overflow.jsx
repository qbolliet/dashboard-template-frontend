/**
 * Nombre libre d'onglets — défilement horizontal
 *
 * `<TabList>` accueille autant d'onglets que nécessaire : au-delà de la
 * largeur disponible, la piste défile horizontalement plutôt que de
 * réduire ou d'empiler les onglets. Certains portent une icône, d'autres
 * non — le mélange est libre.
 *
 * @item tabs
 */

// Importation des modules
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';
import { ChartIcon, PulseIcon, DocIcon } from '@/components/icons';

// [valeur, libellé, icône éventuelle] — neuf onglets pour dépasser la largeur
// habituelle d'une piste et forcer le défilement.
const MANY_TABS = [
  ['s1', 'Synthèse', ChartIcon],
  ['s2', 'France', null],
  ['s3', 'Allemagne', null],
  ['s4', 'Zone euro', null],
  ['s5', 'Inflation', PulseIcon],
  ['s6', 'Chômage', null],
  ['s7', 'Balance commerciale', null],
  ['s8', 'Méthodologie', DocIcon],
  ['s9', 'Sources', null],
];

const TabsOverflow = () => (
  <Tabs defaultValue="s1" variant="pills">
    <TabList label="Indicateurs macroéconomiques">
      {MANY_TABS.map(([value, label, Icon]) => (
        <Tab key={value} value={value} icon={Icon ? <Icon /> : undefined}>{label}</Tab>
      ))}
    </TabList>
    <TabPanels>
      {MANY_TABS.map(([value, label]) => (
        <TabPanel key={value} value={value}>
          Contenu de l&apos;onglet « {label} ». Faites défiler la barre pour
          atteindre les onglets suivants.
        </TabPanel>
      ))}
    </TabPanels>
  </Tabs>
);

export default TabsOverflow;
