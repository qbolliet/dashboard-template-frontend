// Importation des modules
import { LOCALES, DEFAULT_LOCALE } from '@/i18n/config';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';
import { withBasePath } from '@/utils/url/withBasePath';
import LocaleRedirect from '@/features/i18n/components/LocaleRedirect/LocaleRedirect';

// =================================================================
// /demo — porte d'entrée sans langue, qui négocie et redirige
// =================================================================
// POURQUOI CETTE PAGE EXISTE, et pourquoi elle ne peut pas être une simple `redirect()`
// de Next : le déploiement de référence du template est un EXPORT STATIQUE (GitHub
// Pages). Il n'y a pas de serveur pour lire l'en-tête Accept-Language, pas de middleware
// — Next le refuse sous `output: 'export'` — et pas de redirection 30x. La négociation
// doit donc se faire dans le navigateur, après le chargement d'un document réel.
//
// Cette page EST ce document : une page statique, écrite une fois dans out/demo/index.html,
// qui choisit la langue côté client et remplace l'entrée d'historique.
//
// TROIS NIVEAUX DE REPLI, du plus fiable au plus dégradé, et aucun n'est décoratif :
//
//   1. JavaScript actif — <LocaleRedirect> applique
//      « choix mémorisé › langues du navigateur › langue par défaut ».
//   2. JavaScript inactif — le <noscript> ci-dessous affiche des liens explicites. Sans
//      lui, l'application entière serait inatteignable ; c'est aussi ce que voit un
//      robot d'indexation qui n'exécute pas de script.
//   3. Moteurs de recherche — `alternates.languages` déclare les versions disponibles,
//      et `x-default` désigne celle à proposer par défaut.
//
// Un consommateur qui déploie sur un serveur (Vercel, Node) peut supprimer tout ce
// mécanisme au profit d'examples/middleware.ts, qui rend une vraie 307. Les deux
// partagent la MÊME fonction de négociation (src/utils/i18n/negotiateLocale.js) : ils ne
// peuvent pas diverger.

export const metadata = {
    // Pas d'indexation de la page de transit : c'est /demo/<langue> qui porte le
    // contenu, et laisser les deux dans l'index les met en concurrence.
    robots: { index: false, follow: true },
    alternates: {
        languages: {
            ...Object.fromEntries(LOCALES.map((code) => [code, `${DEMO_BASE_PATH}/${code}`])),
            'x-default': `${DEMO_BASE_PATH}/${DEFAULT_LOCALE}`,
        },
    },
};

/**
 * Language-negotiating entry point of the demonstration application.
 *
 * @returns {JSX.Element} The redirector, with its no-JavaScript fallback.
 */
const DemoEntryPage = () => (
    <main id="main-content">
        <LocaleRedirect />

        <noscript>
            <ul>
                {LOCALES.map((code) => (
                    <li key={code}>
                        {/* <a> et non <Link> : dans un <noscript>, le routeur client
                            n'existe pas, et <Link> n'apporterait que du préchargement
                            inutile. Le basePath de DÉPLOIEMENT doit donc être ajouté à
                            la main — next/link le fait tout seul, un <a> nu non, et
                            l'oubli ne casse jamais en local (cf. withBasePath.js). */}
                        <a
                            href={withBasePath(`${DEMO_BASE_PATH}/${code}`)}
                            lang={code}
                            hrefLang={code}
                        >
                            {code}
                        </a>
                    </li>
                ))}
            </ul>
        </noscript>
    </main>
);

export default DemoEntryPage;
