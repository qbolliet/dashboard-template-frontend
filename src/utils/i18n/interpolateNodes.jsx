import { Fragment } from 'react';
import { placeholdersOf } from './interpolate';

// =================================================================
// INTERPOLATE NODES — gabarit dont les trous sont des éléments React
// =================================================================
// Complément de `interpolate` pour le cas où la valeur substituée n'est pas du texte
// mais du BALISAGE : un <code>, un <a>, une <strong> au milieu d'une phrase.
//
// Le problème qu'il résout est un vrai piège de traduction. Écrit naïvement, un tel
// libellé se scinde en JSX :
//
//   <p>Les données viennent de <code>{name}</code> configuré par <code>{env}</code>.</p>
//
// Trois fragments de texte séparés, dont l'ORDRE est gravé dans le composant. Une langue
// qui place le complément avant le verbe ne peut pas se traduire — il faudrait modifier
// le JSX, donc le code. Le dictionnaire porte au contraire la phrase entière :
//
//   'Les données viennent de {manifest} configuré par {envVar}.'
//
// et l'appelant fournit `{ manifest: <code>…</code>, envVar: <code>…</code> }`. La
// traduction est libre de replacer les trous où sa syntaxe l'exige.
//
// SÉCURITÉ — aucune chaîne n'est interprétée comme du HTML : le gabarit ne fournit que
// du texte, les éléments viennent du code appelant. Rien à voir avec un
// `dangerouslySetInnerHTML`, et c'est délibéré.

// Découpe sur les trous EN LES CONSERVANT (groupe capturant dans le séparateur), pour
// pouvoir reconstituer la phrase en alternant texte et valeurs.
const SPLIT_RE = /(\{[A-Za-z0-9_]+\})/g;

/**
 * Fills a label template whose placeholders carry React elements.
 *
 * @param {string} template - Label holding `{name}` placeholders.
 * @param {Object<string, React.ReactNode>} values - React node per placeholder name.
 * @returns {React.ReactNode} The assembled fragment, renderable as children.
 */
export const interpolateNodes = (template, values) => {
    if (typeof template !== 'string') return null;

    const parts = template.split(SPLIT_RE);

    return parts.map((part, index) => {
        const name = /^\{([A-Za-z0-9_]+)\}$/.exec(part)?.[1];
        const value = name === undefined ? undefined : values?.[name];

        // Trou sans valeur : on laisse le texte brut `{nom}` visible, comme
        // `interpolate`. Un trou muet produirait une phrase mutilée que personne ne
        // remarque ; un trou visible nomme la clé manquante.
        const content = name !== undefined && value !== undefined ? value : part;

        // Les clés sont l'index de découpe : la liste est dérivée d'une chaîne constante,
        // son ordre et sa longueur ne changent que si le libellé change — auquel cas un
        // remontage complet est le comportement voulu.
        return <Fragment key={index}>{content}</Fragment>;
    });
};

/**
 * Re-exported so a caller can assert its template's placeholders before rendering.
 *
 * @see placeholdersOf
 */
export { placeholdersOf };
