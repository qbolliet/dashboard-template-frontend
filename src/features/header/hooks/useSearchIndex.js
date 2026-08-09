'use client';

import { useRef, useState } from 'react';

import { withBasePath } from '@/utils/url/withBasePath';

// =================================================================
// USE SEARCH INDEX — chargement paresseux de public/search-index.<langue>.json
// =================================================================
// UN INDEX PAR LANGUE (P5.4) : les libellés ET les chemins des suggestions diffèrent
// d'une langue à l'autre. Le nom de fichier est le contrat partagé avec
// scripts/build-search-index.js — le changer d'un côté seulement rend la recherche
// muette sans lever d'erreur visible.
// Chargé au premier FOCUS du champ de recherche, pas au montage du header :
// la quasi-totalité des visites ne touchent jamais la recherche, inutile de
// payer la requête à chaque navigation. `loadPromiseRef` déduplique les
// appels : un second focus pendant que le premier fetch est en vol réutilise
// la même promesse plutôt que de relancer une requête.

/**
 * Lazily loads the static search index, once per page lifetime.
 *
 * @param {string} locale - Site locale code. Selects which index file is fetched.
 * @returns {{index: (Array<Object>|null), isLoading: boolean, ensureLoaded: Function}}
 *   `index` is `null` until loaded (or on failure, an empty array). `ensureLoaded`
 *   triggers the fetch on first call and is a no-op afterwards.
 */
export const useSearchIndex = (locale) => {
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
        loadPromiseRef.current = fetch(withBasePath(`/search-index.${locale}.json`))
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
