'use client';

// Importation des modules
import { useEffect, useId, useState } from 'react';
import { useDebouncedValue } from '@/hooks/debounce/useDebouncedValue';
import { withBasePath } from '@/utils/url/withBasePath';
import TokenChain from './TokenChain';
import TokenSwatch from './TokenSwatch';
import './TokenReference.scss';

// =================================================================
// TOKEN REFERENCE — les 880 propriétés du dépôt, cherchables
// =================================================================
// Consomme public/tokens.json, produit par scripts/build-tokens-doc.js en lisant
// src/styles/globals/ et les 95 fichiers _tokens.scss / _colors.scss. La référence est
// donc GÉNÉRÉE : elle ne peut pas diverger du code, et une propriété ajoutée apparaît
// ici sans que personne ait à y penser.
//
// CHARGÉ PAR FETCH, PAS IMPORTÉ : le fichier pèse ~350 Ko une fois les chaînes de
// dérivation incluses. Importé, il partirait dans le chunk de la page ; servi depuis
// public/, il ne coûte rien aux quatre autres pages des Fondations. `withBasePath` est
// obligatoire — un fetch d'URL absolue ne passe par aucun mécanisme de Next et
// renverrait 404 sous le sous-chemin de déploiement, jamais en local (cf. l'en-tête de
// src/utils/url/withBasePath.js). Même montage que useSearchIndex.
//
// LE FILTRE N'EST PAS UN CONFORT : 880 lignes d'affilée ne se lisent pas. La recherche,
// les quatre niveaux et la liste des features sont ce qui rend la page utilisable.
//
// LA COLONNE À NE PAS SACRIFIER est la chaîne de dérivation : c'est elle qui apprend À
// QUEL NIVEAU surcharger pour obtenir l'effet voulu, ce qu'aucune autre colonne ne dit.

// Plafond d'affichage. Au-delà, le navigateur peine et la page ne se lit plus de toute
// façon : mieux vaut inviter à filtrer que rendre 880 lignes dont personne ne veut.
const MAX_ROWS = 100;

/**
 * Reads the reference once per page lifetime.
 *
 * @returns {{data: (Object|null), error: (string|null)}} The payload, or the failure.
 */
const useTokensIndex = () => {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        // `ignore` neutralise la réponse d'un fetch dont le composant est déjà démonté :
        // sans lui, React avertit d'une mise à jour sur un composant démonté en dev.
        let ignore = false;

        fetch(withBasePath('/tokens.json'))
            .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then((payload) => { if (!ignore) setData(payload); })
            .catch((err) => { if (!ignore) setError(err.message); });

        return () => { ignore = true; };
    }, []);

    return { data, error };
};

/**
 * Tells whether a token matches the current search terms.
 *
 * The scope path is searched alongside the name, so that typing `searchbar` or
 * `navigationsidebar` gathers every token a component declares.
 *
 * @param {Object} token - A token record.
 * @param {string} query - Lowercased search string.
 * @returns {boolean} True when the token should be listed.
 */
const matches = (token, query) => {
    if (query === '') return true;
    const haystack = `${token.name} ${token.scope} ${token.light ?? ''} ${token.component ?? ''}`.toLowerCase();
    return query.split(/\s+/).every((term) => haystack.includes(term));
};

/**
 * Searchable reference of every design token of the repository.
 *
 * @returns {JSX.Element} The rendered reference.
 */
