'use client';

// Importation des modules
import { Fragment, useEffect, useState } from 'react';
import Tooltip from '@/components/filter/Tooltip/Tooltip';
import { PlusIcon } from '@/components/icons';
import { DEFAULT_CONNECTORS, defaultValue, isComplete, resolveOperations } from '../../utils/filterTypes';
import { buildTree, serialize } from '../../utils/filterEngine';
import CriterionMenu from '../CriterionMenu/CriterionMenu';
import Connector from './Connector/Connector';
import './MultiCriterionMenu.scss';

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
  sql_type: null,
  is_categorical: false,
  bracketLeft: false,
  bracketRight: false,
});

/**
 * Combines several CriterionMenu cards linked by logical connectors, with optional
 * grouping brackets, and exposes a structured value (depth/group tree + serialisation).
 * The SQL clause is intentionally NOT computed here: the target is to pass only the JSON
 * to the API, which rewrites the underlying SQL (a demo page may still derive SQL from
 * `tree` via filterEngine.treeToSQL).
 *
 * @param {'horizontal'|'vertical'} [orientation='horizontal'] - Layout direction.
 * @param {boolean} [wrap=false] - Horizontal only: wrap cards instead of scrolling.
 * @param {boolean} [parentheses=true] - Enables the grouping brackets on cards.
 * @param {{value: string, label: string}[]} [connectorOptions=DEFAULT_CONNECTORS] -
 *   Options of the connector select. A single option renders the connectors as static
 *   labels (the way to impose one connector between every card).
 * @param {boolean} [showConnectors=true] - Renders the connector between cards.
 * @param {{value: string, label: string, sql_type: string, is_categorical: boolean}[]} [variables=[]] -
 *   Variable metadata list.
 * @param {Object<string, {value: string, label: string}[]>} [operationsByType={}] -
 *   Operations indexed by sql_type / "categorical".
 * @param {string} [catalog] - API catalog forwarded to the cards' value primitives.
 * @param {?Array<{variable: ?string, operation: ?string, value: *, sql_type: ?string,
 *   is_categorical: ?boolean, bracketLeft: ?boolean, bracketRight: ?boolean,
 *   connectorBefore: ?string}>} [defaultCriteria=null] - Initial criteria seeding the
 *   builder (e.g. a persisted filter, same shape as the `criteria` emitted by
 *   `onChange`). Uncontrolled: read once at mount (and on lock reset); ignored when
 *   `lockedVariables` is set.
 * @param {?string[]} [lockedVariables=null] - Variable ids freezing each card (fixed
 *   number of cards). null = free.
 * @param {?string[]} [lockedOperations=null] - Operation ids aligned on lockedVariables;
 *   each entry freezes the operation of its own card only.
 * @param {boolean} [showOperations=true] - Renders the operation row of each card
 *   (mapped to each card's singular `showOperation` prop).
 * @param {'button'|'auto'} [addMode='button'] - Card adding strategy.
 * @param {?number} [maxCriteria=null] - Maximum number of cards (null = unlimited).
 * @param {boolean} [validate=false] - Colors card validity.
 * @param {boolean} [footer=false] - Renders each card's validity footer (with `validate`).
 * @param {boolean} [showLabels=false] - Shows the Variable/Operation/Value labels.
 * @param {boolean} [showSlider=false] - Numeric/date value fields: render the slider bar.
 * @param {function({criteria: Array, tree: object, balanced: boolean, serial: object}): void} [onChange] -
 *   Receives the structured value whenever it changes; `criteria` is the flat list
 *   (reusable as `defaultCriteria` to rehydrate the builder).
 * @param {string} [className] - Additional class(es) merged on the root element.
 * @param {Object} [style] - Additional inline styles merged on the root element.
 * @returns {JSX.Element}
 */
