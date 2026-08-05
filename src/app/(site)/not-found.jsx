// Importation des modules
import Link from 'next/link';
import PageBody from '@/features/pages/components/PageBody/PageBody';
import PageHeader from '@/features/pages/components/PageHeader/PageHeader';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';

// =================================================================
// 404 — frontière « page introuvable » de l'APPLICATION de démonstration
// =================================================================
// Étant dans le groupe (site), cette page hérite de <Header> et <Footer>.
//
// ATTENTION à son périmètre réel, qui n'est PAS « toute URL inconnue sous /demo » :
// depuis que la route attrape-tout déclare `dynamicParams = false`, un chemin absent de
// son generateStaticParams n'entre pas dans le segment, et c'est src/app/not-found.jsx
// (le 404 racine, sans enveloppe) qui répond. Cette frontière-ci n'est atteinte que par
// un appel EXPLICITE à notFound() depuis une page du groupe — en pratique le seul cas
// restant est « type de nœud validé par le schéma mais absent de PAGE_TYPES », que la
// route journalise avant d'appeler notFound().

export const metadata = {
    title: 'Page introuvable',
};

/**
 * Page rendered when no manifest node matches the requested URL.
 *
 * @returns {JSX.Element} The rendered 404 page.
 */
const NotFound = () => (
    <main id="main-content">
        <PageBody>
            <PageHeader
                name="Page introuvable"
                description="Cette adresse ne correspond à aucune page du site." />
            <p>
                <Link href={DEMO_BASE_PATH}>Retour à l&apos;accueil de la démonstration</Link>
            </p>
        </PageBody>
    </main>
);

export default NotFound;
