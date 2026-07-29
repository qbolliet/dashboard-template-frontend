// Importation des modules
import Link from 'next/link';
import StatBadge from './StatBadge/StatBadge';
import StatCardIcon from './StatCardIcon/StatCardIcon';
import { formatStatValue } from './utils/formatStatValue';
import './StatCard.scss';

/**
 * Metric card: small header, large formatted value with an optional icon,
 * small footer comment. Optional trend badge, left accent bar, compact density.
 *
 * Server Component: no hook, no browser API — the clickable hover is pure CSS. Passing an
 * `onClick` handler simply means the consumer is a Client Component, which is supported
 * without any directive here.
 *
 * @param {Object} props - Component props.
 * @param {number|string} props.value - The figure to display.
 * @param {Object|Function} [props.format] - FormatSpec object or custom formatter fn
 *   (see {@link formatStatValue}).
 * @param {React.ReactNode} [props.icon] - Icon left of the value. Absent ⇒ the value spans
 *   the full row.
 * @param {('primary'|'positive'|'negative'|'warning'|'neutral')} [props.iconTone='primary'] - Icon chip tint.
 * @param {('primary'|'positive'|'negative')} [props.valueTone] - Tint of the value itself.
 * @param {string} [props.title] - Header title (small) — the nature of the figure.
 * @param {React.ReactNode} [props.header] - Replaces the title slot only, `title` included.
 *   The badge, if any, still renders next to it in the header row — pass your own markup
 *   through this slot only for the left-hand side.
 * @param {React.ReactNode|Object} [props.badge] - Top-right pill: ReactNode, or DeltaSpec
 *   { value, direction, tone, showArrow } (see {@link StatBadge}). A boolean (e.g. from
 *   `showDelta && spec`) is treated as absent and renders nothing.
 * @param {React.ReactNode} [props.footer] - Replaces the whole footer content.
 * @param {React.ReactNode} [props.footerTitle] - Main footer line (semi-bold).
 * @param {React.ReactNode} [props.footerNote] - Secondary footer line (gray).
 * @param {('positive'|'negative')} [props.footerTone] - Tint of footerTitle.
 * @param {boolean} [props.accent=false] - Colored accent bar on the left edge.
 * @param {('primary'|'positive'|'negative'|'warning')} [props.tone='primary'] - Accent bar color.
 * @param {boolean} [props.compact=false] - Reduced density (smaller value and spacings).
 * @param {string} [props.href] - Renders the card as a <Link> (elevated hover). Can be combined
 *   with `onClick`.
 * @param {Function} [props.onClick] - Renders the card clickable (elevated hover). Combines with
 *   `href` (navigation + analytics tracking): the handler runs on the <Link> too. Without `href`,
 *   it gives the card a full button semantic — `role="button"`, `tabIndex={0}` and activation with
 *   Enter (on key down) / Space (on key up, like a native button). Keys pressed on a focusable
 *   descendant do not activate the card. In that case the accessible name defaults to `title` +
 *   the formatted value (only when `title` is a string); pass your own `aria-label` to override it.
 * @param {string} [props.className] - Additional CSS classes.
 * @param {Object} [props.style] - Inline style passthrough.
 * @returns {JSX.Element} The rendered stat card.
 */
