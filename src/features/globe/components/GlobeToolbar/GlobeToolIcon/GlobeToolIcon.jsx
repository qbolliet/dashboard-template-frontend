// =================================================================
// GLOBE TOOL ICON — pictogrammes SVG inline de la barre d'outils du globe
// =================================================================
// Ces valeurs sont de la GÉOMÉTRIE (la forme dessinée), pas du style CSS : elles
// restent en JSX, comme les tracés `path d` de src/components/icons/ et du
// ToolIcon du graphique. `currentColor` laisse le SCSS piloter la couleur.
//
// Portage littéral de `GBIcon` (design-system/project/scripts/globe/globe.jsx) :
// viewBox 24×24, `strokeWidth` 2, tracés au caractère près.
//
// ℹ️ Pas de pictogramme « réinitialiser le zoom » ici : cet outil vient de la
// factory partagée avec le graphique (src/components/toolbar/tools.js).
// ℹ️ `toGlobe` / `toPlane` sont les deux faces d'un MÊME bouton : l'icône y est
// contextuelle et montre la CIBLE du basculement (le planisphère quand on est en
// globe, et inversement) — l'assemblage choisit laquelle rendre.

const GlobeToolIcon = {
  // Zoom molette : loupe avec un « + ».
  wheel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /><path d="M11 8v6M8 11h6" /></svg>,
  // Points de données : épingle de carte.
  points: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12z" /><circle cx="12" cy="9" r="2.4" /></svg>,
  // Rotation automatique : noyau + orbite inclinée.
  rotate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(-32 12 12)" /></svg>,
  // Tooltips : bulle de dialogue avec un « i ».
  tip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /><path d="M12 8v.01M9.5 11h2.5v3" /></svg>,
  // Flux : arc de grand cercle entre deux nœuds.
  arcs: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17c4-11 12-11 16 0" /><circle cx="4" cy="17" r="1.6" fill="currentColor" stroke="none" /><circle cx="20" cy="17" r="1.6" fill="currentColor" stroke="none" /></svg>,
  // Flux dynamiques : même arc, terminé par une pointe de direction.
  flow: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17c4-11 12-11 16 0" /><path d="M13.5 6.5 20 5l-1.4 6.4" /></svg>,
  // Cible « globe » : sphère méridiens/parallèles.
  toGlobe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>,
  // Cible « planisphère » : carte rectangulaire quadrillée.
  toPlane: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="1.5" /><path d="M2.5 12h19M9 5v14M15 5v14" /></svg>,
};

export default GlobeToolIcon;
