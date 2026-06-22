'use client';

import { Fragment, useEffect, useState } from 'react';
import Tooltip from '@/components/filter/Tooltip/Tooltip';
import { DEFAULT_CONNECTORS, defaultValue, isComplete } from '../../utils/filterTypes';
import { buildTree, serialize, treeToSQL } from '../../utils/filterEngine';
import CriterionMenu from '../CriterionMenu/CriterionMenu';
import Connector from './Connector';
import './MultiCriterionMenu.scss';

// ── Icône + (bouton d'ajout) ──
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

// Identifiant unique d'une carte = (plus grand id présent) + 1. Suffit à garantir des
// clés React stables (unicité parmi les cartes courantes) SANS variable de module ni
// accès à une ref pendant le rendu — ces deux pistes étant respectivement à éviter
// (instances partagées) et interdites par le React Compiler / les règles react-hooks.
const nextId = (list) => list.reduce((max, c) => Math.max(max, c.id), 0) + 1;

// Critère vierge (mode libre)
const makeBlank = (id) => ({
  id,
  variable: null,
  operation: null,
  value: null,
  type: null,
  parenLeft: false,
  parenRight: false,
});

/**
 * Combines several CriterionMenu cards linked by logical connectors, with optional
 * grouping parentheses, and exposes a structured value (depth/group tree) plus a
 * generated SQL WHERE clause.
 *
 * @param {'horizontal'|'vertical'} [orientation='horizontal'] - Layout direction.
 * @param {boolean} [wrap=false] - Horizontal only: wrap cards instead of scrolling.
 * @param {boolean} [parentheses=true] - Enables the grouping parentheses on cards.
 * @param {{value: string, label: string}[]} [connectorOptions=DEFAULT_CONNECTORS] -
 *   Options of the connector select.
 * @param {?string} [fixedConnector=null] - Single connector applied between every
 *   card (renders connectors as static labels). null = free choice.
 * @param {boolean} [showConnectors=true] - Renders the connector between cards.
 * @param {{value: string, label: string, type: string}[]} [variables=[]] - Variable catalog.
 * @param {object} [operationsByType={}] - Operation options indexed by variable type.
 * @param {function(string): Promise<{value: string, label: string}[]>} [fetchValues] -
 *   Async loader of categorical value options.
 * @param {?string[]} [lockedVariables=null] - Variable ids freezing each card (fixed
 *   number of cards). null = free.
 * @param {?string[]} [lockedOperations=null] - Operation ids aligned on lockedVariables.
 * @param {boolean} [showOperations=true] - Renders the operation row of each card.
 * @param {'button'|'auto'} [addMode='button'] - Card adding strategy.
 * @param {?number} [maxMenus=null] - Maximum number of cards (null = unlimited).
 * @param {boolean} [validate=false] - Colors card validity.
 * @param {boolean} [showLabels=false] - Shows the Variable/Operation/Value labels.
 * @param {function({tree: object, balanced: boolean, sql: string, serial: object}): void} [onChange] -
 *   Receives the structured value + SQL whenever it changes.
 * @returns {JSX.Element}
 */
