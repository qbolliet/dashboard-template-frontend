// =================================================================
// FEATURE — minimaps (mini-vues + brush)
// =================================================================
// Descripteur d'interaction intégrée : togglé, il ouvre/ferme les mini-vues sous
// l'axe x / à gauche de l'axe y. Affiché par défaut.

/**
 * Minimaps feature factory.
 *
 * @param {object} [config] - { defaultOn, label }.
 * @returns {object} Feature descriptor (isMinimaps).
 */
export function minimaps(config = {}) {
  return {
    id: 'minimaps',
    kind: 'minimaps',
    label: config.label || 'Afficher les mini-vues',
    icon: 'minimaps',
    roles: ['interaction'],
    supports: () => true,
    defaultOn: config.defaultOn !== false, // affichées par défaut
    isMinimaps: true,
    config,
  };
}
