'use client';

/**
 * Mode contrôlé
 *
 * `value` et `onChange` transfèrent la langue active au parent :
 * `<LanguageSwitcher>` ne garde alors plus aucun état interne, il se
 * contente de refléter la valeur reçue et de notifier chaque changement —
 * pratique pour synchroniser la langue active avec le reste de l'interface,
 * ici une simple ligne de texte.
 *
 * @item language-switcher
 */

// Importation des modules
import { useState } from 'react';
import { LanguageSwitcher } from '@/features/i18n/components/LanguageSwitcher';

const LanguageSwitcherControlled = () => {
  const [language, setLanguage] = useState('fr');

  return (
    <>
      {/* Écho de l'état du parent : preuve que la langue active est bien
          pilotée depuis l'extérieur du composant, pas depuis un state interne. */}
      <p>Langue active : <code>{language}</code></p>
      <LanguageSwitcher value={language} onChange={setLanguage} />
    </>
  );
};

export default LanguageSwitcherControlled;
