'use client';

import { useState } from 'react';
import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import { CONTINUOUS_VARS, DATE_VARS, OPS_BY_TYPE } from '@/features/filter/utils/filterTypes';

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

      {/* Un seul bloc global avec préfixe tp- pour éviter les collisions.
          Nécessaire car <style jsx> ne traverse pas les frontières de composant
          (CtrlBtn, CtrlRadio sont des composants séparés). */}
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
          white-space: nowrap;
        }
        .tp-ctrl-btn:hover { border-color: #9ca3af; color: #111827; }
        .tp-ctrl-btn--active {
          background: #eff6ff !important;
          border-color: #3b82f6 !important;
          color: #1d4ed8 !important;
          font-weight: 500;
        }
        .tp-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: var(--spacing-2xl, 2rem) var(--spacing-lg, 1rem);
          display: flex;
          flex-direction: column;
          gap: var(--spacing-2xl, 2rem);
        }
        .tp-h1 {
          font-size: var(--font-size-xl, 1.25rem);
          font-weight: 700;
          color: hsl(var(--color-text-primary));
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
        .ctrl-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
        }
        .ctrl-group {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .ctrl-label {
          font-size: 0.75rem;
          color: #6b7280;
          margin-right: 0.25rem;
          white-space: nowrap;
        }
        .ctrl-number {
          width: 4.5rem;
          padding: 0.2rem 0.4rem;
          font-size: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          color: #111827;
          outline: none;
          font-family: inherit;
        }
        .ctrl-number:focus {
          border-color: #3b82f6;
          outline: none;
        }
        .tp-output-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-xl, 1.5rem);
          align-items: start;
        }
        .tp-output {
          border: 1px solid hsl(var(--color-border));
          border-radius: var(--border-radius-lg, 8px);
          background: hsl(var(--color-surface));
          overflow: hidden;
        }
        .tp-output-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--spacing-md, 0.75rem);
          padding: var(--spacing-sm, 0.5rem) var(--spacing-lg, 1rem);
          background: hsl(var(--color-gray-50));
          border-bottom: 1px solid hsl(var(--color-border));
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: hsl(var(--color-text-tertiary));
        }
        .tp-output-body {
          padding: var(--spacing-lg, 1rem);
          font-family: var(--font-mono, monospace);
          font-size: var(--font-size-xs, 0.75rem);
          line-height: 1.65;
          color: hsl(var(--color-text-secondary));
          white-space: pre-wrap;
          overflow-x: auto;
          max-height: 380px;
          overflow-y: auto;
          margin: 0;
        }
        .tp-sql {
          color: hsl(var(--color-text-primary));
          word-break: break-word;
        }
        .badge {
          font-size: var(--font-size-xs, 0.75rem);
          font-weight: 500;
          text-transform: none;
          letter-spacing: 0;
        }
        .badge--ok   { color: hsl(var(--color-success-500)); }
        .badge--warn { color: hsl(var(--color-error-500)); }
        @media (max-width: 860px) {
          .tp-output-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </ThemeProvider>
  );
};

export default TestMultiCriterionMenuPage;
