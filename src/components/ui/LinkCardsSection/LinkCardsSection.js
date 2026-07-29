import React from 'react';
import LinkCard from '../LinkCard/LinkCard';
import CardGrid from '../CardGrid/CardGrid';
import './LinkCardsSection.scss';

/**
 * Section displaying multiple link cards in a responsive grid layout.
 *
 * @param {Object} props - Component props
 * @param {Array} props.cards - Array of card data objects
 * @param {number} [props.cardsPerRow=3] - Number of cards per row on desktop
 * @param {string} [props.title] - Optional section title
 * @param {string} [props.description] - Optional section description
 * @param {string} [props.className] - Additional CSS classes
 */
const LinkCardsSection = ({
  cards = [],
  cardsPerRow = 3,
  title,
  description,
  className = '',
  ...props
}) => {
  return (
    <section className={`link-cards-section ${className}`} {...props}>
      {/* En-tête de section optionnel */}
      {(title || description) && (
        <header className="link-cards-section__header">
          {title && <h2 className="link-cards-section__title">{title}</h2>}
          {description && <p className="link-cards-section__description">{description}</p>}
        </header>
      )}

      {/* Grille de cartes mutualisée ; le responsive propre à la section est posé en CSS */}
      <CardGrid perRow={cardsPerRow}>
        {cards.map((card) => (
          <LinkCard
            key={card.id}
            image={card.image}
            title={card.title}
            description={card.description}
            link={card.link}
          />
        ))}
      </CardGrid>
    </section>
  );
};

export default LinkCardsSection;
