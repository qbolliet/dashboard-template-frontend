'use client';

/**
 * Carte-bouton
 *
 * Passer `onClick` sans `href` fait rendre la carte en `<article role="button">` :
 * elle devient activable au clavier (Entrée au keydown, Espace au keyup, comme un
 * `<button>` natif) en plus du clic souris. Le chiffre affiché EST le nombre
 * d'activations, ce qui rend visible les deux modes d'activation.
 *
 * @item stat-card
 */

// Importation des modules
import { useState } from 'react';
import { StatCard } from '@/components/ui';
import { ChartIcon } from '@/components/icons';

const StatCardButton = () => {
  const [activations, setActivations] = useState(0);

  return (
    // Branche onClick : rendue en <article role="button">, activable au clavier.
    <StatCard
      title="Carte bouton (onClick)"
      value={activations}
      format={{ unit: 'activations' }}
      onClick={() => setActivations((n) => n + 1)}
      icon={<ChartIcon />}
      iconTone="warning"
      footerTitle="Cliquez, ou Tab puis Entrée / Espace"
      footerNote="Le chiffre compte les activations"
    />
  );
};

export default StatCardButton;
