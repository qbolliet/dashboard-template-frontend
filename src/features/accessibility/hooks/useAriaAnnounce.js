import { ariaAnnouncer } from '../services/AriaAnnouncer';

/**
 * useAriaAnnounce Hook
 *
 * Hook React pour annoncer des messages aux lecteurs d'écran.
 * Utilise le service AriaAnnouncer en interne.
 *
 * @returns {Function} announce - Fonction pour annoncer un message
 *
 * @example
 * const MyComponent = () => {
 *   const announce = useAriaAnnounce();
 *
 *   const handleClick = () => {
 *     announce('Sidebar opened', 'polite');
 *   };
 *
 *   return <button onClick={handleClick}>Open Sidebar</button>;
 * };
 */
const useAriaAnnounce = () => {
  /**
   * Annonce un message aux lecteurs d'écran
   *
   * @param {string} message - Le message à annoncer
   * @param {('polite'|'assertive')} priority - La priorité de l'annonce
   *   - 'polite': attendra la fin de la lecture en cours (par défaut)
   *   - 'assertive': interrompt la lecture en cours
   */
  const announce = (message, priority = 'polite') => {
    ariaAnnouncer.announce(message, priority);
  };

  return announce;
};

export default useAriaAnnounce;
