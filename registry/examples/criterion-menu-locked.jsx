'use client';

/**
 * Critère figé sur une colonne
 *
 * `lockedVariable` désactive le select Variable : la carte reste utilisable
 * (opération, valeur) mais ne porte plus que sur la colonne déjà choisie.
 * Utile pour un filtre de dashboard fixé sur une colonne (ex. un widget qui
 * ne doit jamais filtrer sur autre chose que « gdp »).
 *
 * @item filter
 */

// Importation des modules
import { useState } from 'react';
import CriterionMenu from '@/features/filter/components/CriterionMenu/CriterionMenu';
import operations from '@config/filter/operations.json';

// Une seule variable proposée : le select est désactivé, mais reste cohérent
// avec les métadonnées attendues par CriterionMenu (sql_type, is_categorical).
const VARIABLES = [
  { value: 'gdp', label: 'PIB', sql_type: 'double precision', is_categorical: false },
];

const INITIAL = {
  variable: 'gdp',
  operation: 'between',
  value: { min: -2, max: 5 },
  sql_type: 'double precision',
  is_categorical: false,
};

const CriterionMenuLocked = () => {
  const [criterion, setCriterion] = useState(INITIAL);

  return (
    <CriterionMenu
      criterion={criterion}
      onChange={setCriterion}
      variables={VARIABLES}
      operationsByType={operations}
      lockedVariable
      showLabels
      validate
    />
  );
};

export default CriterionMenuLocked;
