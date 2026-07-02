'use client';

import { useState } from 'react';
import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import { useVariableMetadata, metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import { treeToSQL } from '@/features/filter/utils/filterEngine';
import operations from '../../../config/filter/operations.json';
import './page.scss';

// Sous-ensemble de démonstration : 4 numériques + 2 dates + 3 catégoriels + 2 textes.
const DEMO_FIELDS = [
  'gdp', 'inflation', 'chomage', 'dette_pib',
  'date_obs', 'date_pub',
  'country', 'sector', 'indicator',
  'libelle', 'source',
];

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
  // ── Métadonnées des variables (métadonnées API mockées) ──
  const { fields } = useVariableMetadata();
  const allVars = metadataToVariables(fields);
  const variables = DEMO_FIELDS
    .map((name) => allVars.find((v) => v.value === name))
    .filter(Boolean);

  // ── Panneau de contrôle ──
  const [orientation,    setOrientation]    = useState('horizontal');
  const [wrap,           setWrap]           = useState(false);
  const [parentheses,    setParentheses]    = useState(false);
  const [showConnectors, setShowConnectors] = useState(true);
  const [addMode,        setAddMode]        = useState('button');
  const [maxMenusRaw,    setMaxMenusRaw]    = useState(0);
  const [validate,       setValidate]       = useState(true);
  const [footer,         setFooter]         = useState(false);
  const [showLabels,     setShowLabels]     = useState(false);
  const [showOperations, setShowOperations] = useState(true);
  const [showJson,       setShowJson]       = useState(true);
  const [showSql,        setShowSql]        = useState(true);

  // Résultat structuré produit par MultiCriterionMenu ({ tree, balanced, serial })
  const [result, setResult] = useState(null);

  // 0 = illimité → null pour le composant
  const maxMenus = maxMenusRaw > 0 ? maxMenusRaw : null;

  // Le SQL de démonstration est dérivé ICI (côté page) à partir de l'arbre : le
  // MultiCriterionMenu n'expose que le JSON, cible à terme du seul échange avec l'API.
  const sql = result?.tree ? treeToSQL(result.tree) : '';

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
            <CtrlBtn label="footer"         value={footer}         onChange={setFooter} />
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
            variables={variables}
            operationsByType={operations}
            showOperations={showOperations}
            addMode={addMode}
            maxMenus={maxMenus}
            validate={validate}
            footer={footer}
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
                      {result?.balanced ? 'crochets équilibrés' : 'crochets déséquilibrés'}
                    </span>
                  </div>
                  <pre className="tp-output-body">{result ? JSON.stringify(result.serial, null, 2) : '—'}</pre>
                </div>
              )}

              {showSql && (
                <div className="tp-output">
                  <div className="tp-output-head">WHERE — SQL généré (dérivé en page)</div>
                  <pre className="tp-output-body tp-sql">
                    {sql ? `WHERE ${sql}` : '—'}
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
