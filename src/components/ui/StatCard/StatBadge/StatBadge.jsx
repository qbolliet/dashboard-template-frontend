// Importation des modules
import React from 'react';
import { TrendArrowIcon } from '@/components/icons';
import './StatBadge.scss';

/**
 * Trend pill shown in the card's top-right corner.
 *
 * @param {React.ReactNode|Object} spec - Direct ReactNode/string/number (rendered as-is
 *   inside a neutral pill) or a DeltaSpec: { value, direction, tone, showArrow }.
 * @param {React.ReactNode} spec.value - Pill text (DeltaSpec form only).
 * @param {('up'|'down'|'flat')} [spec.direction] - Trend arrow direction ; also implies a tone.
 * @param {('positive'|'negative'|'warning'|string)} [spec.tone] - Explicit tone override.
 * @param {boolean} [spec.showArrow=true] - Whether to render the trend arrow.
 * @returns {JSX.Element} The rendered badge pill.
 */
const StatBadge = ({ spec }) => {
    // ReactNode/string/number direct ⇒ pilule neutre, rendu tel quel
    if (React.isValidElement(spec) || typeof spec === 'string' || typeof spec === 'number') {
        return <span className="stat-badge">{spec}</span>;
    }

    const { value, direction, tone, showArrow = true } = spec;

    // Teinte résolue : explicite sinon déduite de la direction, sinon aucune (pilule neutre)
    const resolvedTone = tone
        || (direction === 'up' ? 'positive'
            : direction === 'down' ? 'negative'
                : null);

    const cls = 'stat-badge' + (resolvedTone ? ' stat-badge--' + resolvedTone : '');

    return (
        <span className={cls}>
            {showArrow && direction && <TrendArrowIcon direction={direction} />}
            {value}
        </span>
    );
};

export default StatBadge;
