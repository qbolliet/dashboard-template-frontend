'use client';

import { useState } from 'react';
import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import CriterionMenu from '@/features/filter/components/CriterionMenu/CriterionMenu';
import {
  CONTINUOUS_VARS,
  DATE_VARS,
  CATEGORICAL_VARS,
  TEXT_VARS,
  OPS_BY_TYPE,
} from '@/features/filter/utils/filterTypes';

// Valeurs catégorielles fictives (simule un backend)
const MOCK_VALUES = {
  indicator: [
    { value: 'pib', label: 'PIB' },
    { value: 'conso', label: 'Consommation' },
    { value: 'invest', label: 'Investissement' },
    { value: 'export', label: 'Exportations' },
    { value: 'emploi', label: 'Emploi' },
    { value: 'taux_dir', label: 'Taux directeur' },
  ],
  country: [
    { value: 'fr', label: 'France' },
    { value: 'de', label: 'Allemagne' },
    { value: 'it', label: 'Italie' },
    { value: 'es', label: 'Espagne' },
    { value: 'nl', label: 'Pays-Bas' },
    { value: 'be', label: 'Belgique' },
    { value: 'pt', label: 'Portugal' },
    { value: 'pl', label: 'Pologne' },
    { value: 'se', label: 'Suède' },
  ],
};

// Simule la latence réseau d'un fetch réel (300ms)
const mockFetchValues = (id) =>
  new Promise((res) => setTimeout(() => res(MOCK_VALUES[id] ?? []), 300));

// États initiaux des 5 critères (pré-remplis pour faciliter les tests)
const INIT_A = { variable: 'gdp',       operation: 'between', value: { min: -2, max: 5 }, type: 'continuous',  parenLeft: false, parenRight: false };
const INIT_B = { variable: 'date_obs',  operation: 'between', value: '',                  type: 'date',         parenLeft: false, parenRight: false };
const INIT_C = { variable: 'indicator', operation: 'in',      value: [],                  type: 'categorical',  parenLeft: false, parenRight: false };
const INIT_D = { variable: 'libelle',   operation: 'eq',      value: '',                  type: 'text',         parenLeft: false, parenRight: false };
const INIT_E = { variable: 'country',   operation: 'in',      value: [],                  type: 'categorical',  parenLeft: false, parenRight: false };
const INIT_PAREN = { variable: 'indicator', operation: 'in',  value: [],                  type: 'categorical',  parenLeft: false, parenRight: false };

// Catalogue réduit pour la carte E (variable unique figée)
const COUNTRY_VARS = [{ value: 'country', label: 'Pays', type: 'categorical' }];

// Bouton toggle du panneau de contrôle (classes globales tp-ctrl-btn)
const CtrlBtn = ({ label, value, onChange }) => (
  <button
    type="button"
    className={value ? 'tp-ctrl-btn tp-ctrl-btn--active' : 'tp-ctrl-btn'}
    onClick={() => onChange(!value)}>
    {label}
  </button>
);

