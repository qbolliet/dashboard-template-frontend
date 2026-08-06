// =================================================================
// TOKEN SWATCH — l'aperçu d'un token, selon ce qu'il contient
// =================================================================
// Une pastille pour une couleur, une barre à l'échelle pour une longueur, la valeur
// calculée pour le reste. La NATURE du token (`kind`) est décidée par le script de
// génération, qui est le seul à connaître le bout de la chaîne de dérivation : rejouer
// cette déduction ici la ferait diverger au premier cas limite.
//
// Server Component : aucun état. Rendu depuis <TokenReference>, qui est client, ce qui
// ne l'oblige pas à le devenir.

// Longueur au-delà de laquelle la barre est tronquée. Une barre proportionnelle sans
// plafond rendrait --spacing-xs (4px) invisible à côté de --docs-content-max-width
// (736px) : au-delà, c'est le chiffre qui informe, plus la barre.
const BAR_MAX_PX = 64;

/**
 * Visual preview of a token, adapted to what it holds.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.token - A token record from public/tokens.json.
 * @returns {JSX.Element} The rendered preview.
 */
const TokenSwatch = ({ token }) => {
    if (token.kind === 'color' && token.lightLiteral) {
        return (
            <span className="token-swatch">
                {/* Les deux pastilles côte à côte quand le token bascule : c'est la
                    lecture utile, comparer les deux thèmes d'un coup d'œil. */}
                <span
                    className="token-swatch__chip"
                    style={{ background: `hsl(${token.lightLiteral})` }}
                    title={`Clair : ${token.lightLiteral}`} />
                {token.darkLiteral && (
                    <span
                        className="token-swatch__chip"
                        style={{ background: `hsl(${token.darkLiteral})` }}
                        title={`Sombre : ${token.darkLiteral}`} />
                )}
            </span>
        );
    }

    if (token.kind === 'length' && token.computed) {
        const pixels = Number.parseFloat(token.computed);

        return (
            <span className="token-swatch">
                <span
                    className="token-swatch__bar"
                    style={{ width: `${Math.min(Math.max(pixels, 1), BAR_MAX_PX)}px` }}
                    title={token.computed} />
                <span className="token-swatch__figure">{token.computed}</span>
            </span>
        );
    }

    if (token.computed) return <span className="token-swatch__figure">{token.computed}</span>;

    return <span className="token-swatch__figure token-swatch__figure--muted">{token.kind}</span>;
};

export default TokenSwatch;
