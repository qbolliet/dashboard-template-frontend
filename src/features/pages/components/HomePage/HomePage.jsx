// Importation des modules
import { Hero } from '@/features/home/components';
import { LinkCardsSection } from '@/components/ui';
import { getHomeConfig } from '@/features/home/data/homeConfig';

/**
 * Page template for `home` nodes: hero banner and a grid of link cards.
 *
 * Its content comes from `config/content/home.json`, not from the manifest node —
 * the node only decides *where* the page lives. Server Component.
 *
 * Renders no `<main>`: the catch-all route already provides it.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.node - Manifest node being rendered (unused: the home page
 *   draws its wording from its own content file).
 * @returns {JSX.Element} The rendered home page.
 */
const HomePage = () => {
    const { hero, cards, cardsSection } = getHomeConfig();

    return (
        <>
            <Hero
                title={hero.title}
                description={hero.description}
                ctaButton={hero.ctaButton}
                backgroundImage={hero.backgroundImage} />
            <LinkCardsSection
                cards={cards}
                cardsPerRow={cardsSection.cardsPerRow}
                title={cardsSection.title}
                description={cardsSection.description} />
        </>
    );
};

export default HomePage;
