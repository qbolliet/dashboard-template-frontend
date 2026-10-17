// Importation des modules
import { notFound } from 'next/navigation';
import siteConfig from '@config/site.config.json';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';
import { resolveLocalized, resolveLocalizedTree } from '@/utils/i18n/resolveLocalized';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';
import { LOCALES, DEFAULT_LOCALE, isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import LocaleProvider from '@/features/i18n/providers/LocaleProvider';
import LocaleSwitcher from '@/features/i18n/components/LocaleSwitcher/LocaleSwitcher';
import Header from '@/features/header/components/Header/Header';
import Footer from '@/features/footer/components/Footer/Footer';

// =================================================================
// LAYOUT [locale] — chrome LOCALISÉ de l'application de démonstration
// =================================================================
// Le header et le pied de page vivaient dans (site)/layout.jsx avant P5.4. Ils sont
// descendus ICI, sous le segment de langue, pour une raison unique et suffisante : ils
// affichent du texte. Un layout placé AU-DESSUS de [locale] ne peut pas lire la langue —
// `params` n'y est pas fourni — et rendrait donc un header figé dans une seule langue
// au-dessus de pages traduites.
//
// C'est aussi le seul endroit du dépôt qui appelle `getDictionary`. Le dictionnaire
// descend ensuite en props ; aucun composant ne le recharge.
//
// FRONTIÈRE DE SÉRIALISATION — <Header> et <Footer> sont des composants CLIENTS, ce
// layout est un Server Component. Tout ce qui traverse doit être sérialisable : l'arbre
// de navigation est du JSON, le dictionnaire un objet de chaînes. C'est précisément
// pourquoi les libellés dynamiques sont des GABARITS et non des fonctions (voir
// src/utils/i18n/interpolate.js).
//
// Aucun <main> ici : la route attrape-tout pose le sien, cible du lien d'évitement du
// header.

/**
 * Pre-renders the layout for every shipped language.
 *
 * Required by the static export: a layout segment must enumerate its parameters just
 * like a page, otherwise the branch is never written to `out/`.
 *
 * @returns {Promise<Array<{locale: string}>>} One entry per shipped locale.
 */
export const generateStaticParams = async () => LOCALES.map((locale) => ({ locale }));

/**
 * Renders the localized chrome of the demonstration application.
 *
 * @param {Object} props - Layout props.
 * @param {React.ReactNode} props.children - The rendered route.
 * @param {Promise<{locale: string}>} props.params - Route parameters (async since Next 15).
 * @returns {Promise<JSX.Element>} The wrapped route.
 */
const LocaleLayout = async ({ children, params }) => {
    const { locale } = await params;

    if (!isLocale(locale)) notFound();

    const dictionary = await getDictionary(locale);

    // Les deux transformations du manifeste, dans cet ordre : d'abord les libellés
    // traduits, ensuite les chemins absolus préfixés par /demo/<langue>. C'est le levier
    // unique décrit dans src/utils/navigation/basePaths.js, avec la langue en plus —
    // aucun lien en aval n'a à connaître ni l'un ni l'autre.
    const navigationTree = resolveNavigationTree(
        resolveLocalizedTree(siteConfig.navigation.tree, locale, DEFAULT_LOCALE),
        `${DEMO_BASE_PATH}/${locale}`,
    );

    const siteTitle = resolveLocalized(siteConfig.site.title, locale, DEFAULT_LOCALE);

    return (
        <LocaleProvider
            locale={locale}
            locales={LOCALES}
            defaultLocale={DEFAULT_LOCALE}
            dictionary={dictionary}
        >
            {/* Langue de CETTE PARTIE du document (WCAG 3.1.2). C'est la seule façon de
                rendre un HTML correct pour les technologies d'assistance : `lang` vit sur
                <html>, que le layout RACINE écrit — or celui-ci est au-dessus de [locale]
                et ne peut pas le lire (`rootParams()` forcerait le rendu dynamique,
                incompatible avec `output: 'export'`). Le script inline du <head> corrige
                ensuite <html lang> avant le premier paint, et LocaleProvider le maintient
                lors des navigations clientes ; les trois mécanismes se complètent.

                `display: contents` : l'élément disparaît complètement de la mise en page
                — ses enfants deviennent enfants directs du <body> pour le CSS — mais reste
                dans l'arbre DOM, donc dans la chaîne d'héritage de `lang`. Sans cela, un
                conteneur supplémentaire casserait le positionnement du header. */}
            <div lang={locale} style={{ display: 'contents' }}>
            {/* `homeHref` est une prop et non une valeur en dur dans <Header> : ce
                composant est publié par le registry, y graver /demo/<langue> livrerait
                un lien cassé à un tiers.
                `siteTitle` remplace le « Mon Site » qui était codé en dur dans
                NavigationSideBar — le nom du site vient du manifeste, comme partout
                ailleurs. */}
            <Header
                navigationData={navigationTree}
                navigationType={siteConfig.navigation.type ?? 'auto'}
                linkedNodes={siteConfig.navigation.linkedNodes ?? 'auto'}
                useSwitcher={siteConfig.navigation.useSwitcher}
                homeHref={`${DEMO_BASE_PATH}/${locale}`}
                siteTitle={siteTitle}
                locale={locale}
                labels={dictionary}
                actions={<LocaleSwitcher />}
            />
            {children}
            <Footer
                copyrightText={`© 2025 ${siteTitle}`}
                homeHref={`${DEMO_BASE_PATH}/${locale}`}
                labels={dictionary.footer}
            />
            </div>
        </LocaleProvider>
    );
};

export default LocaleLayout;
