'use client';

/**
 * Courbes par canal `hue`
 *
 * `hue` accepte jusqu'à trois colonnes, affectées dans l'ordre à la couleur,
 * au style de trait puis au marqueur. Chaque canal reçoit sa propre légende,
 * nommée par `labels`.
 *
 * @item chart
 */

// Importation des modules
import { Chart, ChartsFeatures as F } from '@/features/chart';
import { makeLineByHue } from '@/features/chart/sources/demoData';

const rows = makeLineByHue()[2];

// Descripteurs de barre d'outils figés au niveau module : une nouvelle identité
// de tableau à chaque rendu empêcherait le React Compiler d'éviter le re-rendu
// du <Chart> (cf. JSDoc de la prop `toolbar`).
const toolbar = [F.zoom(), F.minimaps()];

const ChartHue = () => (
  <Chart
    data={rows}
    x="Date"
    y="PIB"
    hue={['Country', 'CrossVal']}
    format={{ x: '%Y-%m', y: '.3~f' }}
    labels={{
      x: 'Date',
      y: 'PIB (indice 2020 = 100)',
      color: 'Pays',
      style: 'Entraînement',
    }}
    title="PIB mensuel — Pays × Entraînement"
    toolbar={toolbar}
    height={460}
  />
);

export default ChartHue;
