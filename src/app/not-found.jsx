// Importation des modules
import Link from 'next/link';
import PageBody from '@/features/pages/components/PageBody/PageBody';
import PageHeader from '@/features/pages/components/PageHeader/PageHeader';

// =================================================================
// 404 — frontière « page introuvable »
// =================================================================
// Nécessaire depuis que la route attrape-tout couvre la racine : elle reçoit TOUTE
// URL non prise par une route physique, et appelle notFound() dès qu'aucun nœud du
// manifeste ne correspond. Sans cette frontière, Next rendrait son 404 par défaut,
// aux styles en dur — inacceptable pour un template dont le produit est l'apparence.

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
                <Link href="/">Retour à l&apos;accueil</Link>
            </p>
        </PageBody>
    </main>
);

export default NotFound;
