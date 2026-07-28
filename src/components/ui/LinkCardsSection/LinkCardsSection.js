import React from 'react';
import Card from '../Card/Card';
import './CardsSection.scss';

/**
 * Cards section component that displays multiple cards in a responsive grid layout
 * 
 * @param {Object} props - Component props
 * @param {Array} props.cards - Array of card data objects
 * @param {number} [props.cardsPerRow=3] - Number of cards per row on desktop
 * @param {string} [props.title] - Optional section title
 * @param {string} [props.description] - Optional section description
 * @param {string} [props.className] - Additional CSS classes
 */
const CardsSection = ({ 
  cards = [], 
  cardsPerRow = 3, 
  title,
  description,
  className = '',
  ...props 
}) => {
  return (
    <section className={`cards-section ${className}`} {...props}>
      {/* En-tête de section optionnel */}
      {(title || description) && (
        <header className="cards-section__header">
          {title && <h2 className="cards-section__title">{title}</h2>}
          {description && <p className="cards-section__description">{description}</p>}
        </header>
      )}
      
      {/* Grille de cartes */}
      <div 
        className="cards-section__grid" 
        style={{ '--cards-per-row': cardsPerRow }}
      >
        {cards.map((card) => (
          <Card
            key={card.id}
            image={card.image}
            title={card.title}
            description={card.description}
            link={card.link}
          />
        ))}
      </div>
    </section>
  );
};

export default CardsSection;