const TokenReference = () => {
    const { data, error } = useTokensIndex();

    const [query, setQuery] = useState('');
    const [level, setLevel] = useState('all');
    const [feature, setFeature] = useState('all');
    const [dark, setDark] = useState('all');

    const searchId = useId();
    const levelId = useId();
    const featureId = useId();
    const darkId = useId();

    // 880 lignes refiltrées à chaque frappe : la pause évite de recalculer la liste
    // entière entre deux touches.
    const search = useDebouncedValue(query, 200).trim().toLowerCase();

    if (error) {
        return (
            <aside className="token-reference__state" role="note">
                <p>
                    La référence des tokens n’a pas pu être chargée ({error}). Elle est produite par
                    {' '}<code>npm run build:tokens</code>, exécuté automatiquement par <code>npm run dev</code>
                    {' '}et <code>npm run build</code>.
                </p>
            </aside>
        );
    }

    if (!data) return <p className="token-reference__state">Chargement de la référence…</p>;

    const filtered = data.tokens.filter((token) => (
        matches(token, search)
        && (level === 'all' || token.level === Number(level))
        && (feature === 'all' || token.feature === feature)
        && (dark === 'all'
            || (dark === 'override' && token.dark !== null)
            // « Exceptions » = les niveaux 3 et 4 qui redéfinissent une valeur sombre.
            // La règle veut que le thème ne se joue qu'aux niveaux 1 et 2 : cette option
            // affiche exactement ce qui y déroge, sans qu'aucune page ait à recopier une
            // liste qui se périmerait (cf. /fondations/theme-sombre).
            || (dark === 'exception' && token.dark !== null && token.level >= 3))
    ));

    const shown = filtered.slice(0, MAX_ROWS);

    return (
        <section className="token-reference" aria-label="Référence des tokens">
            <search className="token-reference__filters">
                <p className="token-reference__field">
                    <label htmlFor={searchId}>Rechercher</label>
                    <input
                        id={searchId}
                        type="search"
                        className="token-reference__input"
                        value={query}
                        placeholder="toggle, --color-primary, searchbar…"
                        onChange={(event) => setQuery(event.target.value)} />
                </p>

                <p className="token-reference__field">
                    <label htmlFor={levelId}>Niveau</label>
                    <select
                        id={levelId}
                        className="token-reference__select"
                        value={level}
                        onChange={(event) => setLevel(event.target.value)}>
                        <option value="all">Tous ({data.counts.tokens})</option>
                        {data.levels.map((entry) => (
                            <option value={entry.level} key={entry.level}>
                                {entry.level} — {entry.label} ({data.counts.byLevel[entry.level] ?? 0})
                            </option>
                        ))}
                    </select>
                </p>

                <p className="token-reference__field">
                    <label htmlFor={featureId}>Portée</label>
                    <select
                        id={featureId}
                        className="token-reference__select"
                        value={feature}
                        onChange={(event) => setFeature(event.target.value)}>
                        <option value="all">Toutes</option>
                        {data.features.map((name) => <option value={name} key={name}>{name}</option>)}
                    </select>
                </p>

                <p className="token-reference__field">
                    <label htmlFor={darkId}>Thème sombre</label>
                    <select
                        id={darkId}
                        className="token-reference__select"
                        value={dark}
                        onChange={(event) => setDark(event.target.value)}>
                        <option value="all">Indifférent</option>
                        <option value="override">Avec surcharge sombre</option>
                        <option value="exception">
                            Exceptions — niveaux 3-4 ({data.darkOverridesBelowLevel2.length})
                        </option>
                    </select>
                </p>
            </search>

            {/* aria-live : le nombre de résultats change sans que le focus bouge, une
                synthèse vocale ne le remarquerait pas autrement. */}
            <p className="token-reference__count" aria-live="polite">
                {filtered.length === 0
                    ? 'Aucun token ne correspond.'
                    : `${filtered.length} token${filtered.length > 1 ? 's' : ''} — ${shown.length} affiché${shown.length > 1 ? 's' : ''}.`}
                {filtered.length > MAX_ROWS && ' Affinez la recherche pour voir les suivants.'}
            </p>

            {shown.length > 0 && (
                <div className="token-reference__scroll">
                    <table className="token-reference__table">
                        <thead>
                            <tr>
                                <th scope="col">Nom</th>
                                <th scope="col">Niv.</th>
                                <th scope="col">Portée</th>
                                <th scope="col">Clair</th>
                                <th scope="col">Sombre</th>
                                <th scope="col">Aperçu</th>
                                <th scope="col">Chaîne de dérivation</th>
                            </tr>
                        </thead>

                        <tbody>
                            {shown.map((token) => (
                                <tr key={token.name}>
                                    <th scope="row" className="token-reference__name">
                                        <code>{token.name}</code>
                                    </th>

                                    <td>
                                        <span className={`token-reference__level token-reference__level--${token.level}`}>
                                            {token.level}
                                        </span>
                                    </td>

                                    <td className="token-reference__scope">
                                        <code>{token.scope.replace(/^src\//, '')}</code>
                                        {token.responsive.map((entry) => (
                                            <span className="token-reference__responsive" key={entry.query}>
                                                {entry.query} : <code>{entry.value}</code>
                                            </span>
                                        ))}
                                    </td>

                                    <td className="token-reference__value">
                                        <code>{token.light ?? '—'}</code>
                                    </td>

                                    <td className="token-reference__value">
                                        {token.dark ? <code>{token.dark}</code> : <span className="token-reference__muted">hérité</span>}
                                    </td>

                                    <td>
                                        <TokenSwatch token={token} />
                                    </td>

                                    <td>
                                        <TokenChain chain={token.chain} computed={token.computed} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
};

export default TokenReference;
