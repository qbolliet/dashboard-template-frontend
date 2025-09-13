import React from 'react';
import LargeButton from '../../../../components/ui/LargeButton/LargeButton';
import './Hero.scss';

/**
 * Hero section component for home page
 * Server component for better performance
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Hero title text
 * @param {string} props.description - Hero description text
 * @param {Object} props.ctaButton - CTA button configuration {text, link}
 * @param {string} [props.backgroundImage] - Background image URL
 * @param {string} [props.className] - Additional CSS classes
 */
const Hero = ({ 
  title, 
  description, 
  ctaButton, 
  backgroundImage,
  className = '',
  ...props 
}) => {
  return (
    <section className={`hero ${className}`} {...props}>
      {/* Arrière-plan avec motif SVG */}
      {backgroundImage && (
        <div 
          className="hero__background"
          style={{
            backgroundImage: `url(${backgroundImage})`
          }}
          aria-hidden="true"
        />
      )}
      
      {/* Container principal du contenu */}
      <div className="hero__container">
        {/* Contenu textuel */}
        <div className="hero__content">
          <header className="hero__header">
            <h1 className="hero__title">{title}</h1>
            <p className="hero__description">{description}</p>
          </header>
        </div>
        
        {/* Action principale */}
        <div className="hero__action">
          <LargeButton
            href={ctaButton.link}
            text={ctaButton.text}
            className="hero__cta-button"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;