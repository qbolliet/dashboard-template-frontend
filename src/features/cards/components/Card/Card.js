'use client';

import React from 'react';
import Link from 'next/link';
import './Card.scss';

/**
 * Individual card component for displaying content with image, title and description.
 * Uses semantic HTML structure with figure and article elements.
 * 
 * @param {string} image - URL/path to the card image
 * @param {string} title - Title text for the card
 * @param {string} description - Description text for the card
 * @param {string} link - URL/path to navigate to when card is clicked
 * @returns {JSX.Element} The rendered card component
 */
const Card = ({ image, title, description, link }) => {
    return (
        <Link href={link} className="card">
            <figure className="card__image">
                <img src={image} alt={title} />
            </figure>
            <article className="card__content">
                <h2 className="card__title">{title}</h2>
                <p className="card__description">{description}</p>
            </article>
        </Link>
    );
};

export default Card;