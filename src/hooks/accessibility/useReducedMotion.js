import { useState, useEffect } from 'react';

/**
 * useReducedMotion Hook
 *
 * Détecte si l'utilisateur a activé la préférence "prefers-reduced-motion"
 * dans les paramètres de son système d'exploitation.
 *
 * Cette préférence indique que l'utilisateur souhaite minimiser les animations
 * et mouvements non essentiels pour des raisons d'accessibilité (troubles
 * vestibulaires, épilepsie, etc.).
 *
 * @returns {boolean} true si reduced-motion est activé, false sinon
 *
 * @example
 * const MyComponent = () => {
 *   const prefersReducedMotion = useReducedMotion();
 *   const duration = prefersReducedMotion ? 0 : 300;
 *
 *   return (
 *     <div style={{ transition: `all ${duration}ms` }}>
 *       Contenu
 *     </div>
 *   );
 * };
 */
const useReducedMotion = () => {
  // Fonction pour obtenir la valeur initiale
  const getInitialValue = () => {
    // Support SSR : retourne false si window n'est pas disponible
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mediaQuery.matches;
  };

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialValue);

  useEffect(() => {
    // Vérifie le support de matchMedia
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    /**
     * Handler pour les changements de préférence
     * @param {MediaQueryListEvent} event
     */
    const handleChange = (event) => {
      setPrefersReducedMotion(event.matches);
    };

    // Ajoute l'écouteur d'événements
    // Note: addListener est deprecated mais addEventListener n'est pas supporté
    // par tous les navigateurs pour MediaQueryList
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback pour les navigateurs plus anciens
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback pour les navigateurs plus anciens
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
};

export default useReducedMotion;
