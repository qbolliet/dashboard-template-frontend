// =================================================================
// useFeatureState — état des options de la barre d'outils configurable
// =================================================================
// `tools` = descripteurs compatibles avec le type de graphique détecté. `featOn`
// (activé) et `featVal` (valeur pilotée, ex. position d'une barre) sont réconciliés
// quand la prop `toolbar` change — SANS boucle de rendu (l'ajustement se fait
// PENDANT le rendu)
//  Priorité `defaults[id]` > `feature.defaultOn`.

// Importation des modules
import { useState } from 'react';

/**
 * Toolbar feature state: filtered tools, per-feature on/off and value maps.
 *
 * @param {object} params
 * @param {Array<object>} params.toolbar - Feature descriptors passed to <Chart>.
 * @param {string} params.chartKind - Detected chart kind (filters via `supports`).
 * @param {object} params.defaults - Initial ON state per feature id (> feature.defaultOn).
 * @returns {{
 *   tools: Array<object>, activeTools: Array<object>,
 *   featOn: Object<string, boolean>, featVal: Object<string, *>,
 *   toggleFeature: function(string): void, setFeatureValue: function(string, *): void,
 * }}
 */
export function useFeatureState({ toolbar, chartKind, defaults }) {
  const list = toolbar || [];
  // Seules les options dont supports(chartKind) est vrai restent dans la barre.
  const tools = list.filter((t) => t.supports(chartKind));

  const [featOn, setFeatOn] = useState(() => {
    const o = {};
    list.forEach((t) => { o[t.id] = defaults[t.id] != null ? !!defaults[t.id] : !!t.defaultOn; });
    return o;
  });
  const [featVal, setFeatVal] = useState(() => {
    const o = {};
    list.forEach((t) => { if (t.initialValue !== undefined) o[t.id] = t.initialValue; });
    return o;
  });

  // Réconciliation PENDANT le rendu : ajoute les clés des outils nouvellement
  // présents (id ajoutés par le parent). N'écrit que si une clé manque → pas de
  // boucle. On ne mute JAMAIS l'objet d'état : on renvoie soit null (rien à
  // ajouter), soit un CLONE frais (mutable en toute sécurité).
  const withMissing = (current, shouldAdd, makeVal) => {
    let next = null;
    for (const t of list) {
      if (!(t.id in current) && shouldAdd(t)) (next ||= { ...current })[t.id] = makeVal(t);
    }
    return next;
  };
  const addedOn = withMissing(featOn, () => true, (t) => (defaults[t.id] != null ? !!defaults[t.id] : !!t.defaultOn));
  // featVal : seuls les outils déclarant une valeur initiale reçoivent une clé.
  const addedVal = withMissing(featVal, (t) => t.initialValue !== undefined, (t) => t.initialValue);
  const nextOn = addedOn || featOn;
  const nextVal = addedVal || featVal;
  if (addedOn) setFeatOn(nextOn);
  if (addedVal) setFeatVal(nextVal);

  const activeTools = tools.filter((t) => nextOn[t.id]);
  const toggleFeature = (id) => setFeatOn((o) => ({ ...o, [id]: !o[id] }));
  const setFeatureValue = (id, v) => setFeatVal((o) => ({ ...o, [id]: v }));

  return { tools, activeTools, featOn: nextOn, featVal: nextVal, toggleFeature, setFeatureValue };
}
