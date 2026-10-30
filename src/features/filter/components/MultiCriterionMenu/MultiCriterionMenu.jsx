'use client';

// Importation des modules
import { Fragment, useEffect, useRef, useState } from 'react';
import Tooltip from '@/components/filter/Tooltip/Tooltip';
import { PlusIcon } from '@/components/icons';
import { DEFAULT_CONNECTORS, defaultValue, isComplete, resolveOperations } from '@/features/filter/utils/filterTypes';
import { buildTree, scopeWithout, serialize } from '@/features/filter/utils/filterEngine';
import { useDebouncedCallback } from '@/hooks/debounce/useDebouncedCallback';
import CriterionMenu from '@/features/filter/components/CriterionMenu/CriterionMenu';
import Connector from './Connector/Connector';
import './MultiCriterionMenu.scss';
import { mergeLabels } from '@/utils/i18n/mergeLabels';

// Défauts français, surchargeables par la prop `labels` (cf. src/utils/i18n/mergeLabels.js).
const DEFAULT_LABELS = {
  variable: 'Variable',
  variableHint: 'Variable — champ à filtrer',
  variablePlaceholder: 'Sélectionner une variable…',
  operation: 'Opération',
  operationHint: 'Opération — comparateur appliqué',
  operationPlaceholder: 'Opération…',
  value: 'Valeur',
  valueHint: 'Valeur — valeur(s) comparée(s)',
  valuesPlaceholder: 'Sélectionner des valeurs…',
  valuePlaceholder: 'Sélectionner une valeur…',
  addCriterion: 'Ajouter un critère',
  removeCriterion: 'Supprimer le critère',
  openBracket: 'Crochet ouvrant',
  closeBracket: 'Crochet fermant',
  and: 'ET',
  or: 'OU',
};

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
  typeFamily: null,
  isCategorical: false,
  bracketLeft: false,
  bracketRight: false,
});

/**
 * Combines several CriterionMenu cards linked by logical connectors, with optional
 * grouping brackets, and exposes a structured value (depth/group tree + serialisation).
 * The SQL clause is intentionally not computed here: the target is to pass only the JSON
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
 * @param {{value: string, label: string, typeFamily: string, isCategorical: boolean,
 *   filterOperations: string[]}[]} [variables=[]] - Variable metadata list.
 * @param {Object<string, string>} [operationLabels={}] - Operation labels keyed by
 *   `FilterOperation` enum value (see CriterionMenu).
 * @param {string} [catalog] - API catalog forwarded to the cards' value primitives.
 * @param {?Array<{variable: ?string, operation: ?string, value: *, typeFamily: ?string,
 *   isCategorical: ?boolean, bracketLeft: ?boolean, bracketRight: ?boolean,
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
 * @param {boolean} [dependentValues=true] - The values offered by each card depend on
 *   the other criteria: the card is replaced by TRUE in the whole expression, simplified
 *   with AND before OR (filterEngine.scopeWithout), and the result scopes the card
 *   (`A AND B`: A is bounded by B; `A OR B`: no restriction). Computed on the debounced
 *   criteria (those emitted by `onChange`). Categorical cards: the value menu only lists
 *   the values held by the rows of that scope (an empty scope shows an empty menu, not the
 *   global list); a value already selected is never dropped nor invalidated when another
 *   card excludes it — it stays selected, listed first. Numeric/date cards: the slider
 *   track spans the scope, the validation keeping the whole column (an empty scope falls
 *   back to the whole column). `false`: every card offers the values of the whole column.
 * @param {function({criteria: Array, tree: object, balanced: boolean, serial: object}): void} [onChange] -
 *   Receives the structured value whenever it changes; `criteria` is the flat list
 *   (reusable as `defaultCriteria` to rehydrate the builder).
 * @param {string} [className] - Additional class(es) merged on the root element.
 * @param {Object} [style] - Additional inline styles merged on the root element.
 * @param {string}   [intlLocale] - Full Intl tag, driving number and date formatting.
 * @param {string}   [dateMask] - Human-readable date mask shown as a placeholder.
 * @param {string}   [dateOrder] - Permutation of 'D', 'M' and 'Y' telling how to read
 *   a typed date. The mask is its display, this is its meaning.
 * @param {number}   [firstDayOfWeek] - 0 for Sunday, 1 for Monday.
 * @param {Object}   [labels] - Wording overrides, merged over the French defaults.
 * @returns {JSX.Element}
 */
