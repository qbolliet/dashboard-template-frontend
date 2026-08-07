'use client';

/**
 * Flux figés, tooltips désactivées
 *
 * `defaultArcsDynamic={false}` démarre les flux en dégradé statique (pas de comète
 * animée le long de l'arc) ; `defaultTooltips={false}` démarre sans infobulle au
 * survol. Toolbar complète : l'autre dépendance croisée se vérifie en masquant les
 * flux, qui grise alors en retour le bouton `arcsDynamic` — plus rien à animer.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor, pointSize } from '@/features/globe/sources/demoData';

const GlobeStaticArcs = () => (
  <Globe
    points={GLOBE_POINTS}
    arcs={GLOBE_ARCS}
    iconFor={demoPointIcon}
    colorFor={pointColor}
    sizeFor={pointSize}
    defaultArcsDynamic={false}
    defaultTooltips={false}
    height={440}
  />
);

export default GlobeStaticArcs;
