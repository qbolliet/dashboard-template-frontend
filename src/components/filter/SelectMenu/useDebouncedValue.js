import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value`, updated only after `delay` ms of stability.
 *
 * @param {*} value - The value to debounce.
 * @param {number} [delay=250] - Idle delay in ms before the value propagates.
 * @returns {*} The debounced value.
 */
export function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  // Reprogramme un minuteur à chaque changement ; le nettoyage annule le précédent
  // (et le minuteur en cours au démontage), garantissant une seule propagation par pause.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
