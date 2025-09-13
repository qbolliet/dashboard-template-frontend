import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './Card.scss';

/**
 * Card component for displaying content with image, title and description
 * 
 * @param {Object} props - Component props
 * @param {string} props.image - Image source URL
 * @param {string} props.title - Card title
 * @param {string} props.description - Card description text
 * @param {string} props.link - Navigation link URL
 * @param {string} [props.className] - Additional CSS classes
 */
const Card = ({ 
  image, 
  title, 
  description, 
  link, 
  className = '',
  ...props 
}) => {
  return (
    <Link href={link} className={`card ${className}`} {...props}>
      {/* Image container avec optimisation Next.js */}
      <figure className="card__image">
        <Image 
          src={image} 
          alt={title}
          width={200}
          height={200}
          className="card__image-element"
        />
      </figure>
      
      {/* Contenu textuel */}
      <article className="card__content">
        <h3 className="card__title">{title}</h3>
        <p className="card__description">{description}</p>
      </article>
    </Link>
  );
};

export default Card;