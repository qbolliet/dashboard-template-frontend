'use client';

// Importation des modules
import Link from 'next/link';
import PageBody from '@/page-templates/components/PageBody/PageBody';
import PageHeader from '@/page-templates/components/PageHeader/PageHeader';
import { useLocale } from '@/features/i18n/providers/LocaleProvider';
import { localeHomePath } from '@/utils/i18n/localePath';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';

// =================================================================
// 404 — frontière « page introuvable » de l'APPLICATION, dans la langue courante
// =================================================================
// Placée sous [locale] et non à la racine du groupe (site) : c'est ce qui lui donne accès
// au LocaleProvider du layout de langue, et donc à un texte traduit. Next rend une
// frontière `not-found` À L'INTÉRIEUR des layouts qui la surplombent — le header et le
// pied de page localisés restent donc affichés.
//
// D'où le 'use client' : `not-found.jsx` ne reçoit PAS `params`, contrairement à une page.
// Le seul moyen d'y connaître la langue est de lire le contexte, ce qui impose un
// composant client. Le coût est nul, la page n'a aucune donnée à charger.
//
// ATTENTION à son périmètre réel, qui n'est PAS « toute URL inconnue sous /demo » :
// la route attrape-tout déclare `dynamicParams = false`, donc un chemin absent de son
// generateStaticParams n'entre pas dans le segment, et c'est src/app/not-found.jsx (le
// 404 racine, sans enveloppe) qui répond. Cette frontière-ci n'est atteinte que par un
// appel EXPLICITE à notFound() depuis une page du segment — en pratique le seul cas
// restant est « type de nœud validé par le schéma mais absent de PAGE_TYPES », que la
// route journalise avant d'appeler notFound().

/**
 * Page rendered when no manifest node matches the requested URL.
 *
 * @returns {JSX.Element} The rendered 404 page.
 */
const NotFound = () => {
    const { locale, dictionary } = useLocale();
    const labels = dictionary.notFound;

    return (
        <main id="main-content">
            <PageBody>
                <PageHeader name={labels.title} description={labels.description} />
                <p>
                    <Link href={localeHomePath(locale, DEMO_BASE_PATH)}>{labels.backHome}</Link>
                </p>
            </PageBody>
        </main>
    );
};

export default NotFound;
