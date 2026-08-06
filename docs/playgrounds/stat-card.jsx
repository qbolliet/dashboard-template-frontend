'use client';

// Importation des modules
import { StatCard } from '@/components/ui';
import { UsersIcon } from '@/components/icons';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — StatCard
// =================================================================
// Porté depuis la « grille pilotable » de /test-stat-card.
//
// UNE DIFFÉRENCE ASSUMÉE AVEC LA PAGE D'ORIGINE : le playground pilote UNE carte, pas la
// grille. `perRow` est une prop de <CardGrid>, pas de <StatCard> — la faire figurer ici
// produirait un code généré qui ne compile pas. La disposition en grille est un cas
// d'usage figé, et elle a déjà son exemple de registry (`stat-card-grid`). C'est la
// répartition du §5.2 : ce que pilote un contrôle va au playground, une combinaison figée
// va à un exemple.
//
// `showIcon` et `showBadge` sont des molettes : ce qu'elles montrent, ce n'est pas un
// booléen mais la PRÉSENCE des props `icon` et `badge`. `toProps` les traduit donc en
// valeur ou en undefined — et `undefined` est omis par le sérialiseur, ce qui fait
// disparaître la prop du code, exactement comme dans un vrai fichier.

const BADGE = { value: '+12,5 %', direction: 'up' };

export const controls = {
    compact: { type: 'boolean', label: 'Densité compacte', default: false, row: 0 },
    showIcon: { type: 'boolean', label: 'Icône', default: true, row: 0 },
    showBadge: { type: 'boolean', label: "Pilule d'évolution", default: true, row: 0 },
    accent: { type: 'boolean', label: "Barre d'accent", default: false, row: 0 },
    title: { type: 'text', label: 'Titre', default: "Chiffre d'affaires", row: 1 },
    value: { type: 'number', label: 'Valeur', min: 0, max: 5000000, step: 1000, default: 1250000, row: 1 },
    tone: {
        type: 'select',
        options: ['primary', 'positive', 'warning', 'negative'],
        label: 'Teinte',
        default: 'primary',
        row: 2,
    },
    iconTone: {
        type: 'select',
        options: ['primary', 'positive', 'warning', 'neutral'],
        label: 'Teinte icône',
        default: 'primary',
        row: 2,
    },
    decimals: { type: 'number', label: 'Décimales', min: 0, max: 4, step: 1, default: 2, row: 2 },
};

export const scaffold = {
    component: 'StatCard',
    imports: [
        "import { StatCard } from '@/components/ui';",
        "import { UsersIcon } from '@/components/icons';",
    ],
    // Constantes introduites par toProps : étant constantes, elles égalent toujours leur
    // défaut et la règle 1 les supprimerait — l'extrait cesserait de reproduire l'aperçu.
    always: ['title', 'value', 'icon', 'badge', 'format', 'footerTitle', 'footerNote'],
};

export const hint = (
    <>
        Décocher <code>Icône</code> ou <code>Pilule d&apos;évolution</code> ne passe pas un
        booléen : cela retire la prop <code>icon</code> ou <code>badge</code>. Le code
        généré le montre — la ligne disparaît.
    </>
);

/**
 * Maps the control values onto real `<StatCard>` props.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = ({ compact, showIcon, showBadge, accent, title, value, tone, iconTone, decimals }) => ({
    title,
    value,
    // expr() : dans le code il faut lire `<UsersIcon />`, mais l'aperçu a besoin de
    // l'élément React lui-même.
    icon: showIcon ? expr('<UsersIcon />', <UsersIcon />) : undefined,
    iconTone: showIcon ? iconTone : undefined,
    badge: showBadge ? expr("{ value: '+12,5 %', direction: 'up' }", BADGE) : undefined,
    format: { style: 'currency', currency: 'EUR', compact: true, maxDecimals: decimals },
    footerTitle: 'En hausse ce mois-ci',
    footerNote: 'vs. 1,11 M€ le mois dernier',
    compact,
    accent,
    tone,
});

/**
 * Live preview of the stat-card playground.
 *
 * @param {Object} props - Props derived from the controls.
 * @returns {JSX.Element} The rendered card.
 */
const StatCardPlayground = (props) => <StatCard {...props} />;

export default StatCardPlayground;
