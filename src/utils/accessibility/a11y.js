/**
 * Utilitaires généraux d'accessibilité
 *
 * Fonctions helpers pour améliorer l'accessibilité
 */

/**
 * Génère un ID unique pour les attributs ARIA
 * Utile pour aria-labelledby, aria-describedby, aria-controls, etc.
 *
 * @param {string} prefix - Préfixe de l'ID
 * @returns {string} ID unique
 */
let idCounter = 0;
export const generateId = (prefix = 'a11y') => {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
};

/**
 * Vérifie si l'utilisateur préfère le mode reduced-motion
 *
 * @returns {boolean} true si reduced-motion est activé
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
};

/**
 * Vérifie si un élément est visible à l'écran
 *
 * @param {HTMLElement} element - L'élément à vérifier
 * @returns {boolean} true si l'élément est visible
 */
export const isElementVisible = (element) => {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    rect.width > 0 &&
    rect.height > 0
  );
};

/**
 * Obtient le texte accessible d'un élément
 * Prend en compte aria-label, aria-labelledby, et le contenu textuel
 *
 * @param {HTMLElement} element - L'élément dont extraire le texte
 * @returns {string} Le texte accessible
 */
export const getAccessibleText = (element) => {
  if (!element) return '';

  // Priorité 1 : aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Priorité 2 : aria-labelledby
  const ariaLabelledby = element.getAttribute('aria-labelledby');
  if (ariaLabelledby) {
    const labelElement = document.getElementById(ariaLabelledby);
    if (labelElement) {
      return labelElement.textContent.trim();
    }
  }

  // Priorité 3 : contenu textuel
  return element.textContent.trim();
};

/**
 * Crée une annonce pour les lecteurs d'écran de manière programmatique
 * Alternative légère au service AriaAnnouncer pour des cas simples
 *
 * @param {string} message - Le message à annoncer
 * @param {('polite'|'assertive')} priority - La priorité de l'annonce
 * @param {number} timeout - Durée avant cleanup (ms)
 */
export const announce = (message, priority = 'polite', timeout = 1000) => {
  if (!message || typeof document === 'undefined') return;

  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
  liveRegion.setAttribute('aria-live', priority);
  liveRegion.setAttribute('aria-atomic', 'true');
  liveRegion.style.cssText = `
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  `;

  document.body.appendChild(liveRegion);

  // Ajout du message après un court délai pour assurer la détection
  setTimeout(() => {
    liveRegion.textContent = message;
  }, 100);

  // Cleanup
  setTimeout(() => {
    if (liveRegion.parentNode) {
      liveRegion.parentNode.removeChild(liveRegion);
    }
  }, timeout);
};

/**
 * Détecte si l'utilisateur navigue au clavier
 * Utile pour styliser différemment le focus clavier vs souris
 *
 * @returns {void}
 */
export const setupKeyboardDetection = () => {
  if (typeof document === 'undefined') return;

  let isUsingKeyboard = false;

  // Détecte l'utilisation du clavier
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      isUsingKeyboard = true;
      document.body.classList.add('using-keyboard');
    }
  });

  // Détecte l'utilisation de la souris
  document.addEventListener('mousedown', () => {
    isUsingKeyboard = false;
    document.body.classList.remove('using-keyboard');
  });
};

/**
 * Vérifie si le mode high contrast est activé (Windows)
 *
 * @returns {boolean} true si high contrast est activé
 */
export const isHighContrastMode = () => {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return false;
  }

  const mediaQuery = window.matchMedia('(prefers-contrast: high)');
  return mediaQuery.matches;
};
