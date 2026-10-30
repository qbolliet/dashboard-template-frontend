'use client';

/**
 * Zoom initial — les dernières observations d'abord
 *
 * `defaultZoom={{ x: { last: 5 } }}` ouvre la courbe sur ses 5 dernières dates : la
 * mini-vue montre toute la série avec la fenêtre déjà posée, et l'axe des valeurs se cale
 * sur les points visibles. Le brush, la molette et le bouton de réinitialisation restent
 * disponibles ; la réinitialisation revient à la série COMPLÈTE. Une fenêtre peut aussi
 * s'écrire en valeurs, `{ x: ['2024-01-01', '2024-06-30'] }`, ou par le début,
 * `{ x: { first: 12 } }`. Si les données arrivent plus tard (chargement API), le zoom
 * s'applique à leur arrivée.
 *
 * @item chart
 */

// Importation des modules
import { Chart, ChartsFeatures as F } from '@/features/chart';

// Référence de module figée : cf. les autres exemples chart-*.jsx pour la raison
// (stabilité d'identité requise par le React Compiler pour la prop `toolbar`).
const toolbar = [F.zoom(), F.minimaps()];

// Jeu fictif : indice mensuel sur deux ans, dates en chaînes ISO.
const rows = Array.from({ length: 24 }, (_, i) => ({
  mois: new Date(Date.UTC(2023, i, 1)).toISOString().slice(0, 10),
  indice: Math.round(100 + i * 1.8 + 6 * Math.sin(i / 2)),
}));

const ChartDefaultZoom = () => (
  <Chart
    data={rows}
    x="mois"
    y="indice"
    labels={{ x: 'Mois', y: 'Indice' }}
    toolbar={toolbar}
    defaultZoom={{ x: { last: 5 } }}
    title="Les 5 derniers mois"
    height={360}
  />
);

export default ChartDefaultZoom;
