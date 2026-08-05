'use client';

import { useRef, useState } from 'react';

import { withBasePath } from '@/utils/url/withBasePath';

// =================================================================
// USE SEARCH INDEX — chargement paresseux de public/search-index.json
// =================================================================
// Chargé au premier FOCUS du champ de recherche, pas au montage du header :
// la quasi-totalité des visites ne touchent jamais la recherche, inutile de
// payer la requête à chaque navigation. `loadPromiseRef` déduplique les
// appels : un second focus pendant que le premier fetch est en vol réutilise
// la même promesse plutôt que de relancer une requête.

/**
 * Lazily loads the static search index, once per page lifetime.
 *
 * @returns {{index: (Array<Object>|null), isLoading: boolean, ensureLoaded: Function}}
 *   `index` is `null` until loaded (or on failure, an empty array). `ensureLoaded`
 *   triggers the fetch on first call and is a no-op afterwards.
 */
export const useSearchIndex = () => {
    const [index, setIndex] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const loadPromiseRef = useRef(null);

    /**
     * Ensures the index is loaded (or loading), fetching it on first call.
     *
     * @returns {Promise<Array<Object>>} Resolves with the loaded index.
     */
    const ensureLoaded = () => {
        if (loadPromiseRef.current) return loadPromiseRef.current;

        setIsLoading(true);
        // withBasePath : un fetch d'URL absolue ne passe par aucun mécanisme de Next,
        // il faut donc lui ajouter le sous-chemin de déploiement à la main.
        loadPromiseRef.current = fetch(withBasePath('/search-index.json'))
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((data) => {
                setIndex(data);
                return data;
            })
            .catch((err) => {
                console.error("useSearchIndex : échec du chargement de l'index de recherche —", err.message);
                setIndex([]);
                return [];
            })
            .finally(() => setIsLoading(false));

        return loadPromiseRef.current;
    };

    return { index, isLoading, ensureLoaded };
};
