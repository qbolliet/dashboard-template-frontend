import { useEffect, useLayoutEffect } from 'react';

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * Avoids React's "useLayoutEffect does nothing on the server" warning for
 * client components that are still SSR-rendered (e.g. by the App Router),
 * while preserving pre-paint measurement once mounted in the browser.
 *
 * @type {typeof useLayoutEffect}
 */
export const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
