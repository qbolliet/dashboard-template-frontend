// Importation des modules
import Link from 'next/link';
import { slugify } from '@/utils/format/slugify';

// =================================================================
// MDX COMPONENTS — correspondance balises MDX → composants du projet
// =================================================================
// Convention Next : ce fichier est résolu automatiquement (racine du projet ou src/),
// et son `useMDXComponents` est injecté dans CHAQUE module .mdx compilé, via l'option
// providerImportSource posée par @next/mdx.
//
// Aucune directive 'use client' : ce sont des Server Components. Le contenu rédigé de
// la documentation ne part donc jamais dans le bundle navigateur.
//
// La typographie du corps de texte n'est PAS faite ici : le shell enveloppe le contenu
// dans <article class="docs-prose"> et la feuille de style vise les balises nues. On ne
// surcharge donc que ce qui demande du COMPORTEMENT :
//   • les titres, pour poser un `id` d'ancre que le sommaire puisse viser ;
//   • les liens internes, pour passer par <Link> (préchargement + basePath) ;
//   • les tableaux, pour réutiliser la feuille partagée des tables d'API.

/**
 * Flattens an MDX children tree down to plain text.
 *
 * @param {React.ReactNode} node - Any MDX child.
 * @returns {string} The concatenated text content.
 */
const toText = (node) => {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(toText).join('');
    return toText(node.props?.children);
};

/**
 * Builds a heading component deriving its anchor id from its own text.
 *
 * The id MUST come from the same `slugify` as scripts/build-docs-index.js: c'est le
 * seul contrat qui garantit que les entrées du sommaire pointent sur des ancres qui
 * existent réellement. Changer l'un sans l'autre casse la navigation intra-page en
 * silence — rien ne lève d'erreur, les liens ne font simplement plus rien.
 *
 * @param {string} Tag - The intrinsic heading tag ('h2', 'h3'…).
 * @returns {Function} The heading component.
 */
const anchoredHeading = (Tag) => {
    const Heading = ({ children, id, ...props }) => (
        <Tag id={id ?? slugify(toText(children))} {...props}>{children}</Tag>
    );
    Heading.displayName = `Mdx${Tag.toUpperCase()}`;
    return Heading;
};

/**
 * Maps MDX tags to this project's components.
 *
 * @param {Object} [components] - Per-file overrides passed by MDX.
 * @returns {Object} The merged component map.
 */
export function useMDXComponents(components) {
    return {
        // h1 n'est délibérément pas surchargé : c'est le titre de la page, rien ne
        // pointe dessus.
        h2: anchoredHeading('h2'),
        h3: anchoredHeading('h3'),

        a: ({ href = '', children, ...props }) =>
            href.startsWith('/')
                ? <Link href={href} {...props}>{children}</Link>
                : (
                    <a
                        href={href}
                        rel="noreferrer noopener"
                        target={href.startsWith('http') ? '_blank' : undefined}
                        {...props}
                    >
                        {children}
                    </a>
                ),

        // Réutilise la feuille partagée des tables d'API (src/styles/pages/_api-table.scss),
        // importée par DocsShell.scss.
        table: (props) => <table className="api-table" {...props} />,

        // En DERNIER : les surcharges par fichier l'emportent. C'est par là que P4.3
        // injectera <ComponentPreview> et <ComponentPlayground> page par page.
        ...components,
    };
}
