// =================================================================
// PAGE /test-globe — page d'exemples du composant <Globe>
// =================================================================
// Composant SERVEUR : entête statique (titre, sous-titre), grille « Capacités »,
// tableaux d'API (props + clés de toolbar) et snippet d'usage. Seules les démos
// interactives (accesseurs = fonctions non sérialisables, D2 de
// GLOBE_ARCHITECTURE.md) vivent dans GlobeShowcase.jsx, 'use client'. Calqué sur
// le prototype design-system/project/ds/globe.html et sur le style de page de
// /test-chart.

// Importation des modules
import GlobeShowcase from './GlobeShowcase';
import './page.scss';

// Grille « Capacités » — reprise à l'identique de globe.html (feat-grid, lignes 127-145).
const GLOBE_FEATURES = [
  {
    title: 'Jour / nuit',
    desc: 'Textures NASA jour et lumières nocturnes, fondues selon le thème. Fondu doux au changement de thème, avec un halo atmosphérique en mode globe.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </svg>
    ),
  },
  {
    title: 'Points conditionnels',
    desc: (
      <>
        <code>colorFor</code> / <code>iconFor</code> / <code>sizeFor</code> reçoivent le
        point et renvoient couleur, icône (SVG) et diamètre — pilotés par n&apos;importe
        quelle valeur. Apparence entièrement libre.
      </>
    ),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12z" />
        <circle cx="12" cy="9" r="2.4" />
      </svg>
    ),
  },
  {
    title: 'Flux en arcs',
    desc: (
      <>
        Arcs de grand cercle entre deux points, épaisseur/opacité selon <code>value</code>.
        Mode figé (dégradé statique) ou dynamique (comète animée le long de l&apos;arc).
      </>
    ),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 17c4-11 12-11 16 0" />
        <path d="M13.5 6.5 20 5l-1.4 6.4" />
      </svg>
    ),
  },
  {
    title: 'Globe ⇄ planisphère',
    desc: "Transition d'enroulement / dépliage par morphing de shader. L'icône du bouton montre la cible. Centre et zoom préservés de bout en bout.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2.5" y="5" width="19" height="14" rx="1.5" />
        <path d="M2.5 12h19M9 5v14M15 5v14" />
      </svg>
    ),
  },
];

// Tableau d'API des props de <Globe> — noms POST-RENOMMAGE D10 (default*).
const GLOBE_PROPS = [
  ['points', 'Array<Point>', 'Points à placer : { id, label, lat, lon, value, sub? }. Figés au montage (D11).'],
  ['arcs', 'Array<Arc>', 'Flux : { from, to, value } — from/to = id de point. value ∈ [0,1] pilote épaisseur/vitesse. Figés au montage (D11).'],
  ['iconFor', '(pt) => string?', 'Renvoie une chaîne SVG à placer au centre de la pastille — conditionnel à la valeur.'],
  ['colorFor', '(pt) => string?', 'Renvoie la couleur de la pastille (CSS) — conditionnel à la valeur.'],
  ['sizeFor', '(pt) => number?', 'Renvoie le diamètre de la pastille en px (défaut 22) — conditionnel à la valeur.'],
  ['tooltipFor', '(pt) => htmlString?', 'Contenu HTML de la tooltip. Défaut : label + source + valeur.'],
  ['defaultMode', "'globe' | 'plane' = 'globe'", 'Projection initiale (non contrôlée après montage).'],
  ['defaultAutoRotate', 'boolean = true', "Rotation lente permanente au démarrage (forcée à l'arrêt si l'utilisateur préfère les mouvements réduits)."],
  ['defaultWheelZoom', 'boolean = true', 'Zoom à la molette au démarrage.'],
  ['defaultShowPoints', 'boolean = true', 'Points visibles au démarrage.'],
  ['defaultShowArcs', 'boolean = true', 'Flux visibles au démarrage.'],
  ['defaultTooltips', 'boolean = true', 'Tooltips actives au démarrage (inactives si points masqués).'],
  ['defaultArcsDynamic', 'boolean = true', 'Flux animés (comète) au démarrage, sinon dégradé figé.'],
  ['toolbar', 'Array<ToolKey> = TOOL_KEYS', 'Options exposées. Clés : mode, points, arcs, arcsDynamic, rotate, wheelZoom, resetZoom, tooltips. Tableau vide = pas de toolbar.'],
  ['height', 'number = 460', 'Hauteur du cadre en px.'],
  ['ariaLabel', "string = 'Globe terrestre interactif'", 'Nom accessible du stage WebGL.'],
];

