/**
 * Utilitaires pour la gestion du focus
 *
 * Fonctions helpers pour gérer le focus de manière accessible
 */

/**
 * Sélecteur pour tous les éléments potentiellement focusables
 * @constant
 */
export const FOCUSABLE_ELEMENTS_SELECTOR = `
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
export const getFocusableElements = (container) => {
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
      !element.hasAttribute('disabled') &&
      element.tabIndex !== -1
    );
  });
};

/**
 * Trouve le premier élément focusable dans un conteneur
 *
 * @param {HTMLElement} container - Le conteneur à analyser
 * @returns {HTMLElement|null} Le premier élément focusable ou null
 */
export const getFirstFocusableElement = (container) => {
  const focusableElements = getFocusableElements(container);
  return focusableElements.length > 0 ? focusableElements[0] : null;
};

/**
 * Trouve le dernier élément focusable dans un conteneur
 *
 * @param {HTMLElement} container - Le conteneur à analyser
 * @returns {HTMLElement|null} Le dernier élément focusable ou null
 */
export const getLastFocusableElement = (container) => {
  const focusableElements = getFocusableElements(container);
  return focusableElements.length > 0
    ? focusableElements[focusableElements.length - 1]
    : null;
};

/**
 * Focus un élément de manière sécurisée
 *
 * @param {HTMLElement} element - L'élément à focuser
 * @param {Object} options - Options de focus
 * @param {boolean} options.preventScroll - Empêche le scroll automatique
 * @returns {boolean} true si le focus a réussi, false sinon
 */
export const focusElement = (element, options = {}) => {
  if (!element || typeof element.focus !== 'function') {
    return false;
  }

  try {
    element.focus(options);
    return document.activeElement === element;
  } catch (error) {
    console.warn('Failed to focus element:', error);
    return false;
  }
};

/**
 * Vérifie si un élément est focusable
 *
 * @param {HTMLElement} element - L'élément à vérifier
 * @returns {boolean} true si l'élément est focusable
 */
export const isFocusable = (element) => {
  if (!element) return false;

  const style = window.getComputedStyle(element);
  const isVisible =
    style.display !== 'none' && style.visibility !== 'hidden';
  const isEnabled = !element.hasAttribute('disabled');
  const hasValidTabIndex = element.tabIndex >= -1;

  return isVisible && isEnabled && hasValidTabIndex;
};

/**
 * Rend un élément focusable en ajoutant tabindex="-1"
 * Utile pour les éléments qui doivent recevoir le focus programmatiquement
 * mais pas via Tab
 *
 * @param {HTMLElement} element - L'élément à rendre focusable
 * @returns {boolean} true si l'opération a réussi
 */
export const makeFocusable = (element) => {
  if (!element) return false;

  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1');
  }

  return true;
};
