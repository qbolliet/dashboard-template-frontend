// Importation des modules
import { VisuallyHidden } from '@/components/common';
import './TokenCascade.scss';

// =================================================================
// TOKEN CASCADE — le schéma des quatre niveaux, en HTML
// =================================================================
// Illustre §4.1 de TEMPLATIZATION_ARCHITECTURE.md. Volontairement un composant et non un
// bloc de code ASCII : un schéma dessiné en caractères ne suit pas le thème, ne se
// réagence pas sur petit écran, et ne peut pas lier les fichiers qu'il nomme.
//
// PAS DE 'use client' : rien n'y est interactif. La page de documentation reste un
// Server Component de bout en bout, et ce schéma ne coûte pas un octet de JavaScript.
//
// Les exemples ci-dessous sont RÉELS, relevés dans le dépôt — un schéma de documentation
// illustré par des valeurs inventées se périme sans que rien ne le signale. Ils sont
// vérifiables dans la référence des tokens, qui est générée depuis ces mêmes fichiers.

/** The four levels of the cascade, top (most general) to bottom (most specific). */
const LEVELS = [
    {
        level: 1,
        title: 'Primitives',
        scope: 'src/styles/globals/primitives/colors.scss',
        note: 'Triplets HSL bruts. Aucun var(), aucun alias. C’est la palette, et rien d’autre.',
        example: '--color-primary-500: 209 79% 24%;',
    },
    {
        level: 2,
        title: 'Tokens sémantiques',
        scope: 'src/styles/globals/tokens/semantic-colors.scss + typography.scss',
        note: 'Des rôles, pas des couleurs : « le texte principal », « la surface ». Plus les échelles de taille, d’espacement, de rayon, d’ombre et de z-index.',
        example: '--color-text-primary: var(--color-gray-900);',
    },
    {
        level: 3,
        title: 'Tokens de feature',
        scope: 'src/features/[feature]/_tokens.scss + _colors.scss',
        note: 'Préfixe --[feature]-*. Mutualisé entre les composants d’une même feature : un token de ce niveau a toujours au moins deux consommateurs.',
        example: '--header-control-size: 2.25rem;',
    },
    {
        level: 4,
        title: 'Tokens de composant',
        scope: 'src/features/[feature]/components/[Composant]/_tokens.scss',
        note: 'Préfixe --[composant]-*. Sa valeur par défaut est le token de feature dont il dérive — c’est ce qui rend le composant ajustable seul, sans déplacer toute la feature.',
        example: '--topbar-toggle-size: var(--nav-toggle-size);',
    },
];

/**
 * Four-level diagram of the token cascade.
 *
 * @returns {JSX.Element} The rendered diagram.
 */
const TokenCascade = () => (
    <ol className="token-cascade" aria-label="Les quatre niveaux de la cascade de tokens">
        {LEVELS.map((entry) => (
            <li className="token-cascade__level" key={entry.level}>
                <p className="token-cascade__heading">
                    <span className="token-cascade__badge" aria-hidden="true">{entry.level}</span>
                    <strong className="token-cascade__title">
                        {/* La pastille porte le numéro à l'œil, mais elle est
                            aria-hidden : ce rappel le redonne à la synthèse vocale. */}
                        <VisuallyHidden>Niveau {entry.level} — </VisuallyHidden>
                        {entry.title}
                    </strong>
                </p>

                <p className="token-cascade__scope"><code>{entry.scope}</code></p>
                <p className="token-cascade__note">{entry.note}</p>
                <p className="token-cascade__example"><code>{entry.example}</code></p>
            </li>
        ))}
    </ol>
);

export default TokenCascade;
