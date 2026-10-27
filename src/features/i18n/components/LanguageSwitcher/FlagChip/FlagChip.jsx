import { useState } from 'react';
import { defaultFlagSrc } from '../languages';
import './FlagChip.scss';

/**
 * Renders the round flag badge of a language, with a text fallback that stays
 * visible until the flag image has actually loaded, and again if it fails.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.country] - ISO 3166-1 alpha-2 country code. Also
 *   used as the always-rendered textual fallback.
 * @param {function(string): (string|string[]|null)} [props.flagSrc] - Resolves
 *   the flag image URL, or an ordered list of candidates tried one after the
 *   other on load failure, from a country code; defaults to the local
 *   `public/flags/<iso2>.svg` file, then flagcdn.com.
 * @param {string} [props.className] - Additional class name appended to the
 *   root element (e.g. to shrink the badge inside a `<LanguageOption>`).
 * @returns {JSX.Element} The rendered flag badge.
 */
const FlagChip = ({ country, flagSrc = defaultFlagSrc, className = '' }) => {
    // Résolue une fois : `flagSrc` renvoie une url, une liste d'urls à essayer dans
    // l'ordre, ou `null` (pas de pays connu). Sans aucun candidat, seul le repli
    // textuel est rendu, sans balise <img> ni requête réseau inutile.
    const resolved = flagSrc(country);
    const candidates = (Array.isArray(resolved) ? resolved : [resolved]).filter(Boolean);
    const candidatesKey = candidates.join('|');

    // État local minimal : l'indice du candidat courant et l'issue de son chargement,
    // liés à la liste (clé = candidats joints) et non à un simple booléen. Une autre
    // liste (autre pays, autre `flagSrc`) repart de l'indice 0 en « en attente ».
    const [outcome, setOutcome] = useState({ key: null, index: 0, status: 'pending' });
    const current = outcome.key === candidatesKey ? outcome : { index: 0, status: 'pending' };
    const { index } = current;
    const exhausted = index >= candidates.length;
    const src = exhausted ? null : candidates[index];
    // Tant que tous les candidats n'ont pas échoué, l'état courant est celui du candidat affiché.
    const status = exhausted ? 'failed' : current.status;

    // Un candidat en échec laisse la place au suivant (reparti en « en attente ») ;
    // le dernier en échec épuise la liste et ne laisse que le repli textuel.
    const handleError = () => setOutcome({ key: candidatesKey, index: index + 1, status: 'pending' });
    const handleLoad = () => setOutcome({ key: candidatesKey, index, status: 'loaded' });

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
                quand tous les candidats ont échoué. */}
            {src && (
                // <img> brut et non next/image, car l'image absente doit se replier
                // en CSS sur la pastille textuelle (onError + data-status), ce que le loader
                // d'optimisation de next/image ne permet pas.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    key={src}
                    src={src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    data-status={status}
                    onLoad={handleLoad}
                    onError={handleError}
                    // Image déjà terminée avant l'hydratation (rendu serveur, cache) : son
                    // `load` ou son `error` est parti sans gestionnaire et ne reviendra pas.
                    // On lit alors l'état du navigateur au montage. « Chargée » : complète
                    // et avec une largeur. « Échouée » : complète SANS largeur — sans quoi un
                    // fichier local absent bloquerait l'image en « en attente » et le repli CDN
                    // ne serait jamais tenté. Un SVG sans dimensions intrinsèques, lui aussi
                    // complet sans largeur, passe alors au candidat suivant : repli bénin, au
                    // pire le code pays.
                    ref={(img) => {
                        if (img?.complete && status === 'pending') {
                            if (img.naturalWidth > 0) handleLoad();
                            else handleError();
                        }
                    }} />
            )}
        </span>
    );
};

export default FlagChip;
