'use client';

import { useState } from 'react';
import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import { CONTINUOUS_VARS, DATE_VARS, OPS_BY_TYPE } from '@/features/filter/utils/filterTypes';
import './page.scss';

// Catalogue complet : 4 continus + 2 dates + 3 catégoriels + 2 textes
const ALL_VARIABLES = [
  ...CONTINUOUS_VARS.slice(0, 4),
  ...DATE_VARS.slice(0, 2),
  { value: 'country',   label: 'Pays',                type: 'categorical' },
  { value: 'sector',    label: "Secteur d'activité",  type: 'categorical' },
  { value: 'indicator', label: 'Indicateur',          type: 'categorical' },
  { value: 'libelle',   label: 'Libellé',             type: 'text' },
  { value: 'source',    label: 'Source',              type: 'text' },
];

// Valeurs catégorielles fictives (même que page 1, complétées)
const MOCK_VALUES = {
  indicator: [
    { value: 'pib',      label: 'PIB' },
    { value: 'conso',    label: 'Consommation' },
    { value: 'invest',   label: 'Investissement' },
    { value: 'export',   label: 'Exportations' },
    { value: 'emploi',   label: 'Emploi' },
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
  sector: [
    { value: 'agri',    label: 'Agriculture' },
    { value: 'indus',   label: 'Industrie' },
    { value: 'serv',    label: 'Services' },
    { value: 'finance', label: 'Finance' },
    { value: 'energie', label: 'Énergie' },
  ],
  source: [
    { value: 'bce',      label: 'BCE' },
    { value: 'ocde',     label: 'OCDE' },
    { value: 'insee',    label: 'INSEE' },
    { value: 'eurostat', label: 'Eurostat' },
  ],
};

// Simule la latence réseau (300ms)
const mockFetchValues = (id) =>
  new Promise((res) => setTimeout(() => res(MOCK_VALUES[id] ?? []), 300));

// ── Composants du panneau de contrôle (classes globales tp-ctrl-btn) ──

const CtrlBtn = ({ label, value, onChange }) => (
  <button
    type="button"
    className={value ? 'tp-ctrl-btn tp-ctrl-btn--active' : 'tp-ctrl-btn'}
    onClick={() => onChange(!value)}>
    {label}
  </button>
);

const CtrlRadio = ({ label, options, value, onChange }) => (
  <div className="ctrl-group">
    <span className="ctrl-label">{label} :</span>
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        className={value === opt ? 'tp-ctrl-btn tp-ctrl-btn--active' : 'tp-ctrl-btn'}
        onClick={() => onChange(opt)}>
        {opt}
      </button>
    ))}
  </div>
);

const CtrlNumber = ({ label, value, min, max, onChange }) => (
  <div className="ctrl-group">
    <label className="ctrl-label">{label} :</label>
    <input
      type="number"
      className="ctrl-number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))} />
  </div>
);

const TestMultiCriterionMenuPage = () => {
  // ── Panneau de contrôle ──
  const [orientation,    setOrientation]    = useState('horizontal');
  const [wrap,           setWrap]           = useState(false);
  const [parentheses,    setParentheses]    = useState(false);
  const [showConnectors, setShowConnectors] = useState(true);
  const [addMode,        setAddMode]        = useState('button');
  const [maxMenusRaw,    setMaxMenusRaw]    = useState(0);
  const [validate,       setValidate]       = useState(true);
  const [showLabels,     setShowLabels]     = useState(false);
  const [showOperations, setShowOperations] = useState(true);
  const [showJson,       setShowJson]       = useState(true);
  const [showSql,        setShowSql]        = useState(true);

  // Résultat structuré produit par MultiCriterionMenu
  const [result, setResult] = useState(null);

  // 0 = illimité → null pour le composant
  const maxMenus = maxMenusRaw > 0 ? maxMenusRaw : null;

  return (
    <ThemeProvider>
      <main className="tp-main">
        <h1 className="tp-h1">Test — MultiCriterionMenu</h1>

        {/* ── Panneau de contrôle ── */}
        <section className="tp-section">
          <h2 className="tp-h2">Panneau de contrôle</h2>

          <div className="ctrl-row">
            <CtrlRadio label="orientation" options={['horizontal', 'vertical']} value={orientation} onChange={setOrientation} />
            {orientation === 'horizontal' && (
              <CtrlBtn label="wrap" value={wrap} onChange={setWrap} />
            )}
          </div>

          <div className="ctrl-row">
            <CtrlBtn label="parentheses"    value={parentheses}    onChange={setParentheses} />
            <CtrlBtn label="showConnectors" value={showConnectors} onChange={setShowConnectors} />
          </div>

          <div className="ctrl-row">
            <CtrlRadio label="addMode" options={['button', 'auto']} value={addMode} onChange={setAddMode} />
            <CtrlNumber label="maxMenus (0 = illimité)" value={maxMenusRaw} min={0} max={8} onChange={setMaxMenusRaw} />
          </div>

          <div className="ctrl-row">
            <CtrlBtn label="validate"       value={validate}       onChange={setValidate} />
            <CtrlBtn label="showLabels"     value={showLabels}     onChange={setShowLabels} />
            <CtrlBtn label="showOperations" value={showOperations} onChange={setShowOperations} />
          </div>

          <div className="ctrl-row">
            <CtrlBtn label="showJson" value={showJson} onChange={setShowJson} />
            <CtrlBtn label="showSql"  value={showSql}  onChange={setShowSql} />
          </div>
        </section>

        {/* ── Composant ── */}
        <section className="tp-section">
          <h2 className="tp-h2">Composant</h2>
          <MultiCriterionMenu
            orientation={orientation}
            wrap={wrap}
            parentheses={parentheses}
            showConnectors={showConnectors}
            variables={ALL_VARIABLES}
            operationsByType={OPS_BY_TYPE}
            fetchValues={mockFetchValues}
            showOperations={showOperations}
            addMode={addMode}
            maxMenus={maxMenus}
            validate={validate}
            showLabels={showLabels}
            onChange={setResult} />
        </section>

        {/* ── Sorties JSON + SQL ── */}
        {(showJson || showSql) && (
          <section className="tp-section">
            <h2 className="tp-h2">Sorties</h2>
            <div className="tp-output-grid">

              {showJson && (
                <div className="tp-output">
                  <div className="tp-output-head">
                    <span>Valeur structurée (JSON)</span>
                    <span className={result?.balanced ? 'badge badge--ok' : 'badge badge--warn'}>
                      {result?.balanced ? 'parenthèses équilibrées' : 'parenthèses déséquilibrées'}
                    </span>
                  </div>
                  <pre className="tp-output-body">{result ? JSON.stringify(result.serial, null, 2) : '—'}</pre>
                </div>
              )}

              {showSql && (
                <div className="tp-output">
                  <div className="tp-output-head">WHERE — SQL généré</div>
                  <pre className="tp-output-body tp-sql">
                    {result?.sql ? `WHERE ${result.sql}` : '—'}
                  </pre>
                </div>
              )}

            </div>
          </section>
        )}

      </main>
    </ThemeProvider>
  );
};

export default TestMultiCriterionMenuPage;
