'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { negotiateLocale } from '@/utils/i18n/negotiateLocale';
import { localeHomePath } from '@/utils/i18n/localePath';
import { LOCALES, DEFAULT_LOCALE } from '@/i18n/config';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';

// =================================================================
// LOCALE REDIRECT — la détection de la langue système, côté navigateur
// =================================================================
// Monté par la seule page /demo. Il fait ce qu'un middleware ferait sur un serveur, avec
// la même fonction de négociation (src/utils/i18n/negotiateLocale.js) : c'est ce partage
// qui garantit que les deux modes de déploiement choisissent la même langue.
//
// ORDRE DE PRIORITÉ, et la raison de chaque marche :
//
//   1. `localStorage.locale` — un choix EXPLICITE de l'utilisateur, posé par le
//      sélecteur de langue. Il prime sur le système : quelqu'un dont le navigateur est
//      en anglais mais qui a choisi le français veut le français, et le lui reprendre à
//      chaque visite serait une régression d'usage.
//   2. `navigator.languages` — les préférences du système, dans l'ordre déclaré par
//      l'utilisateur dans son navigateur. C'est la réponse à « la valeur par défaut vaut
//      la valeur système ».
//   3. `DEFAULT_LOCALE` — le repli du manifeste.
//
// `router.replace` et non `push` : la page de transit ne doit pas rester dans
// l'historique, sinon un retour en arrière depuis /demo/fr repasse par /demo, qui
// redirige de nouveau — l'utilisateur reste piégé et ne peut plus sortir du site.

/**
 * Sends the visitor to the demo home page in their language.
 *
 * Renders nothing: the page hosting it provides the `<noscript>` fallback and the
 * markup a search engine sees.
 *
 * @returns {null} Nothing.
 */
const LocaleRedirect = () => {
    const router = useRouter();

    useEffect(() => {
        let stored = null;
        try {
            stored = window.localStorage.getItem('locale');
        } catch {
            // Stockage refusé (navigation privée, cookies bloqués) : on négocie sans.
        }

        const locale = LOCALES.includes(stored)
            ? stored
            : negotiateLocale(
                  // `navigator.languages` est absent de quelques environnements anciens
                  // et des robots ; `navigator.language` prend le relais.
                  navigator.languages ?? [navigator.language],
                  LOCALES,
                  DEFAULT_LOCALE,
              );

        router.replace(localeHomePath(locale, DEMO_BASE_PATH));
        // `router` est stable et LOCALES/DEFAULT_LOCALE sont des constantes de module :
        // l'effet ne doit se jouer qu'au montage.
    }, [router]);

    return null;
};

export default LocaleRedirect;
