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
import { resolveOperationLabels } from '@/features/filter/utils/filterTypes';
import { DEFAULT_LOCALE } from '@/i18n/config';

// Les libellés d'opérateurs de config/filter/operations.json acceptent la forme
// `{ fr, en }` depuis P5.4 : on les aplatit avant de les passer au composant, qui
// n'attend que des chaînes. Le site de documentation étant monolingue, il résout dans
// la langue par défaut.
const localizedOperations = resolveOperationLabels(operations, DEFAULT_LOCALE, DEFAULT_LOCALE);

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
      operationsByType={localizedOperations}
      lockedVariable
      showLabels
      validate
    />
  );
};

export default CriterionMenuLocked;