const MultiCriterionMenu = ({
  orientation = 'horizontal',
  wrap = false,
  parentheses = true,
  connectorOptions = DEFAULT_CONNECTORS,
  showConnectors = true,
  variables = [],
  operationLabels = {},
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
  dependentValues = true,
  onChange,
  className = '',
  style,
  labels: labelOverrides,
  intlLocale,
  dateMask,
  dateOrder,
  firstDayOfWeek,
}) => {
  const labels = mergeLabels(DEFAULT_LABELS, labelOverrides);
  // Configuration de figeage (null si aucune variable figée)
  const lockedVars = lockedVariables && lockedVariables.length ? lockedVariables : null;
  // Connecteur par défaut : première option, sinon 'AND'
  const defaultConn = connectorOptions[0] ? connectorOptions[0].value : 'AND';
  // Connecteur figé en libellé statique : une seule option disponible
  const connectorIsStatic = connectorOptions.length <= 1;

  // Critère figé sur une variable (+ opération éventuellement imposée)
  const makeLocked = (variableId, lockedOp, id) => {
    const meta = variables.find((v) => v.value === variableId) ?? null;
    const t = meta?.typeFamily ?? null;
    const cat = meta?.isCategorical ?? false;
    const ops = resolveOperations(meta, operationLabels);
    const op = lockedOp || (ops[0] ? ops[0].value : null);
    return {
      id,
      variable: variableId,
      operation: op,
      value: defaultValue(t, cat, op),
      typeFamily: t,
      isCategorical: cat,
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
        typeFamily: c.typeFamily ?? null,
        isCategorical: !!c.isCategorical,
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

  // Prédicat pur unique : le nombre de cartes `n` atteint (ou dépasse) la limite. Utilisé
  // aux 3 points où l'on teste "encore de la place pour une carte de plus ?" (atMax,
  // auto-ajout, ajout manuel). Distinct de la réduction du tableau plus bas (`>` strict,
  // sémantique différente : "y a-t-il un EXCÉDENT à couper ?").
  const wouldExceedMax = (n) => maxCriteria != null && maxCriteria > 0 && n >= maxCriteria;

  const atMax = wouldExceedMax(criteria.length);

  // ── Infrastructure d'émission (event-driven, amortie) ──
  // stateRef = tampon qui découple la LECTURE de l'état de l'IDENTITÉ des handlers : ceux-ci
  // lisent stateRef (identité stable) au lieu de capturer criteria/connectors — qui changent
  // à chaque frappe (sinon TOUTES les cartes re-render). Synchronisé après chaque commit.
  const stateRef = useRef({ criteria, connectors });

  // Émission amortie vers le parent : call() = amorti (frappe de valeur), callNow() =
  // immédiat (action structurelle), flush() = vidage au blur. L'API a une identité stable
  // → les props qui la reçoivent (onCommit) ne se recréent pas à chaque rendu.
  //
  // L'émission alimente aussi `scopeItems` : les périmètres des cartes (`dependentValues`)
  // suivent les critères ÉMIS, pas chaque frappe — sinon chaque caractère tapé dans B
  // relancerait getFieldStats pour A. Tenu à jour même sans `dependentValues`, pour que
  // basculer la prop en cours de route parte des critères courants.
  const [scopeItems, setScopeItems] = useState([]);
  const emit = useDebouncedCallback((structure, items) => {
    setScopeItems(items);
    onChange?.(structure);
  }, 300);

  // Dérive la valeur structurée exposée. Le SQL n'est PAS calculé ici (cf. docstring) :
  // seuls tree/serial sont exposés. `criteria` (liste plate) permet la persistance.
  // `items` (mêmes critères + `id` de carte) sert au calcul des périmètres (scopeWithout) ;
  // l'`id` n'est pas exposé, la forme publique de `criteria` reste inchangée.
  const buildStructure = (crit, conns) => {
    const criteria = crit.map((c, i) => ({
      variable: c.variable,
      operation: c.operation,
      value: c.value,
      typeFamily: c.typeFamily,
      isCategorical: c.isCategorical,
      bracketLeft: parentheses ? !!c.bracketLeft : false,
      bracketRight: parentheses ? !!c.bracketRight : false,
      connectorBefore: i === 0 ? null : conns[i - 1] || defaultConn,
    }));
    const { tree, balanced } = buildTree(criteria);
    const items = criteria.map((c, i) => ({ id: crit[i].id, ...c }));
    return { structure: { criteria, tree, balanced, serial: serialize(tree) }, items };
  };

  // Point de passage unique : applique le nouvel état, met à jour stateRef (pour la
  // prochaine mutation), puis émet la structure recalculée (amortie = frappe de valeur,
  // immédiate = action structurelle). Ne capture que des références stables → identité stable.
  const commit = (nextCriteria, nextConnectors, debounce) => {
    setCriteria(nextCriteria);
    setConnectors(nextConnectors);
    stateRef.current = { criteria: nextCriteria, connectors: nextConnectors };
    const { structure, items } = buildStructure(nextCriteria, nextConnectors);
    if (debounce) emit.call(structure, items); else emit.callNow(structure, items);
  };

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
    // `>` strict et non `wouldExceedMax` (`>=`) : ici on ne coupe que l'EXCÉDENT réel,
    // pas dès que la longueur atteint la limite (sémantique de réduction, pas d'ajout).
    if (!lockedVars && maxCriteria != null && maxCriteria > 0 && criteria.length > maxCriteria) {
      setCriteria((prev) => prev.slice(0, maxCriteria));
      setConnectors((prev) => prev.slice(0, Math.max(0, maxCriteria - 1)));
    }
  }

  // ── Mutations (dans les handlers d'événements, jamais dans un effet) ──
  // Chaque handler lit l'état courant via stateRef (et non criteria/connectors capturés) :
  // son identité ne dépend que de valeurs stables (addMode, lockedVars, maxCriteria,
  // defaultConn, commit) → l'onChange passé à chaque CriterionMenu reste stable, donc
  // taper dans une carte ne re-render plus toutes les autres.

  // Mise à jour partielle d'un critère. En mode AUTO, compléter la DERNIÈRE carte ajoute
  // automatiquement une carte vierge — logique dérivée de prev, en une seule passe.
  const updateCriterion = (idx, next, meta) => {
    const { criteria: prev, connectors: prevConn } = stateRef.current;
    let list = prev.map((c, i) => (i === idx ? next : c));
    let conns = prevConn;
    const atMaxNow = wouldExceedMax(list.length);
    if (addMode === 'auto' && !lockedVars && idx === prev.length - 1 && isComplete(next) && !atMaxNow) {
      list = [...list, makeBlank(nextId(list))];
      conns = [...conns, defaultConn];
    }
    // frappe de valeur = amortie ; structurel (variable/opération) = immédiat.
    commit(list, conns, !!meta?.debounce);
  };

  // Ajout manuel d'une carte (mode bouton) — action structurelle, émission immédiate.
  const addCriterion = () => {
    const { criteria: prev, connectors: prevConn } = stateRef.current;
    if (wouldExceedMax(prev.length)) return;
    commit([...prev, makeBlank(nextId(prev))], [...prevConn, defaultConn], false);
  };

  // Suppression d'une carte (et du connecteur adjacent) — immédiate.
  const removeCriterion = (idx) => {
    const { criteria: prev, connectors: prevConn } = stateRef.current;
    if (prev.length <= 1) return;
    const nextConn = prevConn.slice();
    nextConn.splice(idx > 0 ? idx - 1 : 0, 1);
    commit(prev.filter((_, i) => i !== idx), nextConn, false);
  };

  // Mise à jour d'un connecteur — immédiate.
  const setConnector = (idx, val) => {
    const { criteria: prev, connectors: prevConn } = stateRef.current;
    commit(prev, prevConn.map((c, i) => (i === idx ? val : c)), false);
  };

  // ── Synchronisation de stateRef + émissions non-utilisateur ──
  // Synchronise stateRef après chaque commit (pas d'écriture de ref pendant le rendu).
  // Déclaré AVANT l'effet d'émission ci-dessous pour que stateRef y soit déjà à jour.
  useEffect(() => {
    stateRef.current = { criteria, connectors };
  });

  // Signature de CONFIGURATION : change dès qu'une prop non-utilisateur modifie la sortie
  // de l'émission. Sert de dépendance UNIQUE à l'effet d'émission ci-dessous.
  //
  // RÈGLE (à respecter pour tout ajout futur) : toute prop lue par `buildStructure()` —
  // directement ou via une valeur dérivée d'elle — DOIT figurer ici. Sans quoi son
  // changement réécrit silencieusement la structure sans jamais l'émettre, et le parent
  // conserve un tree/serial périmé alors que l'UI, elle, a déjà changé.
  // Aujourd'hui : `parentheses` (force les crochets à false) et `defaultConn` (issu de
  // `connectorOptions`, comble les connecteurs manquants). S'y ajoutent les deux
  // déclencheurs de RESET d'état — lockSig (figeage) et maxCriteria (troncature) — dont
  // la structure reconstruite doit elle aussi remonter. Les préfixes (`max:`, `par:`…)
  // évitent qu'une combinaison de valeurs différente produise la même concaténation.
  const configSig = `${lockSig}|max:${maxCriteria}|par:${parentheses}|conn:${defaultConn}`;

  // Émissions NON-utilisateur : montage (valeur initiale), resets de configuration
  // (figeage / maxCriteria) et changements de props qui réécrivent la structure sans
  // action utilisateur (parentheses / connectorOptions). `configSig` NE change PAS à la
  // frappe → aucune émission par caractère ici ; les frappes passent par les handlers
  // (event-driven). `emit` et `buildStructure` sont volontairement hors deps : c'est tout
  // le principe — on n'émet que sur un changement de configuration, jamais sur l'état.
  useEffect(() => {
    const { criteria: crit, connectors: conns } = stateRef.current;
    const { structure, items } = buildStructure(crit, conns);
    emit.callNow(structure, items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configSig]);

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
                labels={labelOverrides}
                intlLocale={intlLocale}
                dateMask={dateMask}
                dateOrder={dateOrder}
                firstDayOfWeek={firstDayOfWeek}
                criterion={c}
                onChange={(next, meta) => updateCriterion(i, next, meta)}
                onCommit={emit.flush}
                onRemove={!lockedVars && criteria.length > 1 ? () => removeCriterion(i) : undefined}
                variables={variables}
                operationLabels={operationLabels}
                catalog={catalog}
                // Périmètre de la carte = filtre imposé par les autres critères (émis)
                valuesScope={dependentValues ? scopeWithout(scopeItems, c.id, { dateOrder }) : undefined}
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
              <Tooltip content={labels.addCriterion} position="top">
                <button
                  type="button"
                  className={`mcm-add mcm-add--${orientation}`}
                  onClick={addCriterion}
                  aria-label={labels.addCriterion}>
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
