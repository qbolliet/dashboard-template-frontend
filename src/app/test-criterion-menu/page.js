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
import './page.scss';

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
  // (showSlider n'a d'effet que sur le type continu ; ignoré par les autres types)
  const shared = { validate, showLabels, parentheses, showSlider, operationsByType: OPS_BY_TYPE };

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
    </ThemeProvider>
  );
};

export default TestCriterionMenuPage;
