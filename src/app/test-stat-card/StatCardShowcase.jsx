'use client';

// =================================================================
// PAGE /test-stat-card — DÉMONSTRATIONS INTERACTIVES (partie client)
// =================================================================
// Reprend les données et la mise en scène de la démo prototype
// (design-system/project/ds/stat-card.html) : spotlight, grille pilotable,
// formats & variantes, mode auto. Seuls l'état des contrôles (perRow, densité,
// icônes, pilules, accent) et le compteur d'activations de la carte bouton sont
// locaux à ce composant.

// Importation des modules
import { useState } from 'react';
import { StatCard, CardGrid } from '@/components/ui';
import { TrendArrowIcon, UsersIcon, PulseIcon } from '@/components/icons';
import { CtrlRadio, CtrlToggle } from '../_playground';

/* ── Icônes locales de démo — n'appartiennent qu'à cette page ──────────── */
const EuroIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M15 6.5A5.5 5.5 0 1 0 15 17.5M5 10h7M5 14h6" />
  </svg>
);
const CartIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="9" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
    <path d="M2 3h3l2.3 12.3a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L21.5 7H6" />
  </svg>
);
const ClockIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </svg>
);
const BoxIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 8 12 3 3 8v8l9 5 9-5z" />
    <path d="M3 8l9 5 9-5M12 13v8" />
  </svg>
);

/* ── Données KPI de la grille démo — reprises à l'identique du prototype ── */
const KPIS = [
  { title: "Chiffre d'affaires", value: 1250000, format: { style: 'currency', currency: 'EUR', compact: true, maxDecimals: 2 }, icon: <EuroIcon />, iconTone: 'primary', badge: { value: '+12,5 %', direction: 'up' }, footerTitle: 'En hausse ce mois-ci', footerNote: 'vs. 1,11 M€ le mois dernier' },
  { title: 'Nouveaux clients', value: 3842, format: { compact: false }, icon: <UsersIcon />, iconTone: 'positive', badge: { value: '+8,2 %', direction: 'up' }, footerTitle: 'Acquisition en croissance', footerNote: 'Sur les 30 derniers jours' },
  { title: 'Taux de conversion', value: 3.24, format: { style: 'percent', decimals: 2 }, icon: <CartIcon />, iconTone: 'warning', badge: { value: '-0,4 pt', direction: 'down' }, footerTitle: 'Léger recul', footerNote: 'Moyenne trimestrielle : 3,6 %' },
  { title: 'Panier moyen', value: 84.5, format: { style: 'currency', currency: 'EUR', decimals: 2 }, icon: <BoxIcon />, iconTone: 'neutral', badge: { value: 'stable', direction: 'flat' }, footerTitle: 'Stable', footerNote: '±0,3 % sur 6 mois' },
  { title: 'Temps de réponse', value: 128, format: { unit: 'ms' }, icon: <ClockIcon />, iconTone: 'positive', badge: { value: '-18 %', direction: 'up' }, footerTitle: 'Plus rapide', footerNote: 'P95 sous 200 ms' },
  { title: 'Disponibilité', value: 99.98, format: { style: 'percent', decimals: 2 }, icon: <PulseIcon />, iconTone: 'primary', badge: { value: 'SLA ok', tone: 'positive', showArrow: false }, footerTitle: 'Objectif atteint', footerNote: 'SLA cible : 99,9 %' },
];

// Teinte de la barre d'accent dérivée de iconTone (mêmes règles que le prototype).
const toneFromIcon = (iconTone) => (
  iconTone === 'warning' ? 'warning' : iconTone === 'positive' ? 'positive' : 'primary'
);

