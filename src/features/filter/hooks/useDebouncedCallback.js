import { useEffect, useRef, useState } from 'react';

/**
 * Debounces a side-effecting callback, with immediate and flush escape hatches.
 *
 * Sibling of `useDebouncedValue`, on the callback side: instead of returning a delayed
 * value, it returns a stable API whose methods drive *when* `callback` fires. The
 * returned object identity never changes across renders, so it can be passed as a prop
 * (e.g. an `onCommit`) without recreating the consumer's handlers.
 *
 * @param {Function} callback - The callback to invoke. Always the latest instance is
 *   called (kept in a ref), so a changing prop identity does not matter.
 * @param {number} [delay=300] - Debounce delay in ms for `call`.
 * @returns {{call: Function, callNow: Function, flush: Function, cancel: Function}}
 *   - `call(...args)`: invoke after `delay` ms of stability (resets any pending timer).
 *   - `callNow(...args)`: invoke immediately and drop any pending debounced call.
 *   - `flush()`: if a debounced call is pending, invoke it now with its last args.
 *   - `cancel()`: drop any pending debounced call without invoking it.
 */
export function useDebouncedCallback(callback, delay = 300) {
  // Dernière closure/délai, gardés en ref pour ne pas figer une valeur périmée ni changer
  // l'identité de l'API renvoyée.
  const callbackRef = useRef(callback);
  const delayRef = useRef(delay);
  useEffect(() => { callbackRef.current = callback; delayRef.current = delay; });

  // Minuteur en attente + arguments de la dernière programmation (pour flush).
  const timerRef = useRef(null);
  const lastArgsRef = useRef(null);
  const pendingRef = useRef(false);

  // Nettoyage du minuteur au démontage.
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  // API construite UNE seule fois via l'initialiseur de useState (valeur d'état = identité
  // stable, lisible pendant le rendu). Les méthodes ne lisent les refs qu'à l'invocation
  // (event handlers / minuteur), jamais pendant le rendu.
  const [api] = useState(() => {
    const cancel = () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      pendingRef.current = false;
    };
    return {
      cancel,
      // Programmation amortie : chaque appel repousse l'échéance (une invocation par pause).
      call: (...args) => {
        lastArgsRef.current = args;
        pendingRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          pendingRef.current = false;
          callbackRef.current?.(...args);
        }, delayRef.current);
      },
      // Invocation immédiate : annule toute programmation en attente.
      callNow: (...args) => { cancel(); callbackRef.current?.(...args); },
      // Vidage : n'émet que si une invocation amortie est en attente (sinon no-op).
      flush: () => {
        if (!pendingRef.current) return;
        cancel();
        callbackRef.current?.(...(lastArgsRef.current ?? []));
      },
    };
  });
  return api;
}
