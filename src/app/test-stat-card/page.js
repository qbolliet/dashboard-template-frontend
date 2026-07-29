// =================================================================
// PAGE /test-stat-card — page d'exemples du composant <StatCard>
// =================================================================
// Composant SERVEUR : entête statique (titre, sous-titre) et section 5
// (LinkCardsSection, non-régression) uniquement. Les démonstrations interactives
// (aperçu, grille pilotable, formats, mode auto) et leurs contrôles vivent dans
// StatCardShowcase.jsx, seule partie 'use client' de la page — pattern calqué
// sur src/app/test-chart/. La section 5 reste ici pour que le JSON de
// configuration ne soit pas embarqué dans le bundle client.

// Importation des modules
import StatCardShowcase from './StatCardShowcase';
import { LinkCardsSection } from '@/components/ui';
import { getCardsConfig } from '@/features/home/data/homeConfig';
import './page.scss';

const TestStatCardPage = () => {
  const { cards, title, description } = getCardsConfig();

  return (
    <main className="test-stat-card-page">
      <header className="test-stat-card-header">
        <h1 className="test-stat-card-title">StatCard — page de test</h1>
        <p className="test-stat-card-sub">
          Une carte pour présenter un chiffre — indicateur, KPI, métrique — avec
          icône, pilule d&apos;évolution et footer optionnels.
        </p>
      </header>

      <StatCardShowcase />

      {/* ── Section 5 — LinkCardsSection (non-régression) ── */}
      <section className="test-stat-card-section">
        <h2 className="test-stat-card-section-label">LinkCardsSection (non-régression)</h2>
        <LinkCardsSection
          cards={cards.slice(0, 3)}
          cardsPerRow={3}
          title={title}
          description={description} />
      </section>
    </main>
  );
};

export default TestStatCardPage;
