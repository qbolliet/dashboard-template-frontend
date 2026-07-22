// =================================================================
// useMinimapState — modèle d'état des mini-vues : SOURCE DE VÉRITÉ UNIQUE
// =================================================================
// DEUX niveaux d'état, volontairement dissociés — c'est ce qui donne son sens à
// la pastille chevron, IDENTIQUE dans tous les graphiques :
//   • `minimapsVisible` (interrupteur maître de la barre d'outils) — affiche/masque
//     les mini-vues ET leurs pastilles : à faux, RIEN n'est réservé en géométrie
//     (ni bande, ni pied de page, ni gouttière) ;
//   • `xMinimapOpen`/`yMinimapOpen` (pastilles) — replient la seule BANDE de leur
//     axe ; la pastille, elle, reste affichée pour pouvoir la redéplier, et le pli
//     est CONSERVÉ d'un masquage à l'autre.

// Importation des modules
import { useState } from 'react';

/**
 * Resolves the initial visibility of the minimaps from the frame defaults and the
 * toolbar descriptors.
 *
 * Priorité : `defaults.minimaps` > `defaultOn` de la feature « mini-vues » > repli.
 *
 * @param {object} params
 * @param {object} [params.defaults={}] - Frame defaults ({ minimaps?: boolean }).
 * @param {Array<object>} [params.toolbar=[]] - Toolbar feature descriptors.
 * @param {boolean} [params.fallback=true] - Value when neither source decides.
 * @returns {boolean} Whether the minimaps start visible.
 */
export function resolveMinimapsVisible({ defaults = {}, toolbar = [], fallback = true }) {
  if (defaults.minimaps != null) return !!defaults.minimaps;
  const minimapsTool = (toolbar || []).find((t) => t.isMinimaps);
  return minimapsTool ? !!minimapsTool.defaultOn : fallback;
}

/**
 * Minimap state model: the toolbar master switch plus the per-axis folds.
 *
 * Les plis démarrent TOUJOURS dépliés : seul l'interrupteur maître est amorcé par
 * les valeurs par défaut du graphique (cf. resolveMinimapsVisible).
 *
 * @param {boolean} [initialVisible=true] - Initial state of the master switch.
 * @returns {{ minimapsVisible: boolean, setMinimapsVisible: function,
 *   xMinimapOpen: boolean, setXMinimapOpen: function,
 *   yMinimapOpen: boolean, setYMinimapOpen: function }}
 */
export function useMinimapState(initialVisible = true) {
  const [minimapsVisible, setMinimapsVisible] = useState(initialVisible);
  const [xMinimapOpen, setXMinimapOpen] = useState(true);
  const [yMinimapOpen, setYMinimapOpen] = useState(true);

  return {
    minimapsVisible, setMinimapsVisible,
    xMinimapOpen, setXMinimapOpen,
    yMinimapOpen, setYMinimapOpen,
  };
}
