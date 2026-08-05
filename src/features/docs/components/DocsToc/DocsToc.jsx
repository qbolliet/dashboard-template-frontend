'use client';

// Importation des modules
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DOCS_PAGES } from '@docs/__docs__';
import './DocsToc.scss';

// =================================================================
// DOCS TOC — sommaire de la page courante
// =================================================================
// Les titres ne sont PAS relevés dans le DOM au montage : ils viennent de l'index
// généré au build par scripts/build-docs-index.js, qui balaye le texte brut des .mdx.
// Les identifiants d'ancre sont produits des deux côtés par la MÊME fonction
// (src/utils/format/slugify.js) — côté build ici, côté rendu dans src/mdx-components.jsx.
// C'est ce contrat partagé qui remplace un greffon rehype-slug, et qui permet en prime
// d'avoir le sommaire dans le HTML initial plutôt qu'après hydratation.
//
// Le suivi au défilement, lui, a bien besoin du DOM : un IntersectionObserver marque
// le titre le plus haut actuellement visible.

/**
 * Table of contents of the current documentation page, with scroll spy.
 *
 * Renders nothing when the page has fewer than two headings — a one-entry table of
 * contents is noise.
 *
 * @returns {(JSX.Element|null)} The rendered table of contents, or null.
 */
const DocsToc = () => {
    const pathname = usePathname();
    const headings = DOCS_PAGES[pathname]?.headings ?? [];

    // Le titre actif est mémorisé AVEC le chemin auquel il appartient, et non seul. Au
    // changement de page l'entrée périmée est ainsi ignorée au rendu — pas besoin d'un
    // setState de remise à zéro dans l'effet, que la règle react-hooks interdit à juste
    // titre (il provoque un rendu en cascade).
    const [spy, setSpy] = useState({ path: null, id: null });
    const activeId = spy.path === pathname ? spy.id : null;

    // L'effet dépend du CHEMIN, pas du tableau `headings` : ce dernier est reconstruit à
    // chaque rendu quand la page est absente de l'index (le `?? []`), ce qui relancerait
    // l'observateur en boucle. Le chemin est la vraie dépendance — c'est lui qui décide
    // quels titres observer.
    useEffect(() => {
        const ids = (DOCS_PAGES[pathname]?.headings ?? []).map((heading) => heading.id);
        const elements = ids.map((id) => document.getElementById(id)).filter(Boolean);

        if (elements.length === 0) return undefined;

        // rootMargin : la bande d'observation est ramenée au quart supérieur de la
        // fenêtre. Sans cela, le dernier titre d'une page courte ne devient jamais actif
        // (il n'atteint jamais le haut de l'écran), et plusieurs titres sont « visibles »
        // en même temps sans qu'on sache lequel choisir.
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

                if (visible.length > 0) setSpy({ path: pathname, id: visible[0].target.id });
            },
            { rootMargin: '0px 0px -75% 0px', threshold: 0 },
        );

        for (const element of elements) observer.observe(element);

        return () => observer.disconnect();
    }, [pathname]);

    if (headings.length < 2) return null;

    return (
        <nav className="docs-toc" aria-label="Sommaire de la page">
            <p className="docs-toc__title">Sur cette page</p>

            <ul className="docs-toc__list">
                {headings.map((heading) => (
                    <li
                        key={heading.id}
                        className="docs-toc__item"
                        data-depth={heading.depth}
                    >
                        <a
                            href={`#${heading.id}`}
                            className="docs-toc__link"
                            aria-current={activeId === heading.id ? 'location' : undefined}
                        >
                            {heading.text}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default DocsToc;
