'use client';

import { useState } from 'react';
import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import CriterionMenu from '@/features/filter/components/CriterionMenu/CriterionMenu';
import { useVariableMetadata, metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import { isNumericSqlType, isDateSqlType } from '@/features/filter/utils/filterTypes';
import operations from '../../../config/filter/operations.json';
import './page.scss';

// États initiaux des critères (pré-remplis pour faciliter les tests). Chaque critère
// porte son sql_type + is_categorical (métadonnées API) au lieu d'un type abstrait.
const INIT_A = { variable: 'gdp',       operation: 'between', value: { min: -2, max: 5 }, sql_type: 'double precision', is_categorical: false, bracketLeft: false, bracketRight: false };
const INIT_B = { variable: 'date_obs',  operation: 'between', value: '',                  sql_type: 'date',             is_categorical: false, bracketLeft: false, bracketRight: false };
const INIT_C = { variable: 'indicator', operation: 'in',      value: [],                  sql_type: 'character varying', is_categorical: true,  bracketLeft: false, bracketRight: false };
const INIT_D = { variable: 'libelle',   operation: 'eq',      value: '',                  sql_type: 'text',             is_categorical: false, bracketLeft: false, bracketRight: false };
const INIT_E = { variable: 'country',   operation: 'in',      value: [],                  sql_type: 'character varying', is_categorical: true,  bracketLeft: false, bracketRight: false };
const INIT_PAREN = { variable: 'indicator', operation: 'in',  value: [],                  sql_type: 'character varying', is_categorical: true,  bracketLeft: false, bracketRight: false };

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
  // ── Métadonnées des variables (métadonnées API mockées) ──
  const { fields } = useVariableMetadata();
  const allVars = metadataToVariables(fields);
  // Sous-ensembles par type pour les cartes de démonstration
  const continuousVars  = allVars.filter((v) => !v.is_categorical && isNumericSqlType(v.sql_type));
  const dateVars        = allVars.filter((v) => isDateSqlType(v.sql_type));
  const categoricalVars = allVars.filter((v) => v.is_categorical);
  const textVars        = allVars.filter((v) => !v.is_categorical && !isNumericSqlType(v.sql_type) && !isDateSqlType(v.sql_type));
  const countryVars     = allVars.filter((v) => v.value === 'country');

  // ── Panneau de contrôle ──
  const [validate,             setValidate]             = useState(false);
  const [footer,               setFooter]               = useState(false);
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
  // (showSlider n'a d'effet que sur les types numériques/date)
  const shared = { validate, footer, showLabels, parentheses, showSlider, operationsByType: operations };

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
            <CtrlBtn label="footer"               value={footer}               onChange={setFooter} />
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
              <h3 className="tp-h3">A — Numérique <span>(gdp, between)</span></h3>
              <CriterionMenu
                criterion={critA}
                onChange={setCritA}
                variables={continuousVars}
                showOperation={opVisible(critA)}
                {...shared} />
            </div>

            <div className="tp-card-wrap">
              <h3 className="tp-h3">B — Date <span>(date_obs, between)</span></h3>
              <CriterionMenu
                criterion={critB}
                onChange={setCritB}
                variables={dateVars}
                showOperation={opVisible(critB)}
                {...shared} />
            </div>

            <div className="tp-card-wrap">
              <h3 className="tp-h3">C — Catégoriel <span>(indicator, in)</span></h3>
              <CriterionMenu
                criterion={critC}
                onChange={setCritC}
                variables={categoricalVars}
                showOperation={opVisible(critC)}
                {...shared} />
            </div>

            <div className="tp-card-wrap">
              <h3 className="tp-h3">D — Texte <span>(libelle, eq)</span></h3>
              <CriterionMenu
                criterion={critD}
                onChange={setCritD}
                variables={textVars}
                showOperation={opVisible(critD)}
                {...shared} />
            </div>

            <div className="tp-card-wrap">
              <h3 className="tp-h3">E — Variable figée <span>(country)</span></h3>
              <CriterionMenu
                criterion={critE}
                onChange={setCritE}
                variables={countryVars}
                lockedVariable
                showOperation={opVisible(critE)}
                {...shared} />
            </div>

          </div>
        </section>

        {/* ── Section 2 : critère avec parenthèses ── */}
        <section className="tp-section">
          <h2 className="tp-h2">Critère avec crochets</h2>
          <p className="tp-desc">
            Les boutons crochets encadrent la carte. Au repos ils sont quasi invisibles ;
            cliqués, ils deviennent actifs. Le JSON ci-dessous reflète l&apos;état en temps réel.
          </p>
          <div className="tp-paren-demo">
            <CriterionMenu
              criterion={critParen}
              onChange={setCritParen}
              variables={categoricalVars}
              operationsByType={operations}
              parentheses
              validate={validate}
              footer={footer}
              showLabels={showLabels} />
          </div>
          <pre className="tp-json">{JSON.stringify(
            {
              variable:     critParen.variable,
              operation:    critParen.operation,
              value:        critParen.value,
              bracketLeft:  critParen.bracketLeft,
              bracketRight: critParen.bracketRight,
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
