import { useState } from 'react';
import { flagCdnSrc } from '../languages';
import './FlagChip.scss';

/**
 * Renders the round flag badge of a language, with a text fallback that stays
 * visible until the flag image has actually loaded, and again if it fails.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.country] - ISO 3166-1 alpha-2 country code. Also
 *   used as the always-rendered textual fallback.
 * @param {function(string): ?string} [props.flagSrc] - Resolves the flag
 *   image URL from a country code; defaults to flagcdn.com.
 * @param {string} [props.className] - Additional class name appended to the
 *   root element (e.g. to shrink the badge inside a `<LanguageOption>`).
 * @returns {JSX.Element} The rendered flag badge.
 */
const FlagChip = ({ country, flagSrc = flagCdnSrc, className = '' }) => {
    // Résolue une fois : si `flagSrc` renvoie `null` (pas de pays connu), seul
    // le repli textuel est rendu, sans balise <img> ni requête réseau inutile.
    const src = flagSrc(country);

    // État local minimal : l'issue du chargement de CETTE url. Stocker l'url avec
    // l'issue (et non un simple booléen) évite de garder « chargée » ou « échouée »
    // quand `flagSrc` ou le pays change : une autre url repart de « en attente ».
    const [outcome, setOutcome] = useState({ src: null, status: 'pending' });
    const status = outcome.src === src ? outcome.status : 'pending';

    return (
        // aria-hidden : le nom de la langue est déjà porté par le texte de
        // l'option et par l'aria-label du bouton — annoncer le drapeau serait
        // redondant, et de toute façon un drapeau n'est pas une langue.
        <span className={`lang-switch-flag ${className}`.trim()} aria-hidden="true">
            {/* Repli toujours rendu, empilé SOUS l'image via `grid-area: 1 / 1`
                (voir FlagChip.scss) : la pastille garde la même boîte que l'image
                soit chargée, en attente ou échouée — aucun décalage de mise en page. */}
            <span className="lang-switch-flag-fallback">{country}</span>

            {/* POURQUOI UN ÉTAT, ALORS QUE LE CSS SEUL AVAIT ÉTÉ TENTÉ : l'hypothèse
                « <img alt=""> en échec n'est pas peinte » était fausse. Elle ne tient
                que pour une image sans dimensions imposées. Ici le CSS impose
                width/height: 100 % ; Chromium réserve alors la boîte et y peint l'icône
                d'image cassée, alt vide ou non, PAR-DESSUS le repli. Il faut donc que
                l'image ne soit visible qu'une fois chargée (`data-status`, voir le
                SCSS) et qu'elle disparaisse si elle échoue.

                `data-status` plutôt qu'un rendu conditionnel pour « en attente » : le
                nœud <img> doit exister pour charger. Il est en revanche retiré du DOM
                sur 'failed'. */}
            {src && status !== 'failed' && (
                <img
                    key={src}
                    src={src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    data-status={status}
                    onLoad={() => setOutcome({ src, status: 'loaded' })}
                    onError={() => setOutcome({ src, status: 'failed' })}
                    // Image déjà chargée AVANT l'hydratation (rendu serveur, cache) : son
                    // `load` est parti sans gestionnaire et ne reviendra pas. On lit alors
                    // l'état du navigateur au montage. Seul « chargée » est déduit ici :
                    // une image complète sans largeur pourrait être un SVG sans dimensions
                    // intrinsèques, pas une erreur — elle reste cachée, repli visible.
                    ref={(img) => {
                        if (img?.complete && img.naturalWidth > 0 && status === 'pending') {
                            setOutcome({ src, status: 'loaded' });
                        }
                    }} />
            )}
        </span>
    );
};

export default FlagChip;
