'use client';

/**
 * Globe décoratif (hero)
 *
 * Le même composant, en visuel de page d'accueil : badges à icône, flux lumineux
 * animés (`arcs.mark="glow"`, `defaults.arcsDynamic`), aucune toolbar ni légende
 * (aucun `hue`, aucun `z` de point). Sans titre visible, `ariaLabel` nomme la scène
 * pour les technologies d'assistance. Les tooltips restent actives au survol ; un
 * `defaults={{ tooltips: false }}` les coupe pour un visuel purement d'ambiance.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon } from '@/features/globe/sources/demoData';

const GlobeHero = () => (
  <Globe
    points={{ data: GLOBE_POINTS, icon: demoPointIcon }}
    arcs={{ data: GLOBE_ARCS, mark: 'glow', z: 'volume' }}
    toolbar={[]}
    defaults={{ arcsDynamic: true }}
    ariaLabel="Réseau mondial des sources statistiques"
    height={480}
  />
);

export default GlobeHero;
