import React from 'react';
import PropTypes from 'prop-types';
import VisuallyHidden from '../VisuallyHidden';

/**
 * AccessibleIcon Component
 *
 * Wrapper pour rendre les icônes accessibles aux lecteurs d'écran.
 * Ajoute un label textuel caché visuellement mais lisible par les screen readers.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode|React.Component} props.icon - Composant ou élément icône
 * @param {string} props.label - Label accessible pour l'icône
 * @param {boolean} props.decorative - Si true, marque l'icône comme purement décorative (aria-hidden)
 * @param {string} props.className - Classes CSS additionnelles
 * @returns {React.ReactElement} The rendered component
 *
 * @example
 * // Icône avec label accessible
 * <AccessibleIcon icon={<ChevronIcon />} label="Ouvrir le menu" />
 *
 * // Icône décorative (pas besoin de label)
 * <AccessibleIcon icon={<DecorativeIcon />} decorative />
 *
 * // Avec composant icône
 * <AccessibleIcon icon={ChevronIcon} label="Suivant" />
 */
const AccessibleIcon = ({
  icon: Icon,
  label,
  decorative = false,
  className = '',
  ...props
}) => {
  // Si l'icône est purement décorative, on la masque aux screen readers
  if (decorative) {
    return (
      <span className={className} aria-hidden="true" {...props}>
        {typeof Icon === 'function' ? <Icon /> : Icon}
      </span>
    );
  }

  // Validation : label requis si non-décorative
  if (!label) {
    console.warn(
      'AccessibleIcon: A label is required when decorative is false. ' +
        'Either provide a label or set decorative={true}.'
    );
  }

  // Icône avec label accessible
  return (
    <span className={className} {...props}>
      {typeof Icon === 'function' ? <Icon /> : Icon}
      {label && <VisuallyHidden>{label}</VisuallyHidden>}
    </span>
  );
};

AccessibleIcon.propTypes = {
  /** Composant ou élément icône à rendre */
  icon: PropTypes.oneOfType([PropTypes.func, PropTypes.node]).isRequired,
  /** Label accessible pour l'icône (requis si decorative=false) */
  label: PropTypes.string,
  /** Marque l'icône comme purement décorative (aria-hidden) */
  decorative: PropTypes.bool,
  /** Classes CSS additionnelles */
  className: PropTypes.string,
};

export default AccessibleIcon;