// Tableau « Toolbar — clés & dépendances » — repris de globe.html (lignes 227-238).
const GLOBE_TOOLBAR_KEYS = [
  ['mode', 'Bascule globe ⇄ planisphère (animé). Icône = cible.', '—'],
  ['points', 'Affiche / masque les points.', '—'],
  ['arcs', 'Affiche / masque les flux.', '—'],
  ['arcsDynamic', 'Flux dynamiques ⇄ figés.', "Grisé si aucun flux à l'écran"],
  ['rotate', 'Rotation automatique on / off.', '—'],
  ['wheelZoom', 'Zoom molette on / off.', '—'],
  ['resetZoom', 'Réinitialise le zoom (action ponctuelle).', '—'],
  ['tooltips', 'Tooltips au survol on / off.', 'Grisé si plus rien à survoler'],
];

const TestGlobePage = () => (
  <main className="test-globe-page">
    <header className="test-globe-header">
      <h1 className="test-globe-title">Globe</h1>
      <p className="test-globe-sub">
        Un globe terrestre WebGL (Three.js) au rendu réaliste : <strong>Terre de jour</strong>{' '}
        en thème clair, <strong>Terre de nuit</strong> (lumières des villes) en thème sombre.
        Il se <strong>manipule à la souris</strong> (drag), <strong>tourne lentement</strong>{' '}
        en continu et se <strong>zoome</strong> à la molette. On y place des{' '}
        <strong>points</strong> — style, icône et couleur conditionnels à une valeur, avec{' '}
        <strong>tooltip</strong> au survol — et des <strong>flux</strong> en arcs de grand
        cercle, <strong>fixes ou animés</strong>. Une <strong>toolbar</strong> contrôle chaque
        comportement, et un bouton fait basculer entre <code>globe</code> et{' '}
        <code>planisphère</code> : la carte <em>s&apos;enroule</em> sur elle-même pour former
        le globe, et <em>s&apos;étale</em> dans l&apos;autre sens — le centre et le zoom étant
        conservés pendant la transition.
      </p>
    </header>

    {/* ── Capacités ── */}
    <section className="test-globe-features">
      <h2 className="test-globe-section-label">Capacités</h2>
      <div className="test-globe-feat-grid">
        {GLOBE_FEATURES.map(({ title, desc, icon }) => (
          <article className="test-globe-feat" key={title}>
            <h3 className="test-globe-feat-title">
              <span className="test-globe-feat-ico">{icon}</span>
              {title}
            </h3>
            <p className="test-globe-feat-desc">{desc}</p>
          </article>
        ))}
      </div>
    </section>

    {/* ── Démos interactives (client) ── */}
    <GlobeShowcase />

    {/* ── Tableaux d'API (statiques, rendus serveur) ── */}
    <section className="test-globe-api">
      <h2 className="test-globe-section-label">API — Globe props</h2>
      <div className="api-card-scroll">
        <table className="api-table">
          <thead>
            <tr><th>Prop</th><th>Type</th><th>Description</th></tr>
          </thead>
          <tbody>
            {GLOBE_PROPS.map(([prop, type, desc]) => (
              <tr key={prop}>
                <td><code>{prop}</code></td>
                <td className="api-typ">{type}</td>
                <td>{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    <section className="test-globe-api">
      <h2 className="test-globe-section-label">Toolbar — clés &amp; dépendances</h2>
      <p className="test-globe-api-note">
        Chaque outil est un interrupteur. Deux dépendances logiques sont gérées
        automatiquement (bouton grisé) :
      </p>
      <div className="api-card-scroll">
        <table className="api-table">
          <thead>
            <tr><th>Clé</th><th>Effet</th><th>Dépendance</th></tr>
          </thead>
          <tbody>
            {GLOBE_TOOLBAR_KEYS.map(([key, effect, dep]) => (
              <tr key={key}>
                <td><code>{key}</code></td>
                <td>{effect}</td>
                <td className="api-typ">{dep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>

    {/* ── Usage ── */}
    <section className="test-globe-api">
      <h2 className="test-globe-section-label">Usage</h2>
      <pre className="test-globe-snippet"><code>{`import { Globe } from '@/features/globe';

const points = [
  { id: 'fra', label: 'Francfort', sub: 'BCE', lat: 50.11, lon: 8.68, value: 100 },
  { id: 'par', label: 'Paris',     sub: 'INSEE', lat: 48.85, lon: 2.35, value: 92 },
];
const arcs = [{ from: 'fra', to: 'par', value: 0.9 }];

// icône & couleur CONDITIONNELLES à une valeur
const iconFor = (p) => (p.value >= 80 ? ICON.up : ICON.down);
const colorFor = (p) => (p.value >= 80 ? '#1f8a5b' : '#c47f0b');

<Globe
  points={points}
  arcs={arcs}
  iconFor={iconFor} colorFor={colorFor} sizeFor={sizeFor}
  defaultMode="globe"              // démarre en globe (ou "plane")
  toolbar={['mode', 'points', 'arcs', 'arcsDynamic', 'rotate', 'wheelZoom', 'resetZoom', 'tooltips']}
/>`}</code></pre>
    </section>
  </main>
);

export default TestGlobePage;
