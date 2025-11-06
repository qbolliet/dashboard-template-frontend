import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * Sélecteur pour tous les éléments potentiellement focusables
 * @constant
 */
const FOCUSABLE_ELEMENTS_SELECTOR = `
  a[href],
  area[href],
  input:not([disabled]),
  select:not([disabled]),
  textarea:not([disabled]),
  button:not([disabled]),
  iframe,
  object,
  embed,
  [tabindex]:not([tabindex="-1"]),
  [contenteditable]
`;

/**
 * Trouve tous les éléments focusables dans un conteneur
 *
 * @param {HTMLElement} container - Le conteneur à analyser
 * @returns {HTMLElement[]} Liste des éléments focusables
 */
const getFocusableElements = (container) => {
  if (!container) return [];

  const elements = Array.from(
    container.querySelectorAll(FOCUSABLE_ELEMENTS_SELECTOR)
  );

  // Filtre les éléments qui ne sont pas visibles ou disabled
  return elements.filter((element) => {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      !element.hasAttribute('disabled')
    );
  });
};

/**
 * FocusTrap Component
 *
 * Piège le focus clavier à l'intérieur d'un conteneur.
 * Utile pour les modales, les dropdowns, et les overlays.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Contenu dans lequel piéger le focus
 * @param {boolean} props.active - Active ou désactive le piège de focus
 * @param {boolean} props.returnFocus - Retourne le focus à l'élément d'origine à la désactivation
 * @param {boolean} props.autoFocus - Focus automatiquement le premier élément focusable à l'activation
 * @returns {React.ReactElement} The rendered component
 *
 * @example
 * <FocusTrap active={isOpen} returnFocus autoFocus>
 *   <div>
 *     <button>First</button>
 *     <button>Second</button>
 *     <button>Last</button>
 *   </div>
 * </FocusTrap>
 */
const FocusTrap = ({
  children,
  active = false,
  returnFocus = true,
  autoFocus = true,
}) => {
  const containerRef = useRef(null);
  const previouslyFocusedElement = useRef(null);

  useEffect(() => {
    // Si le piège n'est pas actif, on ne fait rien
    if (!active) return;

    // Sauvegarde de l'élément actuellement focusé pour y retourner plus tard
    previouslyFocusedElement.current = document.activeElement;

    // Focus automatique sur le premier élément focusable
    if (autoFocus && containerRef.current) {
      const focusableElements = getFocusableElements(containerRef.current);
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }

    /**
     * Gestion de la touche Tab pour piéger le focus
     * @param {KeyboardEvent} event
     */
    const handleKeyDown = (event) => {
      if (event.key !== 'Tab' || !containerRef.current) return;

      const focusableElements = getFocusableElements(containerRef.current);

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Si Shift+Tab sur le premier élément, aller au dernier
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Si Tab sur le dernier élément, aller au premier
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    };

    // Ajout de l'écouteur d'événements
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup : retour du focus et suppression de l'écouteur
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Retour du focus à l'élément d'origine si demandé
      if (
        returnFocus &&
        previouslyFocusedElement.current &&
        previouslyFocusedElement.current.focus
      ) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [active, autoFocus, returnFocus]);

  return <div ref={containerRef}>{children}</div>;
};

FocusTrap.propTypes = {
  /** Contenu dans lequel piéger le focus */
  children: PropTypes.node.isRequired,
  /** Active ou désactive le piège de focus */
  active: PropTypes.bool,
  /** Retourne le focus à l'élément d'origine à la désactivation */
  returnFocus: PropTypes.bool,
  /** Focus automatiquement le premier élément focusable à l'activation */
  autoFocus: PropTypes.bool,
};

export default FocusTrap;
