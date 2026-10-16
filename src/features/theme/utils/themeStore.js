// =================================================================
// STORE DU THÈME — l'attribut `data-theme` de <html> comme source de vérité
// =================================================================
// Le script d'amorçage de src/app/layout.tsx résout le thème (localStorage, puis
// préférence système) et le pose sur <html> AVANT le premier paint. Plutôt que de recopier
// cette valeur dans un `useState` — état dupliqué, et premier rendu client différent du HTML
// serveur, d'où l'erreur d'hydratation C4 —, le fournisseur lit directement l'attribut via
// `useSyncExternalStore(subscribeTheme, readTheme, getServerTheme)`.
//
// Ce module est du JS pur (aucun React) : il se teste sous jsdom sans monter de composant.

/** Clé localStorage du thème choisi. */
export const THEME_STORAGE_KEY = 'theme';

/** Clé localStorage qui marque un choix explicite de l'utilisateur. */
export const THEME_MANUAL_KEY = 'theme-manual';

/**
 * Whether a value is a valid theme name.
 *
 * @param {*} value - Candidate value.
 * @returns {boolean} True for 'light' and 'dark'.
 */
const isTheme = (value) => value === 'light' || value === 'dark';

/**
 * Resolves the system colour-scheme preference.
 *
 * @returns {'light'|'dark'} The system theme ('light' when it cannot be read).
 */
export const getSystemTheme = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Theme to render on the server, and during the hydration pass on the client.
 *
 * Toujours `light` : le serveur ignore la préférence de l'utilisateur. C'est ce qui garantit
 * que le premier rendu client produit le même HTML ; la valeur réelle est adoptée juste
 * après l'hydratation (re-rendu synchrone de useSyncExternalStore, sans avertissement).
 *
 * @returns {'light'} Always 'light'.
 */
export const getServerTheme = () => 'light';

/**
 * Reads the theme currently applied to the document.
 *
 * Priorité : l'attribut posé par le script d'amorçage (source unique de vérité), puis, en
 * repli défensif si ce script n'a pas tourné, la valeur mémorisée, puis la préférence
 * système. Chaque lecture de localStorage est protégée : il peut lever (stockage bloqué).
 *
 * @returns {'light'|'dark'} The current theme.
 */
export const readTheme = () => {
    if (typeof document === 'undefined') return getServerTheme();

    const applied = document.documentElement.dataset.theme;
    if (isTheme(applied)) return applied;

    try {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (isTheme(saved)) return saved;
    } catch {
        // Stockage inaccessible : on retombe sur la préférence système.
    }

    return getSystemTheme();
};

/**
 * Subscribes to changes of the document's `data-theme` attribute.
 *
 * Un MutationObserver (et non une liste d'écouteurs propre au module) : il capte aussi les
 * écritures venues d'ailleurs que du fournisseur. Il notifie en microtâche, donc APRÈS que
 * l'attribut a été posé — l'ordre exigé par applyThemeAttribute.
 *
 * @param {function(): void} onChange - Called after each change.
 * @returns {function(): void} Unsubscribe function.
 */
export const subscribeTheme = (onChange) => {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
};

/**
 * Writes the `data-theme` attribute on `<html>`.
 *
 * Sur <html> (documentElement), au même niveau que les déclarations `:root { … }` : les
 * tokens de feature `:root { --x: var(--color-surface) }` sont résolus à l'élément où ils
 * sont déclarés puis hérités figés ; un override posé sur <body> les laisserait gelés.
 *
 * @param {'light'|'dark'} theme - Theme to apply.
 * @returns {void}
 */
export const applyThemeAttribute = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
};

/**
 * Updates the mobile status-bar colour to match a theme.
 *
 * @param {'light'|'dark'} theme - Theme being displayed.
 * @returns {void}
 */
export const applyThemeColorMeta = (theme) => {
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
};

/**
 * Persists an explicit theme choice.
 *
 * Appelé uniquement sur un GESTE (jamais à l'hydratation) : une écriture au montage
 * enregistrerait la valeur serveur `light` par-dessus la préférence mémorisée.
 *
 * @param {'light'|'dark'} theme - Theme to persist.
 * @returns {void}
 */
export const persistTheme = (theme) => {
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        window.localStorage.setItem(THEME_MANUAL_KEY, 'true');
    } catch {
        // Stockage inaccessible : le thème reste appliqué pour la session.
    }
};
