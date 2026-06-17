import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * useKeyboardNavigation Hook
 *
 * Hook générique pour implémenter la navigation au clavier dans des listes.
 * Supporte les arrow keys, Home/End, et optionnellement le type-ahead.
 *
 * @param {Object} options - Options de configuration
 * @param {Array} options.items - Tableau des items navigables
 * @param {('vertical'|'horizontal')} options.orientation - Orientation de la navigation (défaut: 'vertical')
 * @param {boolean} options.loop - Permet de boucler au début/fin (défaut: true)
 * @param {boolean} options.typeAhead - Active la recherche par frappe (défaut: false)
 * @param {Function} options.getItemText - Fonction pour extraire le texte d'un item (pour type-ahead)
 * @param {number} options.initialIndex - Index initial (défaut: -1, aucun focus)
 * @returns {Object} API du hook
 *
 * @example
 * const items = ['Item 1', 'Item 2', 'Item 3'];
 * const { focusedIndex, handleKeyDown, setFocusedIndex } = useKeyboardNavigation({
 *   items,
 *   orientation: 'vertical',
 *   loop: true
 * });
 */
const useKeyboardNavigation = ({
  items = [],
  orientation = 'vertical',
  loop = true,
  typeAhead = false,
  getItemText = (item) => (typeof item === 'string' ? item : item.name || ''),
  initialIndex = -1,
} = {}) => {
  const [focusedIndex, setFocusedIndex] = useState(initialIndex);
  const typeAheadBuffer = useRef('');
  const typeAheadTimeout = useRef(null);

  // Réinitialise le buffer de type-ahead
  const clearTypeAheadBuffer = useCallback(() => {
    typeAheadBuffer.current = '';
    if (typeAheadTimeout.current) {
      clearTimeout(typeAheadTimeout.current);
    }
  }, []);

  // Recherche par type-ahead
  const findItemByText = useCallback(
    (searchText) => {
      const normalizedSearch = searchText.toLowerCase();
      const startIndex = focusedIndex + 1;

      // Recherche à partir de l'élément suivant
      for (let i = 0; i < items.length; i++) {
        const index = (startIndex + i) % items.length;
        const itemText = getItemText(items[index]).toLowerCase();

        if (itemText.startsWith(normalizedSearch)) {
          return index;
        }
      }

      return -1;
    },
    [items, focusedIndex, getItemText]
  );

  /**
   * Calcule le prochain index basé sur la direction
   *
   * @param {number} currentIndex - Index actuel
   * @param {('next'|'previous'|'first'|'last')} direction - Direction du mouvement
   * @returns {number} Le nouvel index
   */
  const getNextIndex = useCallback(
    (currentIndex, direction) => {
      const itemCount = items.length;

      if (itemCount === 0) return -1;

      switch (direction) {
        case 'first':
          return 0;

        case 'last':
          return itemCount - 1;

        case 'next': {
          if (currentIndex === itemCount - 1) {
            return loop ? 0 : currentIndex;
          }
          return currentIndex + 1;
        }

        case 'previous': {
          if (currentIndex <= 0) {
            return loop ? itemCount - 1 : 0;
          }
          return currentIndex - 1;
        }

        default:
          return currentIndex;
      }
    },
    [items.length, loop]
  );

  /**
   * Handler pour les événements clavier
   *
   * @param {KeyboardEvent} event - L'événement clavier
   */
  const handleKeyDown = useCallback(
    (event) => {
      const isVertical = orientation === 'vertical';
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

      let direction = null;

      switch (event.key) {
        case nextKey:
          direction = 'next';
          break;

        case prevKey:
          direction = 'previous';
          break;

        case 'Home':
          direction = 'first';
          break;

        case 'End':
          direction = 'last';
          break;

        default:
          // Type-ahead : recherche par frappe
          if (typeAhead && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
            event.preventDefault();

            // Ajoute la lettre au buffer
            typeAheadBuffer.current += event.key;

            // Recherche l'item correspondant
            const matchIndex = findItemByText(typeAheadBuffer.current);
            if (matchIndex !== -1) {
              setFocusedIndex(matchIndex);
            }

            // Reset du buffer après 500ms
            if (typeAheadTimeout.current) {
              clearTimeout(typeAheadTimeout.current);
            }
            typeAheadTimeout.current = setTimeout(clearTypeAheadBuffer, 500);
          }
          return;
      }

      if (direction) {
        event.preventDefault();
        const newIndex = getNextIndex(focusedIndex, direction);
        setFocusedIndex(newIndex);
      }
    },
    [
      orientation,
      focusedIndex,
      getNextIndex,
      typeAhead,
      findItemByText,
      clearTypeAheadBuffer,
    ]
  );

  // Cleanup du timeout au démontage
  useEffect(() => {
    return () => {
      if (typeAheadTimeout.current) {
        clearTimeout(typeAheadTimeout.current);
      }
    };
  }, []);

  return {
    /** Index de l'élément actuellement focusé */
    focusedIndex,
    /** Fonction pour définir manuellement l'index focusé */
    setFocusedIndex,
    /** Handler d'événement clavier à attacher au conteneur */
    handleKeyDown,
    /** Handler pour réinitialiser le focus */
    resetFocus: useCallback(() => setFocusedIndex(-1), []),
  };
};

export default useKeyboardNavigation;
