// =================================================================
// useGlobeEngine — cycle de vie du moteur Three.js
// =================================================================
// Seul endroit du monde React qui touche au moteur. Trois responsabilités, et
// rien d'autre :
//   • CHARGEMENT — le moteur est importé par un `import()` DYNAMIQUE. C'est CE
//     point d'import qui isole `three` (~150 kB gzip) dans un chunk asynchrone :
//     aucun module React ne doit importer statiquement `engine/GlobeEngine`,
//     sinon la bibliothèque retombe dans le bundle partagé (et s'exécuterait au
//     SSR, où `window` n'existe pas).
//   • CONFIGURATION — les DONNÉES (points, arcs, accesseurs) sont capturées au
//     PREMIER rendu ; un changement ultérieur de ces props n'est pas répercuté
//     (contrat assumé : remonter le composant avec `key` pour changer de jeu de
//     données). Les INTERRUPTEURS, eux, restent une graine vivante que l'hôte
//     met à jour par `applyOption` : le chunk `three` met plusieurs centaines de
//     ms à se résoudre sur cache froid, et un geste passé pendant cette fenêtre
//     doit se retrouver dans la scène qui naît ensuite. Dans les deux cas :
//     aucun effet de resynchronisation de props ici, la mise à jour est poussée
//     par l'hôte, jamais tirée du rendu.
//   • THÈME — le moteur n'observe pas le DOM : il reçoit `initialDark` à la
//     construction puis des appels `setTheme()` pilotés par le ThemeProvider.

// Importation des modules
import { useCallback, useEffect, useRef } from 'react';
import useTheme from '@/features/theme/hooks/useTheme';

/**
 * Tells whether the user asked the system to reduce motion.
 *
 * Colocated here because it gates both sides of the same decision: the React
 * toolbar state of <Globe> and the engine options it is mirrored into. Called
 * from a MOUNT EFFECT, never during render: the server cannot know the
 * preference, so reading it while rendering would diverge from the server HTML
 * (see the degradation effect in <Globe>). The SSR guard is kept nonetheless —
 * the module is imported by a server-rendered tree.
 *
 * @returns {boolean} True when `prefers-reduced-motion: reduce` matches.
 */
export const prefersReducedMotion = () => (
  typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

/**
 * Owns the GlobeEngine lifecycle: lazily imports the Three.js engine chunk,
 * instantiates it on the stage element, keeps it in sync with the app theme,
 * and disposes it on unmount (StrictMode-safe).
 *
 * @param {React.RefObject<HTMLElement>} stageRef - Engine mount node.
 * @param {object} config - Engine options captured at first render (points, arcs,
 *   accessors, default* seeds — see GlobeEngine constructor).
 * @returns {{engineRef: React.RefObject<?GlobeEngine>,
 *   applyOption: function(string, *, ?string): void}} `engineRef` is the live
 *   engine handle (null until the chunk resolves; callers must tolerate null),
 *   `applyOption` the single write path towards the engine.
 */
const useGlobeEngine = (stageRef, config) => {
  const engineRef = useRef(null);
  const { isDark } = useTheme();

  // ── Configuration capturée au premier rendu ──
  // Un ref, pas un state et surtout pas un effet de synchronisation : la scène
  // est construite UNE fois, l'objet `config` reconstruit à chaque rendu par
  // <Globe> ne doit jamais provoquer de reconstruction. Seul `applyOption`
  // réécrit ce ref, hors rendu.
  const configRef = useRef(null);
  if (configRef.current === null) configRef.current = config;

  // Thème courant lisible hors rendu. Initialisé avec la valeur du premier
  // rendu pour que la construction du moteur parte de la bonne palette même si
  // le chunk se résout avant tout changement de thème.
  const isDarkRef = useRef(isDark);

  // ── Montage : import du chunk puis instanciation ──
  // Effet de MONTAGE : aucune valeur réactive n'est lue (le thème passe par un
  // ref, la config est figée). `stageRef` n'est listé que parce que la règle
  // exhaustive-deps ne peut pas savoir qu'un ref reçu en prop a une identité
  // stable ; <Globe> le crée une fois avec useRef, l'effet ne rejoue donc jamais.
  useEffect(() => {
    let cancelled = false;
    let engine = null;

    import('../engine/GlobeEngine').then(({ default: GlobeEngine }) => {
      // Le chargement du chunk est asynchrone : en StrictMode (dev), React monte,
      // démonte puis remonte le composant, et le nettoyage du premier montage
      // peut tomber AVANT cette résolution. Sans ces deux gardes, un moteur
      // orphelin (canvas + boucle rAF + écoutes window) survivrait au démontage.
      if (cancelled || !stageRef.current) return;
      engine = new GlobeEngine(stageRef.current, {
        ...configRef.current,
        // Thème AU MOMENT de la construction, pas à celui du premier rendu :
        // l'utilisateur a pu basculer pendant le chargement du chunk.
        initialDark: isDarkRef.current,
      });
      engineRef.current = engine;
    });

    return () => {
      cancelled = true;
      // `dispose()` libère la boucle rAF, le ResizeObserver, les écoutes window
      // et canvas, les ressources GPU (géométries, matériaux, textures), le
      // contexte WebGL — rendu au navigateur via forceContextLoss(), sans quoi
      // quelques allers-retours suffisent à saturer son quota de contextes — et
      // le DOM injecté dans le stage. L'appel est idempotent.
      engine?.dispose();
      engineRef.current = null;
    };
  }, [stageRef]);

  // ── Thème : simple appel moteur, jamais de setState ──
  // Tolère le moteur pas encore prêt (chunk en vol) : la valeur est mémorisée
  // dans le ref et sera injectée comme `initialDark` à la construction.
  useEffect(() => {
    isDarkRef.current = isDark;
    engineRef.current?.setTheme(isDark);
  }, [isDark]);

  // ── Écriture vers le moteur : UNIQUE chemin ──
  /**
   * Mirrors a toggle onto the engine — and, either way, onto the config the
   * engine will be built from.
   *
   * The seed is rewritten EVEN when the engine already exists, so it stays a
   * faithful mirror of the current state; and when the engine does not exist yet
   * (its chunk is still in flight), it is the only thing that survives — without
   * it the gesture would be lost and the scene would be born on the original
   * `default*` values.
   *
   * @param {string} field - Engine option name (identical to the matching React
   *   state field in <Globe>, which spreads its state into the config).
   * @param {*} value - New value.
   * @param {?string} [setter] - Engine method to call with `value`. Omitted when
   *   the caller already drove the engine itself (`mode`, via toggleMode()).
   * @returns {void}
   */
  const applyOption = useCallback((field, value, setter = null) => {
    // Réécriture de l'objet plutôt que mutation d'un champ : `configRef.current`
    // est l'objet produit par le rendu de <Globe>, on n'y touche pas en place.
    configRef.current = { ...configRef.current, [field]: value };
    if (setter) engineRef.current?.[setter](value);
    // Dépendances vides : ce n'est pas de la mémoïsation de performance (le React
    // Compiler s'en charge) mais une identité STABLE fonctionnellement exigée —
    // <Globe> consomme cette fonction comme dépendance d'un effet de montage, qui
    // ne doit jamais rejouer. La closure ne capture que des refs, elle reste donc
    // correcte quelle que soit sa date de création.
  }, []);

  return { engineRef, applyOption };
};

export default useGlobeEngine;
