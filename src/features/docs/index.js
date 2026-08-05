// =================================================================
// FEATURE DOCS — chrome du site de documentation
// =================================================================
// Surface de développement du template : `npm run dev` sert la documentation, et
// ajouter un composant se fait en écrivant sa page de doc, qui est aussi son banc
// d'essai. C'est ce qui garantit que la documentation ne se périme pas — elle casse en
// même temps que le code qu'elle décrit.
//
// Cette feature est la seule qui ne soit PAS distribuée par le registry : elle habille
// le site de documentation du template, elle n'a rien à faire dans le projet d'un
// tiers. Elle est exclue explicitement dans scripts/build-registry.js.
//
// Le contenu rédigé, lui, vit hors de src/ : docs/content/**.mdx, indexé au build par
// scripts/build-docs-index.js.

export { default as DocsShell } from './components/DocsShell/DocsShell';
export { default as DocsHeader } from './components/DocsHeader/DocsHeader';
export { default as DocsSidebar } from './components/DocsSidebar/DocsSidebar';
export { default as DocsBreadcrumb } from './components/DocsBreadcrumb/DocsBreadcrumb';
export { default as DocsToc } from './components/DocsToc/DocsToc';
export { default as DocsPagination } from './components/DocsPagination/DocsPagination';
