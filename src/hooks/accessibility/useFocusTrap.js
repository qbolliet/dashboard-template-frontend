import { useRef, useEffect } from 'react';
import { getFocusableElements } from '@/utils/accessibility/focusManagement';

/**
 * useFocusTrap Hook
 *
 * Piège le focus clavier à l'intérieur d'un conteneur.
 * Utile pour les modales, les dropdowns, et les overlays.
 *
 * @param {Object} options - Hook options
 * @param {boolean} options.active - Active ou désactive le piège de focus
 * @param {boolean} options.returnFocus - Retourne le focus à l'élément d'origine à la désactivation
 * @param {boolean} options.autoFocus - Focus automatiquement le premier élément focusable à l'activation
 * @returns {React.RefObject} Ref à attacher au conteneur
 *
 * @example
 * const Modal = ({ isOpen }) => {
 *   const focusTrapRef = useFocusTrap({
 *     active: isOpen,
 *     returnFocus: true,
 *     autoFocus: true
 *   });
 *
 *   return (
 *     <div ref={focusTrapRef}>
 *       <button>First</button>
 *       <button>Second</button>
 *       <button>Last</button>
 *     </div>
 *   );
 * };
 */
const useFocusTrap = ({
  active = false,
  returnFocus = true,
  autoFocus = true,
} = {}) => {
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

  return containerRef;
};

export default useFocusTrap;