const TestCriterionMenuPage = () => {
  // ── Panneau de contrôle ──
  const [validate,             setValidate]             = useState(false);
  const [showLabels,           setShowLabels]           = useState(false);
  const [hideOperationWhenSet, setHideOperationWhenSet] = useState(false);
  const [showSlider,           setShowSlider]           = useState(true);
  const [parentheses,          setParentheses]          = useState(false);

  // ── États contrôlés des 5 cartes ──
  const [critA, setCritA] = useState(INIT_A);
  const [critB, setCritB] = useState(INIT_B);
  const [critC, setCritC] = useState(INIT_C);
  const [critD, setCritD] = useState(INIT_D);
  const [critE, setCritE] = useState(INIT_E);

  // ── Critère de la section parenthèses ──
  const [critParen, setCritParen] = useState(INIT_PAREN);

  // Props partagées entre toutes les cartes de la grille
  const shared = { validate, showLabels, parentheses, operationsByType: OPS_BY_TYPE };

  // hideOperationWhenSet simulé via showOperation (prop native du CriterionMenu)
  const opVisible = (crit) => !hideOperationWhenSet || !crit.operation;

  return (
    <ThemeProvider>
      <main className="tp-main">

        {/* ── Section 0 : panneau de contrôle ── */}
        <section className="tp-section">
          <h2 className="tp-h2">Panneau de contrôle</h2>
          <div className="ctrl-row">
            <CtrlBtn label="validate"             value={validate}             onChange={setValidate} />
            <CtrlBtn label="showLabels"           value={showLabels}           onChange={setShowLabels} />
            <CtrlBtn label="hideOperationWhenSet" value={hideOperationWhenSet} onChange={setHideOperationWhenSet} />
            <CtrlBtn label="showSlider"           value={showSlider}           onChange={setShowSlider} />
            <CtrlBtn label="parentheses"          value={parentheses}          onChange={setParentheses} />
          </div>
        </section>

        {/* ── Section 1 : grille 2 colonnes des 5 types de cartes ── */}
        <section className="tp-section">
          <h2 className="tp-h2">Grille des 5 types de cartes</h2>
          <div className="tp-grid">

            <div className="tp-card-wrap">
              <h3 className="tp-h3">A — Continu <span>(gdp, between)</span></h3>
              <CriterionMenu
                criterion={critA}
                onChange={setCritA}
                variables={CONTINUOUS_VARS}
                showOperation={opVisible(critA)}
                {...shared} />
            </div>

            <div className="tp-card-wrap">
              <h3 className="tp-h3">B — Date <span>(date_obs, between)</span></h3>
              <CriterionMenu
                criterion={critB}
                onChange={setCritB}
                variables={DATE_VARS}
                showOperation={opVisible(critB)}
                {...shared} />
            </div>

            <div className="tp-card-wrap">
              <h3 className="tp-h3">C — Catégoriel <span>(indicator, in)</span></h3>
              <CriterionMenu
                criterion={critC}
                onChange={setCritC}
                variables={CATEGORICAL_VARS}
                fetchValues={mockFetchValues}
                showOperation={opVisible(critC)}
                {...shared} />
            </div>

            <div className="tp-card-wrap">
              <h3 className="tp-h3">D — Texte <span>(libelle, eq)</span></h3>
              <CriterionMenu
                criterion={critD}
                onChange={setCritD}
                variables={TEXT_VARS}
                showOperation={opVisible(critD)}
                {...shared} />
            </div>

            <div className="tp-card-wrap">
              <h3 className="tp-h3">E — Variable figée <span>(country)</span></h3>
              <CriterionMenu
                criterion={critE}
                onChange={setCritE}
                variables={COUNTRY_VARS}
                fetchValues={mockFetchValues}
                lockedVariable
                showOperation={opVisible(critE)}
                {...shared} />
            </div>

          </div>
        </section>

        {/* ── Section 2 : critère avec parenthèses ── */}
        <section className="tp-section">
          <h2 className="tp-h2">Critère avec parenthèses</h2>
          <p className="tp-desc">
            Les boutons parenthèses encadrent la carte. Au repos ils sont quasi invisibles ;
            cliqués, ils deviennent actifs. Le JSON ci-dessous reflète l'état en temps réel.
          </p>
          <div className="tp-paren-demo">
            <CriterionMenu
              criterion={critParen}
              onChange={setCritParen}
              variables={CATEGORICAL_VARS}
              fetchValues={mockFetchValues}
              operationsByType={OPS_BY_TYPE}
              parentheses
              validate={validate}
              showLabels={showLabels} />
          </div>
          <pre className="tp-json">{JSON.stringify(
            {
              variable:   critParen.variable,
              operation:  critParen.operation,
              value:      critParen.value,
              parenLeft:  critParen.parenLeft,
              parenRight: critParen.parenRight,
            },
            null,
            2,
          )}</pre>
        </section>

      </main>

      {/* Un seul bloc global avec préfixe tp- (scope styled-jsx ne traverse pas les composants). */}
      <style jsx global>{`
        .tp-ctrl-btn {
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          border-radius: 4px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #4b5563;
          cursor: pointer;
          transition: background 120ms, border-color 120ms, color 120ms;
          font-family: inherit;
        }
        .tp-ctrl-btn:hover { border-color: #9ca3af; color: #111827; }
        .tp-ctrl-btn--active {
          background: #eff6ff !important;
          border-color: #3b82f6 !important;
          color: #1d4ed8 !important;
          font-weight: 500;
        }
        .tp-main {
          max-width: 900px;
          margin: 0 auto;
          padding: var(--spacing-2xl, 2rem) var(--spacing-lg, 1rem);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl, 2rem);
        }
        .tp-section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg, 1rem);
        }
        .tp-h2 {
          font-size: var(--font-size-lg, 1.125rem);
          font-weight: 600;
          color: hsl(var(--color-text-primary));
          border-bottom: 1px solid hsl(var(--color-border));
          padding-bottom: var(--spacing-sm, 0.5rem);
        }
        .tp-h3 {
          font-size: var(--font-size-sm, 0.875rem);
          font-weight: 500;
          color: hsl(var(--color-text-secondary));
          margin-bottom: var(--spacing-sm, 0.5rem);
        }
        .tp-h3 span {
          font-weight: 400;
          color: hsl(var(--color-text-tertiary));
        }
        .tp-desc {
          font-size: var(--font-size-sm, 0.875rem);
          color: hsl(var(--color-text-tertiary));
        }
        .ctrl-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .tp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-xl, 1.5rem);
          align-items: start;
        }
        .tp-card-wrap {
          display: flex;
          flex-direction: column;
        }
        .tp-paren-demo {
          max-width: 32rem;
        }
        .tp-json {
          background: hsl(var(--color-gray-50));
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-md, 6px);
          padding: var(--spacing-md, 0.75rem) var(--spacing-lg, 1rem);
          font-family: var(--font-mono, monospace);
          font-size: var(--font-size-xs, 0.75rem);
          line-height: 1.6;
          color: hsl(var(--color-text-secondary));
          max-width: 32rem;
          white-space: pre-wrap;
        }
        @media (max-width: 680px) {
          .tp-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </ThemeProvider>
  );
};

export default TestCriterionMenuPage;
