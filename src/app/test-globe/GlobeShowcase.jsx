'use client';

// =================================================================
// PAGE /test-globe — DÉMOS INTERACTIVES (partie client)
// =================================================================
// Les 6 démos du §8 de GLOBE_ARCHITECTURE.md. Seul ce composant est
// 'use client' : les accesseurs (iconFor/colorFor/sizeFor/tooltipFor) sont des
// fonctions, donc non sérialisables depuis le Server Component page.js (D2).
// Chaque démo est fixe (pas de panneau de contrôle, contrairement à
// /test-chart) : elle illustre une combinaison de props précise du tableau
// §8, avec son intertitre + meta + note (pattern gb-block du prototype).

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor, pointSize } from './globeDemoData';

// Tooltip point personnalisée de la démo 1 — reprise à l'identique de
// globe.html ligne 160 (mêmes classes que le gabarit par défaut du moteur).
const networkTooltipFor = (p) => (
  `<div class="globe-tt-title">${p.label}</div>`
  + `<div class="globe-tt-sub">source · ${p.sub}</div>`
  + `<div class="globe-tt-val">${p.value}</div>`
);

// Métadonnées des blocs (titre, meta, note) — un par démo du tableau §8.
const DEMOS = {
  network: {
    title: 'Réseau de sources statistiques',
    meta: 'points + flux · toolbar complète',
    note: "Glissez pour tourner, molette pour zoomer, survolez un point pour sa tooltip. Ici couleur, icône et diamètre de chaque pastille dépendent de la valeur (colorFor / iconFor / sizeFor). La toolbar (haut-droit) : globe/planisphère, points, flux, flux dynamiques, rotation, zoom molette, réinit. zoom, tooltips. Basculez le thème (header) pour la Terre de nuit.",
  },
  restricted: {
    title: 'Toolbar restreinte',
    meta: "toolbar={['mode', 'rotate', 'resetZoom']} · départ planisphère",
    note: "On choisit à l'instanciation quelles options la toolbar expose (toolbar = liste de clés). Ici seulement globe/planisphère, rotation et réinitialisation du zoom — et le composant démarre en defaultMode=\"plane\" (planisphère), centre et zoom préservés au morph.",
  },
  pointsOnly: {
    title: 'Points seuls, sans rotation',
    meta: 'pas de flux · defaultAutoRotate={false}',
    note: "Aucun flux : les clés arcs/arcsDynamic sont retirées de la toolbar, et leur groupe disparaît sans laisser de séparateur orphelin. La rotation automatique démarre à l'arrêt. Masquez les points (bouton dédié) pour voir tooltips se griser.",
  },
  frozen: {
    title: 'Flux figés, tooltips off',
    meta: 'defaultArcsDynamic={false} · defaultTooltips={false}',
    note: 'Les flux démarrent en dégradé statique (pas de comète animée) et les tooltips sont désactivées au départ. Toolbar complète : masquez les flux pour vérifier que arcsDynamic se grise en retour.',
  },
  defaults: {
    title: 'Apparence par défaut',
    meta: 'aucun accesseur',
    note: 'Ni iconFor, ni colorFor, ni sizeFor, ni tooltipFor : chaque pastille prend la couleur --globe-marker-accent, le diamètre par défaut (22px) et la tooltip par défaut (label + source + valeur).',
  },
  bare: {
    title: 'Toolbar absente',
    meta: 'toolbar={[]}',
    note: 'Un tableau vide supprime à la fois la barre et sa zone de survol haut-droite : le globe reste manipulable (drag, molette) mais aucun interrupteur ne le pilote.',
  },
};

/** Section titre + corps d'une démo (entête + note), pattern gb-block du prototype. */
const Block = ({ id, children }) => (
  <section className="test-globe-block">
    <header className="test-globe-block-head">
      <h3 className="test-globe-block-title">{DEMOS[id].title}</h3>
      <span className="test-globe-block-meta">{DEMOS[id].meta}</span>
    </header>
    <p className="test-globe-block-note">{DEMOS[id].note}</p>
    {children}
  </section>
);

const GlobeShowcase = () => (
  <div className="test-globe-showcase">
    <h2 className="test-globe-section-label">Démos</h2>

    {/* 1. Réseau complet : points+arcs, tous les accesseurs, toolbar complète. */}
    <Block id="network">
      <Globe
        points={GLOBE_POINTS}
        arcs={GLOBE_ARCS}
        iconFor={demoPointIcon}
        colorFor={pointColor}
        sizeFor={pointSize}
        tooltipFor={networkTooltipFor}
        height={480} />
    </Block>

    {/* 2. Toolbar restreinte, départ planisphère. */}
    <Block id="restricted">
      <Globe
        points={GLOBE_POINTS}
        arcs={GLOBE_ARCS}
        iconFor={demoPointIcon}
        colorFor={pointColor}
        defaultMode="plane"
        toolbar={['mode', 'rotate', 'resetZoom']}
        height={420} />
    </Block>

    {/* 3. Points seuls, sans rotation : pas d'arcs. */}
    <Block id="pointsOnly">
      <Globe
        points={GLOBE_POINTS}
        iconFor={demoPointIcon}
        colorFor={pointColor}
        sizeFor={pointSize}
        defaultAutoRotate={false}
        toolbar={['mode', 'points', 'rotate', 'wheelZoom', 'resetZoom', 'tooltips']}
        height={420} />
    </Block>

    {/* 4. Flux figés, tooltips off — toolbar complète (défaut). */}
    <Block id="frozen">
      <Globe
        points={GLOBE_POINTS}
        arcs={GLOBE_ARCS}
        iconFor={demoPointIcon}
        colorFor={pointColor}
        sizeFor={pointSize}
        defaultArcsDynamic={false}
        defaultTooltips={false}
        height={440} />
    </Block>

    {/* 5. Apparence par défaut : aucun accesseur. */}
    <Block id="defaults">
      <Globe
        points={GLOBE_POINTS}
        arcs={GLOBE_ARCS}
        height={380} />
    </Block>

    {/* 6. Toolbar absente. */}
    <Block id="bare">
      <Globe
        points={GLOBE_POINTS}
        arcs={GLOBE_ARCS}
        iconFor={demoPointIcon}
        colorFor={pointColor}
        toolbar={[]}
        height={320} />
    </Block>
  </div>
);

export default GlobeShowcase;
