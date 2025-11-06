/**
 * Accessibility Feature
 *
 * Composants, hooks et utilitaires réutilisables pour l'accessibilité
 */

// ===== COMPOSANTS =====
export { default as VisuallyHidden } from './components/VisuallyHidden';
export { default as FocusTrap } from './components/FocusTrap';
export { default as SkipLink } from './components/SkipLink';
export { default as AccessibleIcon } from './components/AccessibleIcon';

// ===== HOOKS =====
export { default as useAriaAnnounce } from './hooks/useAriaAnnounce';
export { default as useFocusReturn } from './hooks/useFocusReturn';
export { default as useKeyboardNavigation } from './hooks/useKeyboardNavigation';
export { default as useReducedMotion } from './hooks/useReducedMotion';

// ===== SERVICES =====
export { ariaAnnouncer } from './services/AriaAnnouncer';

// ===== UTILITAIRES =====
export {
  FOCUSABLE_ELEMENTS_SELECTOR,
  getFocusableElements,
  getFirstFocusableElement,
  getLastFocusableElement,
  focusElement,
  isFocusable,
  makeFocusable,
} from './utils/focusManagement';

export {
  generateId,
  prefersReducedMotion,
  isElementVisible,
  getAccessibleText,
  announce,
  setupKeyboardDetection,
  isHighContrastMode,
} from './utils/a11y';
