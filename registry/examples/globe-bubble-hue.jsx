'use client';

/**
 * Bulles encodées par hue
 *
 * La syntaxe de `<Chart zMark="bubble">`, appliquée aux points : `points.hue` encode
 * trois colonnes — couleur (`region`), hachure (`niveau`) et forme (`type`) — et
 * `points.z` l'aire de chaque bulle. `fields` décrit les colonnes comme le fait l'API
 * (`displayFormat`, `unit`) : la tooltip et la légende de taille en tirent leur
 * format, sauf si `format.z` en impose un, comme ici pour les flux. Survoler une
 * modalité de la légende met en avant les bulles correspondantes.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, GLOBE_POINT_LABELS, GLOBE_ARC_LABELS } from '@/features/globe/sources/demoData';

// Métadonnées de colonne, au format des `fields` de l'API (DatasetWithMetadata).
const FIELDS = [
  { name: 'value', typeFamily: 'NUMBER', displayFormat: ',.0f', unit: 'pts' },
];

const GlobeBubbleHue = () => (
  <Globe
    title="Sources statistiques et échanges de données"
    points={{
      data: GLOBE_POINTS,
      mark: 'bubble',
      hue: ['region', 'niveau', 'type'],
      z: 'value',
      labels: GLOBE_POINT_LABELS,
    }}
    arcs={{
      data: GLOBE_ARCS,
      hue: 'mode',
      z: 'volume',
      labels: GLOBE_ARC_LABELS,
      format: { z: '.2s' },
    }}
    fields={FIELDS}
    defaults={{ mode: 'plane', rotate: false }}
    height={460}
  />
);

export default GlobeBubbleHue;
