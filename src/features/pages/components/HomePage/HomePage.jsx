// Importation des modules
import { Hero } from '@/features/home/components';
import { LinkCardsSection } from '@/components/ui';
import { getHomeConfig } from '@/features/home/data/homeConfig';

/**
 * Page template for `home` nodes: hero banner and a grid of link cards.
 *
 * Its content comes from `config/content/home.json`, not from the manifest node —
 * the node only decides *where* the page lives, so this template ignores the `node`
 * prop the route passes to every page type. Server Component.
 *
 * Renders no `<main>`: the catch-all route already provides it.
 *
 * @param {Object} props - Component props.
 * @param {string} props.locale - Current locale code, used to resolve that content file.
 * @returns {JSX.Element} The rendered home page.
 */
const HomePage = ({ locale }) => {
    const { hero, cards, cardsSection } = getHomeConfig(locale);

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
