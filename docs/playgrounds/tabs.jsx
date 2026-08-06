'use client';

// Importation des modules
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';
import { GridIcon, PulseIcon, UsersIcon, CogIcon } from '@/components/icons';

// =================================================================
// PLAYGROUND — Tabs
// =================================================================
// Porté depuis le panneau de contrôle de /test-tabs. Les contrôles pilotent ici des
// props DIRECTEMENT : pas de `toProps`, le cas le plus simple.
//
// `showIcons` est une molette de démonstration et non une prop de <Tabs> : les icônes
// sont passées onglet par onglet. Elle est donc listée dans `scaffold.omit` — elle agit
// sur l'aperçu, jamais sur le code généré.

export const controls = {
    variant: {
        type: 'radio',
        options: ['underline', 'pills', 'enclosed'],
        labels: { underline: 'Underline', pills: 'Pills', enclosed: 'Enclosed' },
        label: 'Variante',
        default: 'underline',
        row: 0,
    },
    size: {
        type: 'radio',
        options: ['sm', 'md', 'lg'],
        label: 'Taille',
        default: 'md',
        row: 0,
    },
    align: {
        type: 'radio',
        options: ['start', 'center', 'end'],
        labels: { start: 'Début', center: 'Centre', end: 'Fin' },
        label: 'Alignement',
        default: 'start',
        row: 1,
    },
    accent: {
        type: 'select',
        options: ['primary', 'positive', 'warning', 'negative'],
        label: 'Accent',
        default: 'primary',
        row: 1,
    },
    fitted: { type: 'boolean', label: 'Largeur égale (fitted)', default: false, row: 1 },
    showIcons: { type: 'boolean', label: 'Icônes', default: true, row: 1 },
};

export const scaffold = {
    component: 'Tabs',
    imports: [
        "import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';",
    ],
    omit: ['showIcons'],
    children: `  <TabList label="Sections du projet">
    <Tab value="apercu">Aperçu</Tab>
    <Tab value="activite" count="12">Activité</Tab>
    <Tab value="equipe">Équipe</Tab>
  </TabList>
  <TabPanels>
    <TabPanel value="apercu">Vue d'ensemble du projet.</TabPanel>
    <TabPanel value="activite">Douze événements récents.</TabPanel>
    <TabPanel value="equipe">Membres et rôles.</TabPanel>
  </TabPanels>`,
};

export const hint = (
    <>
        Les onglets sont navigables au clavier : <code>←</code> <code>→</code> parcourent la
        piste, <code>Début</code> et <code>Fin</code> sautent aux extrémités. L&apos;onglet
        actif est le seul à rester dans l&apos;ordre de tabulation.
    </>
);

/**
 * Live preview of the tabs playground.
 *
 * @param {Object} props - Props derived from the controls.
 * @param {boolean} props.showIcons - Demo-only knob toggling per-tab icons.
 * @returns {JSX.Element} The rendered tabs.
 */
const TabsPlayground = ({ showIcons, ...tabsProps }) => (
    <Tabs defaultValue="apercu" {...tabsProps}>
        <TabList label="Sections du projet">
            <Tab value="apercu" icon={showIcons ? <GridIcon /> : undefined}>Aperçu</Tab>
            <Tab value="activite" icon={showIcons ? <PulseIcon /> : undefined} count="12">Activité</Tab>
            <Tab value="equipe" icon={showIcons ? <UsersIcon /> : undefined}>Équipe</Tab>
            <Tab value="reglages" icon={showIcons ? <CogIcon /> : undefined}>Réglages</Tab>
        </TabList>
        <TabPanels>
            <TabPanel value="apercu">Vue d&apos;ensemble du projet : indicateurs clés et derniers entraînements.</TabPanel>
            <TabPanel value="activite">Douze événements récents — commits, ré-entraînements, publications.</TabPanel>
            <TabPanel value="equipe">Membres ayant accès à cet espace et leurs rôles respectifs.</TabPanel>
            <TabPanel value="reglages">Visibilité, jetons d&apos;API, intégrations.</TabPanel>
        </TabPanels>
    </Tabs>
);

export default TabsPlayground;
