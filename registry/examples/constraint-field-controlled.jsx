'use client';

/**
 * ConstraintField avec callbacks branchés sur un état visible
 *
 * ConstraintField n'a pas de prop `value` — c'est un composant non contrôlé — mais ses
 * callbacks s'utilisent comme ceux d'un composant contrôlé : `onChange` remonte
 * `{ value }` (valeur unique) ou `{ min, max }` (plage), et `onValidityChange` un
 * booléen séparé, rempli ET cohérent (type valide, low ≤ high, dans les bornes si
 * connues). Cet exemple répercute les deux dans un état React affiché sous le champ.
 *
 * @item constraint-field
 */

// Importation des modules
import { useState } from 'react';
import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';

const ConstraintFieldControlled = () => {
  const [range, setRange] = useState(null);
  const [valid, setValid] = useState(null);

  return (
    <>
      <ConstraintField
        valueType="float"
        rangeMode
        min={0}
        max={50}
        step={0.1}
        validate
        onChange={setRange}
        onValidityChange={setValid}
      />
      <p>
        {range ? `min : ${range.min} — max : ${range.max}` : 'Aucune valeur saisie'}
        {' · '}
        {valid === null ? 'validité inconnue' : valid ? 'valide' : 'invalide'}
      </p>
    </>
  );
};

export default ConstraintFieldControlled;
