'use client';

// Importation des modules
import { SWRConfig } from 'swr';

/**
 * Global SWR configuration provider. Wraps the whole app so every `useSWR`
 * call, regardless of the feature it lives in, shares one cache and one set
 * of default options instead of each hook re-declaring them.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @returns {JSX.Element}
 */
const SWRProvider = ({ children }) => (
  // dedupingInterval : fenêtre pendant laquelle des requêtes identiques (même
  // clé) émises par plusieurs instances de hook sont fusionnées en un seul
  // fetch. revalidateOnFocus désactivé : les données de métadonnées/filtres
  // sont stables, pas besoin de refetch au retour sur l'onglet.
  <SWRConfig value={{ dedupingInterval: 2000, revalidateOnFocus: false }}>
    {children}
  </SWRConfig>
);

export default SWRProvider;
