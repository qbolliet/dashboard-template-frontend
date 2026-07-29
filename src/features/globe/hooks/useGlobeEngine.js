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
//   • CONFIGURATION FIGÉE — points, arcs et accesseurs sont capturés au PREMIER
//     rendu ; un changement ultérieur de ces props n'est pas répercuté (contrat
//     assumé : remonter le composant avec `key` pour changer de jeu de données).
//     Conséquence directe : aucun effet de resynchronisation de props ici.
//   • THÈME — le moteur n'observe pas le DOM : il reçoit `initialDark` à la
//     construction puis des appels `setTheme()` pilotés par le ThemeProvider.

// Importation des modules
import { useEffect, useRef } from 'react';
import useTheme from '@/features/theme/hooks/useTheme';

/**
 * Tells whether the user asked the system to reduce motion.
 *
 * Colocated here because it gates both sides of the same decision: the React
 * toolbar state of <Globe> and the engine option it is mirrored into. Safe to
 * call during a lazy state initializer (guards against SSR, where `window` is
 * undefined).
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
 * @param {object} config - Engine options frozen at first render (points, arcs,
 *   accessors, default* seeds — see GlobeEngine constructor).
 * @returns {React.RefObject<?GlobeEngine>} Live engine handle (null until the
 *   chunk resolves; callers must tolerate null).
 */
const useGlobeEngine = (stageRef, config) => {
  const engineRef = useRef(null);
  const { isDark } = useTheme();

  // ── Configuration figée au premier rendu ──
  // Un ref, pas un state et surtout pas un effet de synchronisation : la scène
  // est construite UNE fois, l'objet `config` reconstruit à chaque rendu par
  // <Globe> ne doit jamais provoquer de reconstruction.
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
      // et canvas, le contexte WebGL et le DOM injecté dans le stage.
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

  return engineRef;
};

export default useGlobeEngine;
