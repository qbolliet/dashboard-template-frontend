/**
 * AriaAnnouncer Service
 *
 * Service singleton pour annoncer des messages aux lecteurs d'écran
 * via des live regions ARIA.
 *
 * Ce service crée deux live regions invisibles dans le DOM :
 * - Une "polite" pour les annonces non-urgentes
 * - Une "assertive" pour les annonces importantes qui interrompent
 *
 * @example
 * import { ariaAnnouncer } from '@/features/accessibility/services/AriaAnnouncer';
 *
 * ariaAnnouncer.announce('Sidebar opened', 'polite');
 * ariaAnnouncer.announce('Error occurred', 'assertive');
 */

class AriaAnnouncer {
  constructor() {
    this.initialized = false;
    this.politeRegion = null;
    this.assertiveRegion = null;
    this.announceTimeout = null;
  }

  /**
   * Initialise le service en créant les live regions dans le DOM
   * Appelée automatiquement au premier usage
   *
   * @private
   */
  initialize() {
    if (this.initialized || typeof document === 'undefined') {
      return;
    }

    // Création du conteneur pour les live regions
    const container = document.createElement('div');
    container.id = 'aria-announcer';
    container.style.cssText = `
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

    // Création de la live region "polite"
    this.politeRegion = document.createElement('div');
    this.politeRegion.setAttribute('role', 'status');
    this.politeRegion.setAttribute('aria-live', 'polite');
    this.politeRegion.setAttribute('aria-atomic', 'true');

    // Création de la live region "assertive"
    this.assertiveRegion = document.createElement('div');
    this.assertiveRegion.setAttribute('role', 'alert');
    this.assertiveRegion.setAttribute('aria-live', 'assertive');
    this.assertiveRegion.setAttribute('aria-atomic', 'true');

    container.appendChild(this.politeRegion);
    container.appendChild(this.assertiveRegion);
    document.body.appendChild(container);

    this.initialized = true;
  }

  /**
   * Annonce un message aux lecteurs d'écran
   *
   * @param {string} message - Le message à annoncer
   * @param {('polite'|'assertive')} priority - La priorité de l'annonce
   *   - 'polite': attendra la fin de la lecture en cours (par défaut)
   *   - 'assertive': interrompt la lecture en cours
   */
  announce(message, priority = 'polite') {
    if (!message || typeof message !== 'string') {
      return;
    }

    // Initialisation si nécessaire
    if (!this.initialized) {
      this.initialize();
    }

    // Sélection de la région appropriée
    const region = priority === 'assertive' ? this.assertiveRegion : this.politeRegion;

    if (!region) {
      return;
    }

    // Nettoyage du timeout précédent
    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
    }

    // Mise à jour du contenu de la live region
    region.textContent = message;

    // Nettoyage après 1 seconde pour permettre de nouvelles annonces
    this.announceTimeout = setTimeout(() => {
      region.textContent = '';
    }, 1000);
  }

  /**
   * Nettoie les live regions et réinitialise le service
   * Utile pour les tests ou le cleanup
   */
  destroy() {
    if (!this.initialized) {
      return;
    }

    const container = document.getElementById('aria-announcer');
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }

    if (this.announceTimeout) {
      clearTimeout(this.announceTimeout);
    }

    this.politeRegion = null;
    this.assertiveRegion = null;
    this.initialized = false;
  }
}

// Export du singleton
export const ariaAnnouncer = new AriaAnnouncer();
export default ariaAnnouncer;
