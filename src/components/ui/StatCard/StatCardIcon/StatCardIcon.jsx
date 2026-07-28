import './StatCardIcon.scss';

/**
 * Tinted square chip hosting the consumer-provided icon, left of the value.
 *
 * @param {('primary'|'positive'|'negative'|'warning'|'neutral')} [tone='primary'] - Chip tint.
 * @param {React.ReactNode} children - The icon (any SVG); sized by this component's CSS.
 * @returns {JSX.Element} The rendered icon chip.
 */
const StatCardIcon = ({ tone = 'primary', children }) => {
    return (
        <span className={`stat-card-icon stat-card-icon--${tone}`} aria-hidden="true">
            {children}
        </span>
    );
};

export default StatCardIcon;