const MultiCriterionMenu = ({
  orientation = 'horizontal',
  wrap = false,
  parentheses = true,
  connectorOptions = DEFAULT_CONNECTORS,
  fixedConnector = null,
  showConnectors = true,
  variables = [],
  operationsByType = {},
  fetchValues,
  lockedVariables = null,
  lockedOperations = null,
  showOperations = true,
  addMode = 'button',
  maxMenus = null,
  validate = false,
  showLabels = false,
  onChange,
}) => {
  // Configuration de figeage (null si aucune variable figée)
  const lockedVars = lockedVariables && lockedVariables.length ? lockedVariables : null;
  // Connecteur par défaut : fixe, sinon première option, sinon 'AND'
  const defaultConn = fixedConnector || (connectorOptions[0] ? connectorOptions[0].value : 'AND');
  // Connecteur figé en libellé statique : fixe imposé OU une seule option disponible
  const connectorIsStatic = !!fixedConnector || connectorOptions.length <= 1;
  // Options réellement passées au select (réduites au connecteur fixe le cas échéant)
  const effectiveOptions = fixedConnector
    ? [{ value: fixedConnector, label: fixedConnector }]
    : connectorOptions;

  // Critère figé sur une variable (+ opération éventuellement imposée)
  const makeLocked = (variableId, lockedOp, id) => {
    const meta = variables.find((v) => v.value === variableId);
    const t = meta ? meta.type : null;
    const ops = t ? operationsByType[t] || [] : [];
    const op = lockedOp || (ops[0] ? ops[0].value : null);
    return {
      id,
      variable: variableId,
      operation: op,
      value: defaultValue(t, op),
      type: t,
      parenLeft: false,
      parenRight: false,
    };
  };

  // Construit le jeu de cartes initial (ids attribués par index, 1..n)
  const buildCards = () =>
    lockedVars
      ? lockedVars.map((vid, i) => makeLocked(vid, lockedOperations && lockedOperations[i], i + 1))
      : [makeBlank(1)];

  // État : cartes + connecteurs (connectors[i] relie criteria[i] et criteria[i+1])
  const [criteria, setCriteria] = useState(buildCards);
  const [connectors, setConnectors] = useState(() =>
    lockedVars ? lockedVars.slice(1).map(() => defaultConn) : []);

  const atMax = maxMenus != null && maxMenus > 0 && criteria.length >= maxMenus;

  // ── Réinitialisation au changement de configuration de figeage ──
  // Pattern « ajustement d'état pendant le rendu » (React docs : You Might Not Need an
  // Effect) plutôt qu'un setState dans un effet : on compare la signature de figeage à
  // sa valeur précédente, mémorisée en état. Reconstruire ici évite un commit superflu.
  const lockSig =
    `${lockedVars ? lockedVars.join(',') : ''}|${lockedOperations ? lockedOperations.join(',') : ''}`;
  const [prevLockSig, setPrevLockSig] = useState(lockSig);
  if (prevLockSig !== lockSig) {
    setPrevLockSig(lockSig);
    const cards = buildCards();
    setCriteria(cards);
    setConnectors(cards.slice(1).map(() => defaultConn));
  }

  // ── Réduction du nombre de cartes si maxMenus passe sous la longueur actuelle ──
  // Même pattern d'ajustement pendant le rendu, déclenché au changement de maxMenus.
  const [prevMax, setPrevMax] = useState(maxMenus);
  if (prevMax !== maxMenus) {
    setPrevMax(maxMenus);
    if (!lockedVars && maxMenus != null && maxMenus > 0 && criteria.length > maxMenus) {
      setCriteria((prev) => prev.slice(0, maxMenus));
      setConnectors((prev) => prev.slice(0, Math.max(0, maxMenus - 1)));
    }
  }

  // ── Mutations (gérées dans les handlers d'événements, jamais dans un effet) ──

  // Mise à jour partielle d'un critère. En mode AUTO, compléter la DERNIÈRE carte
  // ajoute automatiquement une carte vierge : le comportement vit dans le handler
  // (réaction à une saisie utilisateur), pas dans un effet de synchronisation.
  const updateCriterion = (idx, next) => {
    setCriteria((prev) => prev.map((c, i) => (i === idx ? next : c)));
    if (
      addMode === 'auto'
      && !lockedVars
      && idx === criteria.length - 1
      && isComplete(next)
      && !atMax
    ) {
      setCriteria((prev) => [...prev, makeBlank(nextId(prev))]);
      setConnectors((prev) => [...prev, defaultConn]);
    }
  };

  // Ajout manuel d'une carte (mode bouton)
  const addCriterion = () => {
    if (atMax) return;
    setCriteria((prev) => [...prev, makeBlank(nextId(prev))]);
    setConnectors((prev) => [...prev, defaultConn]);
  };

  // Suppression d'une carte (et du connecteur adjacent)
  const removeCriterion = (idx) => {
    if (criteria.length <= 1) return;
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
    setConnectors((prev) => {
      const nextConn = prev.slice();
      nextConn.splice(idx > 0 ? idx - 1 : 0, 1);
      return nextConn;
    });
  };

  // Mise à jour d'un connecteur
  const setConnector = (idx, val) =>
    setConnectors((prev) => prev.map((c, i) => (i === idx ? val : c)));

  // ── Valeur structurée + SQL ──
  // Dérivation directe (pas de useMemo : le React Compiler mémoïse cette valeur et
  // garde une référence stable tant que les critères/connecteurs ne changent pas).
  const items = criteria.map((c, i) => ({
    variable: c.variable,
    operation: c.operation,
    value: c.value,
    type: c.type,
    parenLeft: parentheses ? !!c.parenLeft : false,
    parenRight: parentheses ? !!c.parenRight : false,
    connectorBefore: i === 0 ? null : fixedConnector || connectors[i - 1] || defaultConn,
  }));
  const { tree, balanced } = buildTree(items);
  const structure = { tree, balanced, sql: treeToSQL(tree), serial: serialize(tree) };

  // Remontée de la valeur : effet dépendant de la valeur dérivée `structure`
  // (mémoïsée par le compilateur → l'effet ne se déclenche qu'à un vrai changement).
  useEffect(() => {
    onChange?.(structure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure]);

  // ── Rendu ──
  const showAddButton = !lockedVars && addMode === 'button' && !atMax;
  const rowClass =
    `mcm-row mcm-row--${orientation}${orientation === 'horizontal' && wrap ? ' mcm-row--wrap' : ''}`;

  return (
    <div className="mcm-builder">
      <div className={rowClass}>
        {criteria.map((c, i) => (
          <Fragment key={c.id}>
            {/* Connecteur logique entre deux cartes */}
            {i > 0 && showConnectors && (
              <Connector
                orientation={orientation}
                isStatic={connectorIsStatic}
                value={fixedConnector || connectors[i - 1] || defaultConn}
                options={effectiveOptions}
                onChange={(v) => setConnector(i - 1, v)} />
            )}
            {/* Espace simple quand les connecteurs sont masqués */}
            {i > 0 && !showConnectors && (
              <div className={`mcm-gap mcm-gap--${orientation}`} aria-hidden="true" />
            )}

            <div className="mcm-slot">
              <CriterionMenu
                criterion={c}
                onChange={(next) => updateCriterion(i, next)}
                onRemove={() => removeCriterion(i)}
                removable={!lockedVars && criteria.length > 1}
                variables={variables}
                operationsByType={operationsByType}
                fetchValues={fetchValues}
                parentheses={parentheses}
                validate={validate}
                showLabels={showLabels}
                lockedVariable={!!lockedVars}
                lockedOperation={!!(lockedOperations && lockedOperations.length)}
                showOperation={showOperations} />
            </div>
          </Fragment>
        ))}

        {showAddButton && (
          <>
            {/* Petit trait reliant la dernière carte au bouton + */}
            {criteria.length > 0 && (
              <div className={`mcm-add-connector mcm-connector--${orientation}`} aria-hidden="true">
                <div className="mcm-connector__line" />
              </div>
            )}
            <div className="mcm-add-wrap">
              <Tooltip content="Ajouter un critère" position="top">
                <button
                  type="button"
                  className={`mcm-add mcm-add--${orientation}`}
                  onClick={addCriterion}
                  aria-label="Ajouter un critère">
                  <PlusIcon />
                </button>
              </Tooltip>
            </div>
          </>
        )}
      </div>

      {atMax && !lockedVars && (
        <p className="mcm-max-note">Nombre maximum de critères atteint ({maxMenus}).</p>
      )}
    </div>
  );
};

export default MultiCriterionMenu;
