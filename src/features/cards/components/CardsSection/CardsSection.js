'use client';

import React from 'react';
import Card from '../Card/Card';
import './CardsSection.scss';

/**
 * Cards section component that displays a grid of cards.
 * Configurable number of cards per row using CSS custom properties.
 * 
 * @param {Array} cardsData - Array of card data objects
 * @param {number} cardsPerRow - Number of cards to display per row (default: 3)
 * @returns {JSX.Element} The rendered cards section component
 */
const CardsSection = ({ cardsData = [], cardsPerRow = 3 }) => {
    return (
        <section 
            className="cards-section" 
            style={{ '--cards-per-row': cardsPerRow }}
        >
            {cardsData.map((card, index) => (
                <Card
                    key={index}
                    image={card.image}
                    title={card.title}
                    description={card.description}
                    link={card.link}
                />
            ))}
        </section>
    );
};

export default CardsSection;