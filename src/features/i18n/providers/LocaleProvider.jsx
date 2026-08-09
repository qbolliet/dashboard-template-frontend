'use client';

import { createContext, useContext, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { swapLocaleInPath } from '@/utils/i18n/localePath';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';

// =================================================================
// LOCALE PROVIDER — la langue courante, telle que l'URL la déclare
// =================================================================
// Décalqué sur ThemeProvider, avec UNE différence essentielle : la source de vérité.
//
//   ThemeProvider  → l'attribut data-theme du document, posé avant le premier paint par
//                    un script inline, mémorisé en localStorage.
//   LocaleProvider → le SEGMENT D'URL, reçu en prop depuis le layout serveur.
//
// La langue n'est pas un état client. Elle est décidée par l'URL, donc par le HTML rendu
// statiquement : c'est ce qui rend chaque page partageable, indexable, et servie
// directement dans la bonne langue sans clignotement. Le localStorage et le cookie ne
// mémorisent qu'une PRÉFÉRENCE, consultée uniquement par le redirecteur de /demo pour
// choisir où envoyer un visiteur qui n'a pas précisé de langue. Ils ne décident jamais
// de ce qui est rendu.
//
// Corollaire : il n'y a pas de garde d'hydratation à prévoir ici, contrairement à
// ThemeToggleButton. Serveur et client lisent la même URL et rendent la même chose.

const LocaleContext = createContext(null);

/**
 * Provides the current locale and the means to change it.
 *
 * @param {Object} props - Component props.
 * @param {string} props.locale - Current locale code, from the `[locale]` route segment.
 * @param {string[]} props.locales - Locale codes the site ships.
 * @param {string} props.defaultLocale - Fallback locale of the site.
 * @param {Object} props.dictionary - Resolved dictionary for `locale`. Exposed so that
 *   client components with no server parent to prop them — `not-found.jsx` is the
 *   case — can still read their labels.
 * @param {React.ReactNode} props.children - The localized subtree.
 * @returns {JSX.Element} The provider wrapping its children.
 */
const LocaleProvider = ({ locale, locales, defaultLocale, dictionary, children }) => {
    const router = useRouter();
    const pathname = usePathname();

    // Le script inline du <head> pose `lang` avant le premier paint, mais il ne s'exécute
    // qu'au CHARGEMENT du document. Une navigation cliente de /demo/fr vers /demo/en ne
    // le rejoue pas : sans cet effet, l'attribut resterait sur l'ancienne langue et les
    // lecteurs d'écran continueraient de prononcer la page en français.
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);

    /**
     * Switches the interface to another language, keeping the reader on their page.
     *
     * @param {string} next - Target locale code.
     */
    const setLocale = (next) => {
        if (next === locale || !locales.includes(next)) return;

        // Mémorisation du choix EXPLICITE, qui prime sur la négociation système au
        // prochain passage par /demo. Deux supports parce qu'ils ont deux lecteurs :
        // localStorage pour le redirecteur client (le chemin réellement emprunté à
        // l'export statique), le cookie pour examples/middleware.ts, qui ne voit pas le
        // localStorage. Écrire les deux évite que les deux modes de déploiement se
        // contredisent.
        try {
            window.localStorage.setItem('locale', next);
            // `max-age` d'un an, `SameSite=Lax` : le cookie n'a pas à voyager sur des
            // requêtes tierces, il n'est lu que par la négociation d'entrée.
            document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`;
        } catch {
            // Stockage refusé (navigation privée, cookies bloqués) : la bascule doit
            // fonctionner quand même, elle ne sera simplement pas mémorisée.
        }

        // `replace` et non `push` : changer de langue n'est pas un déplacement dans le
        // site, et empiler les deux versions d'une même page ferait revenir « en arrière »
        // sur la traduction plutôt que sur la page précédente.
        router.replace(swapLocaleInPath(pathname, next, { locales, prefix: DEMO_BASE_PATH }));
    };

    return (
        <LocaleContext.Provider value={{ locale, locales, defaultLocale, dictionary, setLocale }}>
            {children}
        </LocaleContext.Provider>
    );
};

/**
 * Accesses the current locale, the shipped locales and the language switcher.
 *
 * @returns {{locale: string, locales: string[], defaultLocale: string, dictionary: Object,
 *   setLocale: Function}} The locale context.
 * @throws {Error} If used outside of a LocaleProvider.
 */
export const useLocale = () => {
    const context = useContext(LocaleContext);

    if (context === null) {
        throw new Error('useLocale doit être utilisé dans un LocaleProvider');
    }

    return context;
};

export default LocaleProvider;
