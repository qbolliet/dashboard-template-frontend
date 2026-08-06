'use client';

// Importation des modules
import { useEffect, useRef, useState } from 'react';
import CopyIcon from '@/components/icons/CopyIcon/CopyIcon';
import CheckIcon from '@/components/icons/CheckIcon/CheckIcon';
import { copyToClipboard } from '@/utils/clipboard/copyToClipboard';
import './CopyButton.scss';

// =================================================================
// COPY BUTTON — copie d'un extrait de code, avec accusé de réception
// =================================================================
// Motif de confirmation repris de useDataTableState.js : le minuteur vit dans le
// GESTIONNAIRE D'ÉVÉNEMENT, jamais dans un effet, et son rappel revérifie l'identité de
// ce qu'il purge avant d'agir — sinon un second clic pendant le flash du premier
// éteindrait la confirmation qui vient à peine de s'allumer.
//
// Bouton propre à la documentation plutôt que <ToolbarButton> : celui-ci est conçu pour
// n'apparaître qu'au survol d'un `.hover-toolbar-host`, ce qui n'est pas le contexte ici
// — un bloc de code doit annoncer qu'il est copiable sans qu'on ait à le survoler.

/**
 * Copy-to-clipboard button showing a transient acknowledgement.
 *
 * @param {Object} props - Component props.
 * @param {string} props.code - Text handed to the clipboard.
 * @param {string} [props.label] - Accessible name of the button.
 * @returns {JSX.Element} The rendered button.
 */
const CopyButton = ({ code, label = 'Copier le code' }) => {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef(null);

    // Un démontage pendant le flash (changement d'onglet du <ComponentPreview>, par
    // exemple) laisserait le minuteur écrire dans un composant démonté.
    useEffect(() => () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    const handleClick = () => {
        copyToClipboard(code);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setCopied(true);
        timeoutRef.current = setTimeout(() => setCopied(false), 1600);
    };

    return (
        <button
            type="button"
            className={`doc-copy-btn${copied ? ' doc-copy-btn--done' : ''}`}
            onClick={handleClick}
            // L'état n'est pas porté par la seule couleur : le nom accessible change avec
            // lui, et aria-live l'annonce aux lecteurs d'écran.
            aria-label={copied ? 'Code copié' : label}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span className="doc-copy-btn__text" aria-hidden="true">{copied ? 'Copié' : 'Copier'}</span>
        </button>
    );
};

export default CopyButton;
