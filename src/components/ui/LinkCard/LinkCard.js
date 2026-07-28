import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import './LinkCard.scss';

/**
 * Link card displaying an image, a title and a description, wrapped in a navigation link.
 *
 * @param {Object} props - Component props
 * @param {string} props.image - Image source URL
 * @param {string} props.title - Card title
 * @param {string} props.description - Card description text
 * @param {string} props.link - Navigation link URL
 * @param {string} [props.className] - Additional CSS classes
 */
const LinkCard = ({
  image,
  title,
  description,
  link,
  className = '',
  ...props
}) => {
  return (
    <Link href={link} className={`link-card ${className}`} {...props}>
      {/* Image container avec optimisation Next.js */}
      <figure className="link-card__image">
        <Image
          src={image}
          alt={title}
          width={200}
          height={200}
          className="link-card__image-element"
        />
      </figure>

      {/* Contenu textuel */}
      <article className="link-card__content">
        <h3 className="link-card__title">{title}</h3>
        <p className="link-card__description">{description}</p>
      </article>
    </Link>
  );
};

export default LinkCard;
