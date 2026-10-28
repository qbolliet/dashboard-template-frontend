'use client';

/**
 * Bulles sobres, taille par valeur
 *
 * `points.mark="bubble"` remplace les pastilles par des bulles de donnée, sans anneau,
 * icône ni halo animé : les points voisins d'Europe restent lisibles. `points.z` rend
 * l'aire de chaque bulle proportionnelle à sa valeur, comme les bulles du chart, et
 * `points.hue` les colore par région ; la légende de taille, titrée par
 * `points.labels.z`, rejoint celle des flux.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, GLOBE_POINT_LABELS, GLOBE_ARC_LABELS } from '@/features/globe/sources/demoData';

const GlobeSoberPoints = () => (
  <Globe
    points={{ data: GLOBE_POINTS, mark: 'bubble', hue: 'region', z: 'value', labels: GLOBE_POINT_LABELS }}
    arcs={{ data: GLOBE_ARCS, hue: 'mode', z: 'volume', labels: GLOBE_ARC_LABELS }}
    defaults={{ mode: 'plane' }}
    height={420}
  />
);

export default GlobeSoberPoints;
