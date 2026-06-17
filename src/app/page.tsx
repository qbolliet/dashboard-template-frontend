import { Hero } from '../features/home/components';
import { CardsSection } from '../components/ui';
import { getHomeConfig } from '../features/home/data/homeConfig';

export default function Home() {
  // Récupération des données de configuration
  const { hero, cards, cardsSection } = getHomeConfig();

  return (
    <>
      {/* Section héro avec titre, description et bouton d'action */}
      <Hero
        title={hero.title}
        description={hero.description}
        ctaButton={hero.ctaButton}
        backgroundImage={hero.backgroundImage}
      />
      
      {/* Section des cartes avec grille responsive */}
      <CardsSection
        cards={cards}
        cardsPerRow={cardsSection.cardsPerRow}
        title={cardsSection.title}
        description={cardsSection.description}
      />
    </>
  );
}
