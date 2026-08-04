import React from 'react';
import PropTypes from 'prop-types';
import './VisuallyHidden.scss';

/**
 * VisuallyHidden component
 *
 * Masks content visually while keeping it accessible to screen readers.
 * Useful for providing additional context or labels that shouldn't be visible
 * but are important for accessibility.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Content to be visually hidden
 * @param {string} props.as - HTML tag to render (default: 'span')
 * @returns {React.ReactElement} The rendered component
 *
 * @example
 * <VisuallyHidden>This text is only for screen readers</VisuallyHidden>
 * <VisuallyHidden as="div">Important context</VisuallyHidden>
 */
const VisuallyHidden = ({ children, as: Component = 'span', ...props }) => {
  return (
    <Component className="visually-hidden" {...props}>
      {children}
    </Component>
  );
};

VisuallyHidden.propTypes = {
  /** Contenu à masquer visuellement */
  children: PropTypes.node.isRequired,
  /** Tag HTML à utiliser pour le wrapper */
  as: PropTypes.string,
};

export default VisuallyHidden;
