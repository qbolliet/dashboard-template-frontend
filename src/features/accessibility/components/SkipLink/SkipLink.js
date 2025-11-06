import React from 'react';
import PropTypes from 'prop-types';
import './SkipLink.scss';

/**
 * SkipLink Component
 *
 * Lien permettant aux utilisateurs de clavier de sauter la navigation
 * et d'accéder directement au contenu principal.
 *
 * Le lien est invisible par défaut et n'apparaît que lorsqu'il reçoit
 * le focus via la touche Tab.
 *
 * @param {Object} props - Component props
 * @param {string} props.href - ID de l'élément cible (avec #)
 * @param {React.ReactNode} props.children - Texte du lien
 * @param {string} props.className - Classes CSS additionnelles
 * @returns {React.ReactElement} The rendered component
 *
 * @example
 * <SkipLink href="#main-content">Passer la navigation</SkipLink>
 */
const SkipLink = ({ href, children, className = '', ...props }) => {
  /**
   * Gère le clic sur le skip link
   * Focus l'élément cible après le défilement
   *
   * @param {Event} event - L'événement de clic
   */
  const handleClick = (event) => {
    // Laisse le comportement par défaut (scroll) se produire
    // puis focus l'élément cible
    setTimeout(() => {
      const targetElement = document.querySelector(href);
      if (targetElement) {
        // Assure que l'élément peut recevoir le focus
        if (!targetElement.hasAttribute('tabindex')) {
          targetElement.setAttribute('tabindex', '-1');
        }
        targetElement.focus();
      }
    }, 100);
  };

  return (
    <a
      href={href}
      className={`skip-link ${className}`.trim()}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  );
};

SkipLink.propTypes = {
  /** ID de l'élément cible (avec #) */
  href: PropTypes.string.isRequired,
  /** Texte du lien */
  children: PropTypes.node.isRequired,
  /** Classes CSS additionnelles */
  className: PropTypes.string,
};

export default SkipLink;
