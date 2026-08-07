/**
 * Grille auto-adaptative
 *
 * `auto` ignore `perRow` : les cartes se répartissent en autant de colonnes que la
 * largeur disponible le permet, chacune au moins aussi large que `minWidth`. Utile
 * quand le nombre de cartes n'est pas fixé à l'avance (nombre de KPI variable
 * selon la page) plutôt qu'un nombre de colonnes figé.
 *
 * @item stat-card
 * @item card-grid
 */

// Importation des modules
import { StatCard, CardGrid } from '@/components/ui';
import { ChartIcon, UsersIcon, PulseIcon, CalendarIcon } from '@/components/icons';

const StatCardAutoGrid = () => (
  <CardGrid auto minWidth="15rem">
    <StatCard
      title="Chiffre d'affaires"
      value={1250000}
      format={{ style: 'currency', currency: 'EUR', compact: true, maxDecimals: 2 }}
      icon={<ChartIcon />}
      iconTone="primary"
      badge={{ value: '+12,5 %', direction: 'up' }}
      footerTitle="En hausse ce mois-ci"
      footerNote="vs. 1,11 M€ le mois dernier"
    />
    <StatCard
      title="Nouveaux clients"
      value={3842}
      icon={<UsersIcon />}
      iconTone="positive"
      badge={{ value: '+8,2 %', direction: 'up' }}
      footerTitle="Acquisition en croissance"
      footerNote="Sur les 30 derniers jours"
    />
    <StatCard
      title="Disponibilité"
      value={99.98}
      format={{ style: 'percent', decimals: 2 }}
      icon={<PulseIcon />}
      iconTone="primary"
      badge={{ value: 'SLA ok', tone: 'positive', showArrow: false }}
      footerTitle="Objectif atteint"
      footerNote="SLA cible : 99,9 %"
    />
    <StatCard
      title="Délai moyen de traitement"
      value={12.4}
      format={{ prefix: '~', suffix: ' j', decimals: 1 }}
      icon={<CalendarIcon />}
      iconTone="warning"
      footerTitle="Délai moyen de traitement"
      footerNote="Objectif : < 10 j"
    />
  </CardGrid>
);

export default StatCardAutoGrid;
