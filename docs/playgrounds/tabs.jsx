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
// sont passées onglet par onglet. Elle est donc listée dans `scaffold.omit` (aucun attribut
// sur <Tabs>), mais `scaffold.imports` et `scaffold.children` sont des fonctions des props :
// quand elle est active, le code généré importe les icônes et les passe à chaque <Tab>,
// exactement comme l'aperçu.

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

// Onglets de l'aperçu ET du code : une seule liste, pour que les deux ne divergent pas.
const TABS = [
    { value: 'apercu', label: 'Aperçu', icon: 'GridIcon', panel: "Vue d'ensemble du projet : indicateurs clés et derniers entraînements." },
    { value: 'activite', label: 'Activité', icon: 'PulseIcon', count: '12', panel: 'Douze événements récents — commits, ré-entraînements, publications.' },
    { value: 'equipe', label: 'Équipe', icon: 'UsersIcon', panel: 'Membres ayant accès à cet espace et leurs rôles respectifs.' },
    { value: 'reglages', label: 'Réglages', icon: 'CogIcon', panel: "Visibilité, jetons d'API, intégrations." },
];

const ICONS = { GridIcon, PulseIcon, UsersIcon, CogIcon };

export const scaffold = {
    component: 'Tabs',
    imports: ({ showIcons }) => [
        "import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';",
        ...(showIcons ? [`import { ${TABS.map((tab) => tab.icon).join(', ')} } from '@/components/icons';`] : []),
    ],
    omit: ['showIcons'],
    children: ({ showIcons }) => [
        '  <TabList label="Sections du projet">',
        ...TABS.map((tab) => {
            const icon = showIcons ? ` icon={<${tab.icon} />}` : '';
            const count = tab.count ? ` count="${tab.count}"` : '';
            return `    <Tab value="${tab.value}"${icon}${count}>${tab.label}</Tab>`;
        }),
        '  </TabList>',
        '  <TabPanels>',
        ...TABS.map((tab) => `    <TabPanel value="${tab.value}">${tab.panel}</TabPanel>`),
        '  </TabPanels>',
    ].join('\n'),
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
            {TABS.map(({ value, label, icon, count }) => {
                const Icon = ICONS[icon];
                return (
                    <Tab key={value} value={value} icon={showIcons ? <Icon /> : undefined} count={count}>
                        {label}
                    </Tab>
                );
            })}
        </TabList>
        <TabPanels>
            {TABS.map(({ value, panel }) => (
                <TabPanel key={value} value={value}>{panel}</TabPanel>
            ))}
        </TabPanels>
    </Tabs>
);

export default TabsPlayground;
