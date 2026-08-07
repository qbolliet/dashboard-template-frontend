'use client';

/**
 * Points seuls, sans rotation
 *
 * Aucun `arcs` : les clés `arcs`/`arcsDynamic` sont retirées de la toolbar, et leur
 * groupe disparaît sans laisser de séparateur orphelin. `defaultAutoRotate={false}`
 * démarre la scène immobile. Autre dépendance croisée : masquer les points (bouton
 * dédié) grise en retour le bouton tooltips, faute de rien à survoler.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, demoPointIcon, pointColor, pointSize } from '@/features/globe/sources/demoData';

const GlobePointsOnly = () => (
  <Globe
    points={GLOBE_POINTS}
    iconFor={demoPointIcon}
    colorFor={pointColor}
    sizeFor={pointSize}
    defaultAutoRotate={false}
    toolbar={['mode', 'points', 'rotate', 'wheelZoom', 'resetZoom', 'tooltips']}
    height={420}
  />
);

export default GlobePointsOnly;
