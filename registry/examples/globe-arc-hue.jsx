'use client';

/**
 * Flux encodés par hue
 *
 * `arcs.hue` nomme des clés des flux, encodées comme les canaux hue de `<Chart>` : la
 * première (`mode`) choisit la couleur du trait dans la palette catégorielle (sans ses
 * bleus, qui se fondent dans l'océan), la seconde (`kind`) son style (plein,
 * pointillé). `arcs.z` nomme le volume brut, qui règle l'épaisseur du trait. La
 * légende du chart s'affiche à droite du globe, titrée par `arcs.labels` : survoler
 * une modalité met ses flux en avant, et le bouton « Agrandir » de la toolbar la passe
 * au-dessus. La tooltip d'un flux reprend ses valeurs hue et son volume formaté.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, GLOBE_ARC_LABELS, demoPointIcon } from '@/features/globe/sources/demoData';

const GlobeArcHue = () => (
  <Globe
    points={{ data: GLOBE_POINTS, icon: demoPointIcon }}
    arcs={{ data: GLOBE_ARCS, hue: ['mode', 'kind'], z: 'volume', labels: GLOBE_ARC_LABELS }}
    defaults={{ mode: 'plane' }}
    height={440}
  />
);

export default GlobeArcHue;
