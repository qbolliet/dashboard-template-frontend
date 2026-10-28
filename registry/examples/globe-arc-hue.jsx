'use client';

/**
 * Flux encodés par hue
 *
 * `arcHue` nomme des clés des objets `arcs`, encodées comme les canaux hue de
 * `<Chart>` : la première (`mode`) choisit la couleur du trait dans la palette
 * catégorielle (sans ses bleus, qui se fondent dans l'océan), la seconde (`kind`)
 * son style (plein, pointillé). La légende du chart s'affiche à droite du globe,
 * titrée par `labels` : survoler une modalité met ses flux en avant, et le bouton
 * « Agrandir » de la toolbar la passe au-dessus. La tooltip d'un flux reprend ses
 * valeurs hue, et l'épaisseur suit toujours `value`.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor } from '@/features/globe/sources/demoData';

const GlobeArcHue = () => (
  <Globe
    points={GLOBE_POINTS}
    arcs={GLOBE_ARCS}
    iconFor={demoPointIcon}
    colorFor={pointColor}
    arcHue={['mode', 'kind']}
    labels={{ color: 'Acheminement', style: 'Régularité' }}
    defaults={{ mode: 'plane' }}
    height={440}
  />
);

export default GlobeArcHue;