const MultiCriterionMenu = ({
  orientation = 'horizontal',
  wrap = false,
  parentheses = true,
  connectorOptions = DEFAULT_CONNECTORS,
  showConnectors = true,
  variables = [],
  operationsByType = {},
  catalog,
  defaultCriteria = null,
  lockedVariables = null,
  lockedOperations = null,
  showOperations = true,
  addMode = 'button',
  maxCriteria = null,
  validate = false,
  footer = false,
  showLabels = false,
  showSlider = false,
  onChange,
  className = '',
  style,
}) => {
  // Configuration de figeage (null si aucune variable figée)
  const lockedVars = lockedVariables && lockedVariables.length ? lockedVariables : null;
  // Connecteur par défaut : première option, sinon 'AND'
  const defaultConn = connectorOptions[0] ? connectorOptions[0].value : 'AND';
  // Connecteur figé en libellé statique : une seule option disponible
  const connectorIsStatic = connectorOptions.length <= 1;

  // Critère figé sur une variable (+ opération éventuellement imposée)
  const makeLocked = (variableId, lockedOp, id) => {
    const meta = variables.find((v) => v.value === variableId) ?? null;
    const t = meta?.sql_type ?? null;
    const cat = meta?.is_categorical ?? false;
    const ops = resolveOperations(t, cat, operationsByType);
    const op = lockedOp || (ops[0] ? ops[0].value : null);
    return {
      id,
      variable: variableId,
      operation: op,
      value: defaultValue(t, cat, op),
      sql_type: t,
      is_categorical: cat,
      bracketLeft: false,
      bracketRight: false,
    };
  };

  // Construit le jeu de cartes initial (ids attribués par index, 1..n) :
  // variables figées > critères par défaut (filtre persisté) > carte vierge.
  const buildCards = () => {
    if (lockedVars) {
      return lockedVars.map((vid, i) => makeLocked(vid, lockedOperations && lockedOperations[i], i + 1));
    }
    if (defaultCriteria && defaultCriteria.length) {
      return defaultCriteria.map((c, i) => ({
        id: i + 1,
        variable: c.variable ?? null,
        operation: c.operation ?? null,
        value: c.value ?? null,
        sql_type: c.sql_type ?? null,
        is_categorical: !!c.is_categorical,
        bracketLeft: !!c.bracketLeft,
        bracketRight: !!c.bracketRight,
      }));
    }
    return [makeBlank(1)];
  };

  // Connecteurs initiaux alignés sur buildCards (connectorBefore des critères semés)
  const buildInitialConnectors = () => {
    if (lockedVars) return lockedVars.slice(1).map(() => defaultConn);
    if (defaultCriteria && defaultCriteria.length) {
      return defaultCriteria.slice(1).map((c) => c.connectorBefore || defaultConn);
    }
    return [];
  };

  // État : cartes + connecteurs (connectors[i] relie criteria[i] et criteria[i+1])
  const [criteria, setCriteria] = useState(buildCards);
  const [connectors, setConnectors] = useState(buildInitialConnectors);

  const atMax = maxCriteria != null && maxCriteria > 0 && criteria.length >= maxCriteria;

  // ── Réinitialisation au changement de configuration de figeage ──
  // Pattern « ajustement d'état pendant le rendu » (React docs : You Might Not Need an
  // Effect) plutôt qu'un setState dans un effet : on compare la signature de figeage à
  // sa valeur précédente, mémorisée en état. Reconstruire ici évite un commit superflu.
  const lockSig =
    `${lockedVars ? lockedVars.join(',') : ''}|${lockedOperations ? lockedOperations.join(',') : ''}`;
  const [prevLockSig, setPrevLockSig] = useState(lockSig);
  if (prevLockSig !== lockSig) {
    setPrevLockSig(lockSig);
    setCriteria(buildCards());
    setConnectors(buildInitialConnectors());
  }

  // ── Réduction du nombre de cartes si maxCriteria passe sous la longueur actuelle ──
  // Même pattern d'ajustement pendant le rendu, déclenché au changement de maxCriteria.
  const [prevMax, setPrevMax] = useState(maxCriteria);
  if (prevMax !== maxCriteria) {
    setPrevMax(maxCriteria);
    if (!lockedVars && maxCriteria != null && maxCriteria > 0 && criteria.length > maxCriteria) {
      setCriteria((prev) => prev.slice(0, maxCriteria));
      setConnectors((prev) => prev.slice(0, Math.max(0, maxCriteria - 1)));
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

  // ── Valeur structurée ──
  // Dérivation directe (pas de useMemo : le React Compiler mémoïse cette valeur et
  // garde une référence stable tant que les critères/connecteurs ne changent pas).
  // Le SQL n'est PAS calculé ici (cf. docstring) : seuls tree/serial sont exposés.
  const items = criteria.map((c, i) => ({
    variable: c.variable,
    operation: c.operation,
    value: c.value,
    sql_type: c.sql_type,
    is_categorical: c.is_categorical,
    bracketLeft: parentheses ? !!c.bracketLeft : false,
    bracketRight: parentheses ? !!c.bracketRight : false,
    connectorBefore: i === 0 ? null : connectors[i - 1] || defaultConn,
  }));
  const { tree, balanced } = buildTree(items);
  // `criteria` (liste plate) permet la persistance : réinjectable en defaultCriteria.
  const structure = { criteria: items, tree, balanced, serial: serialize(tree) };

  // Remontée de la valeur : effet dépendant de la valeur dérivée `structure`
  useEffect(() => {
    onChange?.(structure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structure]);

  // ── Rendu ──
  const showAddButton = !lockedVars && addMode === 'button' && !atMax;
  const rowClass =
    `mcm-row mcm-row--${orientation}${orientation === 'horizontal' && wrap ? ' mcm-row--wrap' : ''}`;

  return (
    <div className={`mcm-builder${className ? ` ${className}` : ''}`} style={style}>
      <div className={rowClass}>
        {criteria.map((c, i) => (
          <Fragment key={c.id}>
            {/* Connecteur logique entre deux cartes (l'espacement sans connecteur est
                porté par CSS sur les .mcm-slot adjacents, sans div de remplissage). */}
            {i > 0 && showConnectors && (
              <Connector
                orientation={orientation}
                isStatic={connectorIsStatic}
                value={connectors[i - 1] || defaultConn}
                options={connectorOptions}
                onChange={(v) => setConnector(i - 1, v)} />
            )}

            <div className="mcm-slot">
              <CriterionMenu
                criterion={c}
                onChange={(next) => updateCriterion(i, next)}
                onRemove={!lockedVars && criteria.length > 1 ? () => removeCriterion(i) : undefined}
                variables={variables}
                operationsByType={operationsByType}
                catalog={catalog}
                parentheses={parentheses}
                validate={validate}
                footer={footer}
                showLabels={showLabels}
                lockedVariable={!!lockedVars}
                lockedOperation={!!(lockedOperations && lockedOperations[i])}
                showOperation={showOperations}
                showSlider={showSlider} />
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
        <p className="mcm-max-note">Nombre maximum de critères atteint ({maxCriteria}).</p>
      )}
    </div>
  );
};

export default MultiCriterionMenu;
