// =================================================================
// PAGE /test-stat-card — page d'exemples du composant <StatCard>
// =================================================================
// Composant SERVEUR : entête statique (titre, sous-titre) uniquement. Toutes les
// démonstrations (aperçu, grille pilotable, formats, mode auto, non-régression
// LinkCardsSection) et leurs contrôles vivent dans StatCardShowcase.jsx, seule
// partie 'use client' de la page — pattern calqué sur src/app/test-chart/.

// Importation des modules
import StatCardShowcase from './StatCardShowcase';
import './page.scss';

const TestStatCardPage = () => (
  <main className="test-stat-card-page">
    <header className="test-stat-card-header">
      <h1 className="test-stat-card-title">StatCard — page de test</h1>
      <p className="test-stat-card-sub">
        Une carte pour présenter un chiffre — indicateur, KPI, métrique — avec
        icône, pilule d&apos;évolution et footer optionnels.
      </p>
    </header>

    <StatCardShowcase />
  </main>
);

export default TestStatCardPage;
