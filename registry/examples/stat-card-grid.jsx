/**
 * Rangée d'indicateurs
 *
 * `CardGrid` dispose les cartes et gère seul le repli en colonnes étroites.
 * `iconTone` et `tone` teintent respectivement la pastille d'icône et la barre
 * d'accent, ce qui donne une lecture d'ensemble avant même de lire les chiffres.
 *
 * @item stat-card
 * @item card-grid
 */

// Importation des modules
import { StatCard, CardGrid } from '@/components/ui';
import { UsersIcon, PulseIcon, ChartIcon } from '@/components/icons';

const KPIS = [
  {
    title: "Chiffre d'affaires",
    value: 1250000,
    format: { style: 'currency', currency: 'EUR', compact: true, maxDecimals: 2 },
    icon: <ChartIcon />,
    tone: 'primary',
    badge: { value: '+12,5 %', direction: 'up' },
    footerNote: 'vs. 1,11 M€ le mois dernier',
  },
  {
    title: 'Nouveaux clients',
    value: 3842,
    icon: <UsersIcon />,
    tone: 'positive',
    badge: { value: '+8,2 %', direction: 'up' },
    footerNote: 'Sur les 30 derniers jours',
  },
  {
    title: 'Disponibilité',
    value: 99.98,
    format: { style: 'percent', decimals: 2 },
    icon: <PulseIcon />,
    tone: 'primary',
    badge: { value: 'SLA ok', tone: 'positive', showArrow: false },
    footerNote: 'SLA cible : 99,9 %',
  },
];

const StatCardGrid = () => (
  <CardGrid perRow={3}>
    {KPIS.map(({ title, value, format, icon, tone, badge, footerNote }) => (
      <StatCard
        key={title}
        title={title}
        value={value}
        format={format}
        icon={icon}
        iconTone={tone}
        tone={tone}
        badge={badge}
        footerNote={footerNote}
        accent
      />
    ))}
  </CardGrid>
);

export default StatCardGrid;