const StatCardShowcase = () => {
  // ── Panneau de contrôle de la grille pilotable ──
  const [perRow, setPerRow] = useState(3);
  const [compact, setCompact] = useState(false);
  const [showIcon, setShowIcon] = useState(true);
  const [showBadge, setShowBadge] = useState(true);
  const [accent, setAccent] = useState(false);

  // Compteur de la carte bouton : le chiffre affiché EST le nombre d'activations, ce qui rend
  // visible aussi bien le clic souris que l'activation clavier (Entrée / Espace).
  const [activations, setActivations] = useState(0);

  return (
    <>
      {/* ── Section 1 — Aperçu ── */}
      <section className="test-stat-card-section">
        <h2 className="test-stat-card-section-label">Aperçu</h2>
        <div className="test-stat-card-spotlight">
          <StatCard
            title="Total Revenue"
            value={1250}
            format={{ style: 'currency', currency: 'USD', decimals: 2, locale: 'en-US' }}
            badge={{ value: '+12,5 %', direction: 'up', tone: 'neutral' }}
            footerTitle={<>Trending up this month <TrendArrowIcon direction="up" /></>}
            footerNote="Visitors for the last 6 months" />
        </div>
      </section>

      {/* ── Section 2 — Grille pilotable ── */}
      <section className="test-stat-card-section">
        <h2 className="test-stat-card-section-label">Grille pilotable</h2>

        <div className="tp-section test-stat-card-controls">
          <div className="ctrl-row">
            <CtrlRadio
              label="Cartes / ligne"
              options={[{ value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }]}
              value={perRow} onChange={setPerRow} />
          </div>
          <div className="ctrl-row">
            <CtrlToggle label="Densité compacte" value={compact} onChange={setCompact} />
            <CtrlToggle label="Icônes" value={showIcon} onChange={setShowIcon} />
            <CtrlToggle label="Pilules d'évolution" value={showBadge} onChange={setShowBadge} />
            <CtrlToggle label="Barre d'accent" value={accent} onChange={setAccent} />
          </div>
        </div>

        <CardGrid perRow={perRow}>
          {KPIS.map((k) => (
            <StatCard
              key={k.title}
              title={k.title}
              value={k.value}
              format={k.format}
              icon={showIcon ? k.icon : undefined}
              iconTone={k.iconTone}
              badge={showBadge ? k.badge : undefined}
              footerTitle={k.footerTitle}
              footerNote={k.footerNote}
              compact={compact}
              accent={accent}
              tone={toneFromIcon(k.iconTone)} />
          ))}
        </CardGrid>
      </section>

      {/* ── Section 3 — Formats & variantes ── */}
      <section className="test-stat-card-section">
        <h2 className="test-stat-card-section-label">Formats &amp; variantes</h2>
        <CardGrid perRow={3}>
          <StatCard title="Sans icône" value={48210} format={{ compact: true }}
            footerTitle="Le chiffre occupe toute la ligne" footerNote="Aucune icône fournie" />
          <StatCard title="Pourcentage" value={-2.7} format={{ style: 'percent', decimals: 1 }}
            valueTone="negative" icon={<PulseIcon />} iconTone="negative"
            badge={{ value: '-2,7 pt', direction: 'down' }}
            footerTitle="En repli" footerNote="Comparé au trimestre précédent" />
          <StatCard title="Unité personnalisée" value={1842} format={{ unit: 'obs', compact: false }}
            icon={<BoxIcon />} iconTone="neutral"
            footerTitle="Observations collectées" footerNote="Source INSEE · mensuel" />
          <StatCard title="Devise compacte" value={4300000} format={{ style: 'currency', currency: 'EUR', compact: true, maxDecimals: 1 }}
            icon={<EuroIcon />} accent tone="primary"
            badge={{ value: '+5,1 %', direction: 'up' }}
            footerTitle="Encours géré" footerNote="Barre d'accent activée" />
          <StatCard title="Préfixe + suffixe" value={12.4} format={{ prefix: '~', suffix: ' j', decimals: 1 }}
            icon={<ClockIcon />} iconTone="warning"
            footerTitle="Délai moyen de traitement" footerNote="Objectif : < 10 j" />
          {/* Branche href : rendue en <Link>, focusable nativement */}
          <StatCard title="Carte-lien (href)" value={99.98} format={{ style: 'percent', decimals: 2 }}
            href="#" icon={<PulseIcon />} iconTone="positive"
            badge={{ value: 'SLA', tone: 'positive', showArrow: false }}
            footerTitle="Voir le détail →" footerNote="Survolez, ou Tab pour l'anneau de focus" />
          {/* Branche onClick : rendue en <article role="button">, activable au clavier */}
          <StatCard title="Carte bouton (onClick)" value={activations} format={{ unit: 'activations' }}
            onClick={() => setActivations((n) => n + 1)}
            icon={<CartIcon />} iconTone="warning"
            footerTitle="Cliquez, ou Tab puis Entrée / Espace"
            footerNote="Le chiffre compte les activations" />
        </CardGrid>
      </section>

      {/* ── Section 4 — Mode auto ── */}
      <section className="test-stat-card-section">
        <h2 className="test-stat-card-section-label">Mode auto</h2>
        <CardGrid auto minWidth="15rem">
          {KPIS.slice(0, 4).map((k) => (
            <StatCard
              key={k.title}
              title={k.title}
              value={k.value}
              format={k.format}
              icon={k.icon}
              iconTone={k.iconTone}
              badge={k.badge}
              footerTitle={k.footerTitle}
              footerNote={k.footerNote} />
          ))}
        </CardGrid>
      </section>
    </>
  );
};

export default StatCardShowcase;
