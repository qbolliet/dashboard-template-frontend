// =================================================================
// TOKEN CHAIN — la colonne à ne pas sacrifier
// =================================================================
// Rend la chaîne de dérivation produite par scripts/build-tokens-doc.js. C'est la seule
// colonne qui réponde à la question que se pose vraiment un utilisateur tiers : « à quel
// NIVEAU dois-je surcharger pour obtenir l'effet que je veux ? »
//
//   --sidebar-toggle-size → --spacing-3xl → 2rem → 32px
//
// se lit : changer --sidebar-toggle-size ne touche que la sidebar ; changer
// --spacing-3xl déplace toute l'échelle d'espacement du site.
//
// DEUX FORMES, PAS UNE. Une valeur à référence unique prolonge la chaîne — c'est la
// lecture linéaire ci-dessus. Une valeur qui en combine plusieurs, comme
// `calc((var(--nav-toggle-size) - var(--line-height-tight) * var(--nav-link-font-size)) / 2)`,
// ouvre une BRANCHE par référence : en choisir une seule laisserait croire à une
// dérivation simple là où trois tokens pèsent sur le résultat.
//
// Server Component : aucun état, aucun gestionnaire.

/**
 * Renders one step of a derivation chain.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.step - A step record from the generated chain.
 * @returns {JSX.Element} The rendered step.
 */
const ChainStep = ({ step }) => {
    if (step.cycle) {
        return <li className="token-chain__step token-chain__step--warn"><code>{step.name}</code> (cycle)</li>;
    }

    if (step.unresolved) {
        return (
            <li className="token-chain__step token-chain__step--warn">
                <code>{step.name}</code> non déclaré
                {step.fallback && <> — repli <code>{step.fallback}</code></>}
            </li>
        );
    }

    if (step.branches) {
        return (
            <li className="token-chain__step">
                <span className="token-chain__label">combine :</span>
                <ul className="token-chain__branches">
                    {step.branches.map((branch) => (
                        <li key={branch.name}>
                            <code>{branch.name}</code>
                            {branch.level && <span className="token-chain__level">niv. {branch.level}</span>}
                            {branch.chain.length > 0 && (
                                <ul className="token-chain__list">
                                    {branch.chain.map((nested, index) => (
                                        <ChainStep step={nested} key={nested.name ?? `branche-${index}`} />
                                    ))}
                                </ul>
                            )}
                        </li>
                    ))}
                </ul>
            </li>
        );
    }

    return (
        <li className="token-chain__step">
            <code>{step.name}</code>
            {step.level && <span className="token-chain__level">niv. {step.level}</span>}
            {step.fromFallback && <span className="token-chain__level">repli</span>}
            <span className="token-chain__value"><code>{step.value}</code></span>
        </li>
    );
};

/**
 * Derivation chain of a token, ending on its computed value.
 *
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.chain - The chain, as generated.
 * @param {string|null} props.computed - The final value in pixels, when reducible.
 * @returns {JSX.Element} The rendered chain.
 */
const TokenChain = ({ chain, computed }) => {
    // Un token déclaré en littéral n'a pas de chaîne : il EST le bout de la chaîne, et
    // c'est en soi l'information (le surcharger n'a aucune répercussion ailleurs).
    if (chain.length === 0) {
        return <span className="token-chain__leaf">valeur littérale{computed && ` — ${computed}`}</span>;
    }

    return (
        <ol className="token-chain__list">
            {chain.map((step, index) => <ChainStep step={step} key={step.name ?? `etape-${index}`} />)}
            {computed && <li className="token-chain__result">= {computed}</li>}
        </ol>
    );
};

export default TokenChain;
