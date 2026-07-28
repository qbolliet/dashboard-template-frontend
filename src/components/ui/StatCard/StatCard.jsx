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
 * @param {React.ReactNode} [props.header] - Replaces the whole header content (title slot).
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
 *   Enter / Space. In that case the accessible name defaults to `title` + the formatted value
 *   (only when `title` is a string); pass your own `aria-label` to override it.
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

    // Sémantique de bouton : Entrée et Espace activent la carte, comme un <button> natif.
    // preventDefault() sur Espace pour neutraliser le scroll de page.
    // Fonction simple (pas un hook) : pas de useCallback, le React Compiler s'en charge.
    const handleKeyDown = (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        if (event.key === ' ') event.preventDefault();
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
                <strong className={'stat-card-value' + (valueTone ? ' stat-card-value--' + valueTone : '')}>
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
    return (
        <article
            className={cls}
            style={style}
            onClick={onClick}
            onKeyDown={onClick ? handleKeyDown : undefined}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={onClick ? fallbackLabel : undefined}
            {...rest}
        >
            {inner}
        </article>
    );
};

export default StatCard;
