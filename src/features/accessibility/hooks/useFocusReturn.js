import { useRef, useCallback } from 'react';

/**
 * useFocusReturn Hook
 *
 * Hook pour mémoriser et restaurer le focus d'un élément.
 * Utile pour retourner le focus après la fermeture d'une modale,
 * d'un dropdown, ou après une navigation.
 *
 * @returns {Object} API du hook
 * @returns {Function} saveFocus - Sauvegarde l'élément actuellement focusé
 * @returns {Function} restoreFocus - Restaure le focus sur l'élément sauvegardé
 * @returns {Function} clearSavedFocus - Nettoie la référence sauvegardée
 *
 * @example
 * const MyModal = ({ isOpen, onClose }) => {
 *   const { saveFocus, restoreFocus } = useFocusReturn();
 *
 *   useEffect(() => {
 *     if (isOpen) {
 *       saveFocus();
 *     }
 *   }, [isOpen, saveFocus]);
 *
 *   const handleClose = () => {
 *     restoreFocus();
 *     onClose();
 *   };
 *
 *   return isOpen && <div>Modal content</div>;
 * };
 */
const useFocusReturn = () => {
  const savedFocusElement = useRef(null);

  /**
   * Sauvegarde l'élément actuellement focusé
   *
   * @param {HTMLElement} [element] - Élément à sauvegarder (par défaut: document.activeElement)
   */
  const saveFocus = useCallback((element = null) => {
    savedFocusElement.current = element || document.activeElement;
  }, []);

  /**
   * Restaure le focus sur l'élément précédemment sauvegardé
   *
   * @returns {boolean} true si le focus a été restauré, false sinon
   */
  const restoreFocus = useCallback(() => {
    if (
      savedFocusElement.current &&
      typeof savedFocusElement.current.focus === 'function'
    ) {
      try {
        savedFocusElement.current.focus();
        return true;
      } catch (error) {
        console.warn('Failed to restore focus:', error);
        return false;
      }
    }
    return false;
  }, []);

  /**
   * Nettoie la référence à l'élément sauvegardé
   */
  const clearSavedFocus = useCallback(() => {
    savedFocusElement.current = null;
  }, []);

  return {
    saveFocus,
    restoreFocus,
    clearSavedFocus,
  };
};

export default useFocusReturn;
