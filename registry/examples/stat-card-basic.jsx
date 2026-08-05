/**
 * Carte d'indicateur
 *
 * `value` reste un nombre brut : c'est `format` qui décide de sa présentation
 * (devise, pourcentage, notation compacte, unité). `badge` affiche l'évolution
 * et `direction` en choisit la couleur et la flèche.
 *
 * @item stat-card
 */

// Importation des modules
import { StatCard } from '@/components/ui';
import { TrendArrowIcon } from '@/components/icons';

const StatCardBasic = () => (
  <StatCard
    title="Chiffre d'affaires"
    value={1250000}
    format={{ style: 'currency', currency: 'EUR', compact: true, maxDecimals: 2 }}
    badge={{ value: '+12,5 %', direction: 'up' }}
    footerTitle={<>En hausse ce mois-ci <TrendArrowIcon direction="up" /></>}
    footerNote="vs. 1,11 M€ le mois dernier"
  />
);

export default StatCardBasic;
