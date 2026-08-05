'use client';

/**
 * Saisie de date et de plage de dates
 *
 * `inputType` choisit le clavier de saisie et la validation ; en `date`,
 * `dateMode` bascule entre une date unique et une plage. `validate` colore le
 * champ selon l'état de la saisie.
 *
 * @item type-aware-input
 */

// Importation des modules
import { useState } from 'react';
import TypeAwareInput from '@/components/filter/TypeAwareInput/TypeAwareInput';

const TypeAwareInputDate = () => {
  const [day, setDay] = useState('');
  const [range, setRange] = useState('');

  return (
    <>
      <TypeAwareInput inputType="date" dateMode="single" validate value={day} onChange={setDay} />
      <TypeAwareInput inputType="date" dateMode="range" validate value={range} onChange={setRange} />
    </>
  );
};

export default TypeAwareInputDate;
