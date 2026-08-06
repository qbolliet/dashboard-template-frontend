// Importation des modules
import Link from 'next/link';
import { slugify } from '@/utils/format/slugify';
import ComponentPlayground from '@/features/docs/components/ComponentPlayground/ComponentPlayground';
import ComponentPreview from '@/features/docs/components/ComponentPreview/ComponentPreview';
import ComponentPreviewSource from '@/features/docs/components/ComponentPreview/ComponentPreviewSource';
import DocsCodeBlock from '@/features/docs/components/DocsCodeBlock/DocsCodeBlock';
import PropsTable from '@/features/docs/components/PropsTable/PropsTable';
import TokenCascade from '@/features/docs/components/TokenCascade/TokenCascade';
import TokenPlayground from '@/features/docs/components/TokenPlayground/TokenPlayground';
import TokenReference from '@/features/docs/components/TokenReference/TokenReference';

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
//   • les tableaux, pour réutiliser la feuille partagée des tables d'API ;
//   • les blocs de code balisés, pour les rendre COLORÉS et COPIABLES.

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
 * Renders a fenced code block through the documentation's own code surface.
 *
 * MDX compiles ```scss … ``` to `<pre><code className="language-scss">`. Routing it to
 * <DocsCodeBlock> gives every snippet of the site the copy button and the syntax
 * colouring the registry examples already had — a documentation whose whole subject is
 * "copy this snippet into your stylesheet" cannot ship snippets that are not copyable.
 *
 * A fence without a language, or a <pre> that does not wrap a <code>, falls back to the
 * plain tag styled by `.docs-prose`.
 *
 * @param {Object} props - Props MDX passes to the `pre` tag.
 * @param {React.ReactNode} props.children - The `<code>` element MDX nested inside.
 * @returns {JSX.Element} The rendered code block.
 */
const MdxPre = ({ children, ...props }) => {
    const code = children?.props;
    if (!code || typeof code.children !== 'string') return <pre {...props}>{children}</pre>;

    const language = /language-([\w-]+)/.exec(code.className ?? '');

    return (
        <DocsCodeBlock
            // MDX conserve le saut de ligne final de la clôture ```, qui ajouterait une
            // ligne vide au bas de chaque bloc.
            code={code.children.replace(/\n$/, '')}
            lang={language ? language[1] : 'text'} />
    );
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

        pre: MdxPre,

        // ===== SURFACES DE DÉMONSTRATION =====
        // Disponibles dans toutes les pages rédigées sans import : le MDX ne sait pas
        // importer, et exiger un import par page serait une ligne de bruit à chaque fois.
        // Ce sont des composants CLIENTS référencés depuis un module serveur, ce qui est
        // la composition normale — ce fichier reste un Server Component.
        ComponentPlayground,
        ComponentPreview,
        ComponentPreviewSource,

        // ===== SURFACES GÉNÉRÉES DES PAGES DE COMPOSANTS =====
        // Server Component, contrairement aux trois surfaces ci-dessus : la table est
        // lue dans docs/__props__.json à la génération de la page et n'a aucun état.
        PropsTable,

        // ===== SURFACES DE LA SECTION « FONDATIONS » =====
        // TokenCascade est un Server Component ; les deux autres sont des composants
        // clients, référencés ici comme les surfaces de démonstration ci-dessus.
        TokenCascade,
        TokenPlayground,
        TokenReference,

        // En DERNIER : les surcharges par fichier l'emportent.
        ...components,
    };
}
