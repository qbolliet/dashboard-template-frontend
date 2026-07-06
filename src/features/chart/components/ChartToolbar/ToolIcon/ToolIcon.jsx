// =================================================================
// TOOL ICON — pictogrammes SVG inline de la barre d'outils
// =================================================================
// Ces valeurs sont de la GÉOMÉTRIE (la forme dessinée), pas du style CSS : elles
// restent en JSX, comme les tracés `path d` de src/components/icons/ et de
// LegendGlyph. `currentColor` laisse le SCSS piloter la couleur. Un descripteur
// de feature référence son icône par CLÉ (`icon: 'confidence'`) ; la barre
// d'outils résout la clé via cet objet.

// Pictogrammes des outils intégrés + des features (même jeu de clés).
const ToolIcon = {
  // ── Outils intégrés ──────────────────────────────────────────────────────
  Expand: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>,
  Compress: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>,
  Voronoi: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l7-4 6 5 5-3M3 13l3 8M10 9V3M16 14l3 7M21 11l-5-8" /><circle cx="10" cy="9" r="1.4" fill="currentColor" /><circle cx="16" cy="14" r="1.4" fill="currentColor" /></svg>,
  Tooltip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a7 7 0 0 1-7 7l-1 3-1-3a7 7 0 0 1-6-7 7 7 0 1 1 15 0z" /><circle cx="9.5" cy="12" r=".8" fill="currentColor" /><circle cx="14.5" cy="12" r=".8" fill="currentColor" /></svg>,
  Reset: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></svg>,
  Svg: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><text x="12" y="17.5" textAnchor="middle" fontSize="6.5" fontWeight="700" stroke="none" fill="currentColor">SVG</text></svg>,
  Png: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><text x="12" y="17.5" textAnchor="middle" fontSize="6.5" fontWeight="700" stroke="none" fill="currentColor">PNG</text></svg>,

  // ── Features (clés référencées par les descripteurs) ─────────────────────
  // Intervalles de confiance : bande + ligne centrale.
  confidence: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 16c4-1 6-9 10-9s5 6 8 5" opacity="0.4" /><path d="M3 8c4-1 6 9 10 9s5-6 8-5" opacity="0.4" /><path d="M3 12c4-1 6 0 10 0s5 1 8 0" /></svg>,
  // Barre avant/après : ligne verticale séparant deux régions.
  beforeAfter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M13 4v16" /><path d="M4 9h6M4 14h6" /><path d="M16 7h4M16 12h4M16 17h4" strokeDasharray="1.4 2.4" /></svg>,
  // Normalisation : barre verticale + axe à 100 %.
  normalize: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M5 8c3 0 4 4 7 4s4-4 7-4" opacity="0.5" /><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" /></svg>,
  // Zoom : loupe + flèches.
  zoom: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="6" /><path d="m20 20-4.5-4.5" /><path d="M10.5 8v5M8 10.5h5" /></svg>,
  // Mini-vues : grand graphe + bande réduite dessous.
  minimaps: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="10" rx="1.4" /><rect x="3" y="17" width="18" height="3" rx="1" opacity="0.5" /></svg>,
};

export default ToolIcon;