const StatCard = ({
    value,
    format,
    icon,
    iconTone = 'primary',
    valueTone,
    title,
    header,
    badge,
    footer,
    footerTitle,
    footerNote,
    footerTone,
    accent = false,
    tone = 'primary',
    compact = false,
    href,
    onClick,
    className,
    style,
    ...rest
}) => {
    // Dérivée directe : pas de useMemo, le React Compiler s'en charge
    const formatted = formatStatValue(value, format);

    const clickable = !!(href || onClick);

    // Booléen explicite : un badge={false} (ex. `showDelta && spec`) ne doit ni déclencher le
    // header ni être passé à StatBadge, qui le boxerait en objet vide.
    const hasBadge = badge != null && typeof badge !== 'boolean';

    // Sémantique de bouton, calquée sur le comportement natif de <button> :
    //   - Entrée active dès le keydown (et se répète si la touche est maintenue, comme
    //     nativement) ;
    //   - Espace n'active qu'au keyup. Activer au keydown ferait répéter onClick au rythme
    //     de l'auto-répétition du clavier tant que la touche reste enfoncée. Le keydown se
    //     contente donc du preventDefault() qui neutralise le scroll de page.
    // La garde target === currentTarget évite d'activer la carte quand la touche vise un
    // descendant focusable (lien du footer, bouton dans un slot) : l'événement remonte
    // jusqu'ici mais ne nous concerne pas.
    // Fonctions simples (pas des hooks) : pas de useCallback, le React Compiler s'en charge.
    const handleKeyDown = (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter') { onClick(event); return; }
        if (event.key === ' ') event.preventDefault();
    };

    const handleKeyUp = (event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key !== ' ') return;
        event.preventDefault();
        onClick(event);
    };

    // role="button" rend les enfants présentationnels (titre, pilule, footer aplatis) : sans
    // libellé, le nom accessible serait vide. {...rest} étant spread en dernier, un aria-label
    // fourni par le consommateur l'emporte naturellement sur celui-ci.
    const fallbackLabel = typeof title === 'string' ? `${title} : ${formatted}` : undefined;

    // Assemblage des classes : la teinte n'est posée qu'avec l'accent (elle ne pilote que la barre)
    const cls = [
        'stat-card',
        compact && 'stat-card--compact',
        clickable && 'stat-card--clickable',
        accent && 'stat-card--accent',
        accent && ('stat-card--' + tone),
        className,
    ].filter(Boolean).join(' ');

    const inner = (
        <>
            {/* Header : rendu dès qu'un slot, un titre ou un badge exploitable est fourni */}
            {(header !== undefined || title != null || hasBadge) && (
                <header className="stat-card-header">
                    {/* `header` défini (même à null) ⇒ remplacement intégral du titre */}
                    {header !== undefined
                        ? header
                        : title != null && <h3 className="stat-card-title">{title}</h3>}
                    {hasBadge && <StatBadge spec={badge} />}
                </header>
            )}

            {/* Corps : icône optionnelle + chiffre formaté */}
            <p className="stat-card-body">
                {icon != null && <StatCardIcon tone={iconTone}>{icon}</StatCardIcon>}
                {/* suppressHydrationWarning : Intl.NumberFormat('fr-FR') a changé de séparateur
                    de milliers à partir d'ICU 72 (U+00A0 → U+202F). Un Node antérieur face à un
                    navigateur récent (ou l'inverse) produit deux chaînes différentes ; sans cette
                    tolérance, React jetterait le HTML serveur de tout le sous-arbre. */}
                <strong
                    className={'stat-card-value' + (valueTone ? ' stat-card-value--' + valueTone : '')}
                    suppressHydrationWarning
                >
                    {formatted}
                </strong>
            </p>

            {/* Footer : slot de remplacement intégral, sinon ligne principale + note */}
            {(footer !== undefined || footerTitle != null || footerNote != null) && (
                footer !== undefined ? (
                    <footer className="stat-card-footer">{footer}</footer>
                ) : (
                    <footer className="stat-card-footer">
                        {footerTitle != null && (
                            <strong className={'stat-card-footer-title' + (footerTone ? ' stat-card-footer-title--' + footerTone : '')}>
                                {footerTitle}
                            </strong>
                        )}
                        {footerNote != null && (
                            <small className="stat-card-footer-note">{footerNote}</small>
                        )}
                    </footer>
                )
            )}
        </>
    );

    // Carte-lien : <Link> de next/link, mêmes classes et styles. onClick y est réattaché (les deux
    // props se combinent) ; pas de gestion clavier ici, <a href> est focusable et Entrée y déclenche
    // déjà le click nativement.
    if (href) {
        return (
            <Link href={href} className={cls} style={style} onClick={onClick} {...rest}>
                {inner}
            </Link>
        );
    }

    // Carte simple ; sémantique de bouton complète seulement en présence d'un handler. Tous les
    // attributs interactifs sont conditionnés à onClick : sans lui, aucune fonction n'est posée sur
    // le DOM, ce qui garde la carte rendable depuis un Server Component (cf. docstring).
    // suppressHydrationWarning aussi ici : fallbackLabel réinjecte la valeur formatée dans
    // aria-label, donc l'écart d'ICU décrit plus haut frapperait cet attribut. Sans lui, React
    // corrigerait l'attribut côté client alors que le <strong> (suppressed) garderait le texte
    // du serveur — nom accessible et texte visible finiraient durablement désaccordés.
    return (
        <article
            className={cls}
            style={style}
            onClick={onClick}
            onKeyDown={onClick ? handleKeyDown : undefined}
            onKeyUp={onClick ? handleKeyUp : undefined}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={onClick ? fallbackLabel : undefined}
            suppressHydrationWarning={onClick ? true : undefined}
            {...rest}
        >
            {inner}
        </article>
    );
};

export default StatCard;
