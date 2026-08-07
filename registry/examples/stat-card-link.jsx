/**
 * Carte-lien
 *
 * Passer `href` fait rendre la carte en `<Link>` (next/link) plutôt qu'en
 * `<article>` : elle devient focusable nativement au clavier (Tab, anneau de
 * focus) sans aucune gestion de touche à écrire soi-même — c'est le comportement
 * natif de `<a href>`.
 *
 * @item stat-card
 */

// Importation des modules
import { StatCard } from '@/components/ui';
import { PulseIcon } from '@/components/icons';

const StatCardLink = () => (
  // Branche href : rendue en <Link>, focusable nativement (Tab, anneau de focus).
  <StatCard
    title="Disponibilité"
    value={99.98}
    format={{ style: 'percent', decimals: 2 }}
    href="#"
    icon={<PulseIcon />}
    iconTone="positive"
    badge={{ value: 'SLA', tone: 'positive', showArrow: false }}
    footerTitle="Voir le détail →"
    footerNote="Survolez, ou Tab pour l'anneau de focus"
  />
);

export default StatCardLink;
