'use client';

/**
 * Flux figés, tooltips désactivées
 *
 * Les flux démarrent figés par défaut (trait plein, sans comète) : le bouton
 * `arcsDynamic` de la toolbar les anime. `defaults={{ tooltips: false }}` démarre sans
 * infobulle au survol. Toolbar complète : l'autre dépendance croisée se vérifie en
 * masquant les flux, qui grise alors en retour le bouton `arcsDynamic` — plus rien
 * à animer.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor } from '@/features/globe/sources/demoData';

const GlobeStaticArcs = () => (
  <Globe
    points={GLOBE_POINTS}
    arcs={GLOBE_ARCS}
    iconFor={demoPointIcon}
    colorFor={pointColor}
    defaults={{ tooltips: false }}
    height={440}
  />
);

export default GlobeStaticArcs;
