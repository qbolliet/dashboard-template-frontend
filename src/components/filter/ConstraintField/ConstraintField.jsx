'use client';

import { useEffect, useId, useRef, useState } from 'react';
import TypeAwareInput from '../TypeAwareInput/TypeAwareInput';
import { DATE_RANGE_SEP, formatDate, parseDate } from '../utils/dateParse';
import { useRangeBounds } from './useRangeBounds';
import './ConstraintField.scss';

/**
 * Typed constraint field: composes one or two {@link TypeAwareInput} controls and
 * owns the VALUE validation (bounds, `low ≤ high`, membership in `[min, max]`) on top
 * of the per-input TYPE validation. An optional slider bar mirrors the values on a
 * numeric axis (timestamps for dates).
 *
 * Responsibility split: each `TypeAwareInput` validates the TYPE of its own value;
 * `ConstraintField` re-projects valid values onto a numeric axis to validate the VALUE
 * and drive the slider. Value verdicts are pushed back to the inputs via their
 * `forcedState`/`forcedMessage` props (border tint + message).
 *
 * Layout per (valueType × rangeMode):
 * - numeric single → 1 input + 1 thumb; numeric range → 2 inputs (low/high) + 2 thumbs.
 * - date single → 1 input (single calendar); date range → 1 input (range calendar).
 *   The slider bar is added for dates only when bounds are known.
 *
 * @param {"integer"|"float"|"date"} [valueType] - Value type fed to TypeAwareInput.
 * @param {boolean}  [rangeMode]   - false = single value, true = low/high range.
 * @param {number|string} [min]    - Lower bound (number, or DD/MM/YYYY for dates).
 *   Takes precedence over the API-loaded bound.
 * @param {number|string} [max]    - Upper bound (same format as `min`).
 * @param {number}   [step]        - Slider step (ms for dates).
 * @param {string}   [fieldName]   - API field name for {@link useRangeBounds}.
 * @param {string}   [catalog]     - API catalog for {@link useRangeBounds}.
 * @param {boolean}  [validate]    - Enable type + value validation feedback.
 * @param {string|number} [valueLow]  - Initial low value (or single value).
 * @param {string|number} [valueHigh] - Initial high value (numeric range only).
 * @param {Function} onChange      - ({ value } | { min, max }) => void, string payloads.
 * @param {Function} [onValidityChange] - (valid: boolean) => void. VALUE verdict emitted
 *   alongside each onChange (filled AND consistent: type ok, low ≤ high, within bounds).
 * @param {boolean}  [disabled]
 * @param {boolean}  [showSlider]  - Render the slider bar when the type/bounds allow it.
 * @param {boolean}  [inputsOnTop] - Render the inputs above the track (instead of below).
 * @param {string}   [className]   - Additional class(es) merged on the root element.
 * @param {Object}   [style]       - Additional inline styles merged on the root element.
 * @returns {JSX.Element}
 */
const ConstraintField = ({
  valueType = 'float',
  rangeMode = false,
  min,
  max,
  step,
  fieldName,
  catalog,
  validate = false,
  valueLow,
  valueHigh,
  onChange,
  onValidityChange,
  disabled = false,
  showSlider = true,
  inputsOnTop = false,
  className = '',
  style,
}) => {
  const isDate = valueType === 'date';
  // En plage de dates, UN seul TypeAwareInput (calendrier double) porte « A → B »
  const isDateRange = isDate && rangeMode;
  // Deux champs distincts uniquement pour les plages numériques
  const dualInputs = rangeMode && !isDate;

  // ── Bornes : API (hook) court-circuitée par les props explicites ────────
  const api = useRangeBounds({ fieldName, catalog });

  // Convertit une borne (nombre, ou date JJ/MM/AAAA) en nombre de l'axe slider
  const boundToNum = (b) => {
    if (b == null || b === '') return NaN;
    if (typeof b === 'number') return b;
    if (isDate) { const d = parseDate(b); return d ? d.getTime() : NaN; }
    return Number(b);
  };
  // Résolution : prop explicite > valeur API > repli
  const resolve = (explicit, apiVal, fallback) => {
    const e = boundToNum(explicit);
    if (Number.isFinite(e)) return e;
    const a = boundToNum(apiVal);
    if (Number.isFinite(a)) return a;
    return fallback;
  };
  const minN = resolve(min, api.min, isDate ? NaN : 0);
  const maxN = resolve(max, api.max, isDate ? NaN : 100);
  const stepN = (() => {
    const e = Number(step);
    if (Number.isFinite(e) && e > 0) return e;
    const a = Number(api.step);
    if (Number.isFinite(a) && a > 0) return a;
    return isDate ? 86_400_000 : 1; // 1 jour en ms pour les dates
  })();

  // Bornes exploitables (axe valide) ⇒ la barre slider peut être rendue
  const boundsKnown = Number.isFinite(minN) && Number.isFinite(maxN) && maxN > minN;
  const renderTrack = showSlider && boundsKnown;

  // ── État contrôlé (chaînes fournies aux TypeAwareInput) ─────────────────
  // `low` = valeur unique / borne basse / « A → B » (plage de dates).
  // `high` = borne haute (plage numérique uniquement).
  const seedLow = () => {
    if (isDateRange && valueLow && valueHigh) return `${valueLow}${DATE_RANGE_SEP}${valueHigh}`;
    return valueLow != null ? String(valueLow) : '';
  };
  const [low, setLow] = useState(seedLow);
  const [high, setHigh] = useState(valueHigh != null ? String(valueHigh) : '');

  // Thumb en cours de drag ('low' | 'high' | null)
  const [dragging, setDragging] = useState(null);
  const railRef = useRef(null);

  // Identifiants stables pour lier <label htmlFor> ↔ inputs
  const uid = useId();
  const lowId = `${uid}-low`;
  const highId = `${uid}-high`;

  // ── Adaptateurs type ⇄ nombre (axe du slider) ───────────────────────────
  const toNumber = (str) => {
    if (str == null || str === '') return NaN;
    if (isDate) { const d = parseDate(str.trim()); return d ? d.getTime() : NaN; }
    return parseFloat(str);
  };
  const fromNumber = (n) => {
    if (isDate) return formatDate(new Date(n));
    if (valueType === 'integer') return String(Math.round(n));
    // float : on neutralise les artefacts binaires (0.300000004) sans sur-arrondir
    return String(parseFloat(n.toFixed(6)));
  };

  // ── Validité de TYPE (miroir de TypeAwareInput, pour décider la val. de valeur) ──
  const typeValidNumber = (str) => {
    if (str == null || str.trim?.() === '') return false;
    if (valueType === 'integer') return Number.isInteger(Number(str));
    return !Number.isNaN(parseFloat(str));
  };
  const dateRangeParts = (str) => {
    const [a, b] = (str || '').split(DATE_RANGE_SEP);
    const da = a ? parseDate(a.trim()) : null;
    const db = b ? parseDate(b.trim()) : null;
    return da && db ? [da.getTime(), db.getTime()] : null;
  };

  // ── Couple numérique courant (positions des thumbs) ─────────────────────
  const currentPair = () => {
    if (isDateRange) {
      const parts = dateRangeParts(low);
      return parts ? { lowN: parts[0], highN: parts[1] } : { lowN: NaN, highN: NaN };
    }
    return { lowN: toNumber(low), highN: rangeMode ? toNumber(high) : undefined };
  };

  // ── Utilitaires axe ─────────────────────────────────────────────────────
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pct = (v) => clamp(((v - minN) / (maxN - minN)) * 100, 0, 100);
  const snap = (raw) => clamp(Math.round(raw / stepN) * stepN, minN, maxN);

  // ── Verdict de VALEUR (booléen) émis au parent avec chaque onChange ─────
  // Miroir booléen de lowForced()/highForced() : rempli ET cohérent (type ok,
  // low ≤ high, dans les bornes si connues). Calculé sur les valeurs ÉMISES
  // (l'état low/high étant asynchrone) → remontée événementielle, sans effet
  const validFor = (lowStr, highStr) => {
    if (isDateRange) {
      const parts = dateRangeParts(lowStr);
      if (!parts) return false;
      const [a, b] = parts;
      if (a > b) return false;
      if (boundsKnown && (a < minN || b > maxN)) return false;
      return true;
    }
    if (dualInputs) {
      if (!typeValidNumber(lowStr) || !typeValidNumber(highStr)) return false;
      const lo = toNumber(lowStr);
      const hi = toNumber(highStr);
      if (lo > hi) return false;
      if (boundsKnown && (lo < minN || lo > maxN || hi < minN || hi > maxN)) return false;
      return true;
    }
    // Valeur unique (numérique ou date simple)
    const typeOk = isDate ? !!parseDate((lowStr ?? '').trim()) : typeValidNumber(lowStr);
    if (!typeOk) return false;
    const n = toNumber(lowStr);
    if (boundsKnown && (n < minN || n > maxN)) return false;
    return true;
  };

  // ── Émission vers le parent (chaînes) ───────────────────────────────────
  const emitSingle = (str) => { onChange?.({ value: str }); onValidityChange?.(validFor(str, high)); };
  const emitNumericRange = (lo, hi) => { onChange?.({ min: lo, max: hi }); onValidityChange?.(validFor(lo, hi)); };

  // ── Écriture d'un couple depuis le slider ───────────────────────────────
  const writePair = (aN, bN) => {
    if (isDateRange) {
      const s = `${fromNumber(aN)}${DATE_RANGE_SEP}${fromNumber(bN)}`;
      setLow(s);
      emitSingle(s);
    } else {
      const aStr = fromNumber(aN);
      const bStr = fromNumber(bN);
      setLow(aStr);
      setHigh(bStr);
      emitNumericRange(aStr, bStr);
    }
  };

  // Applique une valeur d'axe `v` au thumb `which` ('low' | 'high')
  const applyThumb = (which, v) => {
    if (!rangeMode) {
      const nv = snap(v);
      const str = fromNumber(nv);
      setLow(str);
      emitSingle(str);
      return;
    }
    const { lowN, highN } = currentPair();
    if (which === 'low') {
      const nv = snap(Number.isFinite(highN) ? Math.min(v, highN) : v);
      writePair(nv, Number.isFinite(highN) ? highN : nv);
    } else {
      const nv = snap(Number.isFinite(lowN) ? Math.max(v, lowN) : v);
      writePair(Number.isFinite(lowN) ? lowN : nv, nv);
    }
  };

  // ── Opération clavier d'un thumb (flèches / Home / End / PageUp-Down) ───
  // Lit la valeur courante du thumb, calcule la cible et délègue à `applyThumb`
  // (qui snappe, clampe low≤high et émet vers le parent).
  const handleThumbKey = (which, e) => {
    if (disabled) return;
    const { lowN, highN } = currentPair();
    const curr = which === 'low' ? lowN : highN;
    const base = Number.isFinite(curr) ? curr : (which === 'low' ? minN : maxN);
    const big = stepN * 10; // pas large pour PageUp/PageDown

    let next;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowUp': next = base + stepN; break;
      case 'ArrowLeft': case 'ArrowDown': next = base - stepN; break;
      case 'PageUp': next = base + big; break;
      case 'PageDown': next = base - big; break;
      case 'Home': next = minN; break;
      case 'End': next = maxN; break;
      default: return;
    }
    e.preventDefault();
    applyThumb(which, next);
  };

  // ── Click sur le rail — déplace le thumb le plus proche ─────────────────
  const handleRailPointer = (e) => {
    if (disabled || !railRef.current) return;
    e.preventDefault();
    const rect = railRef.current.getBoundingClientRect();
    const p = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = snap(minN + (p / 100) * (maxN - minN));

    if (!rangeMode) { applyThumb('low', v); return; }
    const { lowN, highN } = currentPair();
    const dLow = Math.abs(v - lowN);
    const dHigh = Math.abs(v - highN);
    applyThumb(dLow <= dHigh ? 'low' : 'high', v);
  };

  // ── Drag via Pointer Events sur window ──────────────────────────────────
  // (cf. ancienne implémentation : on évite d'ajouter `snap`/`applyThumb` aux deps,
  //  qui changent à chaque render — la logique est ré-inlinée ici.)
  useEffect(() => {
    if (!dragging || disabled) return undefined;
    const move = (e) => {
      if (!railRef.current) return;
      const rect = railRef.current.getBoundingClientRect();
      const p = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
      const v = snap(minN + (p / 100) * (maxN - minN));
      applyThumb(dragging, v);
    };
    const up = () => setDragging(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, low, high, rangeMode, minN, maxN, stepN, disabled, onChange]);

  // ── Handlers de saisie clavier (via TypeAwareInput) ─────────────────────
  const handleLowChange = (v) => {
    if (disabled) return;
    setLow(v);
    if (dualInputs) emitNumericRange(v, high);
    else emitSingle(v);
  };
  const handleHighChange = (v) => {
    if (disabled) return;
    setHigh(v);
    emitNumericRange(low, v);
  };

  // ── Validation de VALEUR → verdict transmis aux inputs (forcedState) ────
  // Étiquette lisible des bornes pour les messages d'erreur.
  const boundLabel = isDate
    ? `${formatDate(new Date(minN))} – ${formatDate(new Date(maxN))}`
    : `${minN} – ${maxN}`;

  // Verdict du champ « low » (valeur unique, borne basse, ou plage de dates combinée).
  const lowForced = () => {
    if (!validate) return {};
    if (isDateRange) {
      const parts = dateRangeParts(low);
      if (!parts) return {}; // type invalide → TypeAwareInput affiche son erreur
      const [a, b] = parts;
      if (a > b) return { forcedState: 'error', forcedMessage: 'Début après la fin' };
      if (boundsKnown && (a < minN || b > maxN)) return { forcedState: 'error', forcedMessage: `Hors de ${boundLabel}` };
      return { forcedState: 'success', forcedMessage: '' };
    }
    if (isDate ? !parseDate((low ?? '').trim()) : !typeValidNumber(low)) return {};
    const n = toNumber(low);
    if (boundsKnown && (n < minN || n > maxN)) return { forcedState: 'error', forcedMessage: `Hors de ${boundLabel}` };
    if (dualInputs && typeValidNumber(high) && n > toNumber(high)) {
      return { forcedState: 'error', forcedMessage: 'Doit être ≤ max' };
    }
    return { forcedState: 'success', forcedMessage: '' };
  };

  // Verdict du champ « high » (plage numérique uniquement).
  const highForced = () => {
    if (!validate || !dualInputs) return {};
    if (!typeValidNumber(high)) return {};
    const n = toNumber(high);
    if (boundsKnown && (n < minN || n > maxN)) return { forcedState: 'error', forcedMessage: `Hors de ${boundLabel}` };
    if (typeValidNumber(low) && n < toNumber(low)) return { forcedState: 'error', forcedMessage: 'Doit être ≥ min' };
    return { forcedState: 'success', forcedMessage: '' };
  };

  // ── Positions du fill et des thumbs ─────────────────────────────────────
  const { lowN, highN } = currentPair();
  const fillLeft = rangeMode ? (Number.isFinite(lowN) ? pct(lowN) : 0) : 0;
  const fillRight = rangeMode
    ? (Number.isFinite(highN) ? pct(highN) : 0)
    : (Number.isFinite(lowN) ? pct(lowN) : 0);
  const fillWidth = Math.max(0, fillRight - fillLeft);

  // Libellés des champs selon le mode
  const lowLabel = isDateRange ? 'Plage' : rangeMode ? 'Min' : isDate ? 'Date' : 'Valeur';

  return (
    <div
      className={`constraint-field${disabled ? ' constraint-field--disabled' : ''}${inputsOnTop ? ' constraint-field--inputs-top' : ''}${className ? ` ${className}` : ''}`}
      style={style}>
      {renderTrack && (
        <div
          className="constraint-field__track"
          ref={railRef}
          onPointerDown={handleRailPointer}>
          <div className="constraint-field__rail" />
          <div
            className="constraint-field__fill"
            style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }} />
          <div
            className={`constraint-field__thumb constraint-field__thumb--low${dragging === 'low' ? ' constraint-field__thumb--dragging' : ''}`}
            style={{ left: `${Number.isFinite(lowN) ? pct(lowN) : 0}%` }}
            role="slider"
            tabIndex={disabled ? -1 : 0}
            aria-valuemin={minN}
            aria-valuemax={rangeMode && Number.isFinite(highN) ? highN : maxN}
            aria-valuenow={Number.isFinite(lowN) ? lowN : minN}
            aria-valuetext={fromNumber(Number.isFinite(lowN) ? lowN : minN)}
            aria-label={rangeMode ? 'Valeur minimale' : 'Valeur'}
            onKeyDown={(e) => handleThumbKey('low', e)}
            onPointerDown={(e) => { e.stopPropagation(); setDragging('low'); }} />
          {rangeMode && (
            <div
              className={`constraint-field__thumb constraint-field__thumb--high${dragging === 'high' ? ' constraint-field__thumb--dragging' : ''}`}
              style={{ left: `${Number.isFinite(highN) ? pct(highN) : 100}%` }}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-valuemin={Number.isFinite(lowN) ? lowN : minN}
              aria-valuemax={maxN}
              aria-valuenow={Number.isFinite(highN) ? highN : maxN}
              aria-valuetext={fromNumber(Number.isFinite(highN) ? highN : maxN)}
              aria-label="Valeur maximale"
              onKeyDown={(e) => handleThumbKey('high', e)}
              onPointerDown={(e) => { e.stopPropagation(); setDragging('high'); }} />
          )}
        </div>
      )}

      <fieldset className="constraint-field__inputs">
        <legend className="constraint-field__legend">{rangeMode ? 'Bornes' : 'Valeur'}</legend>
        <div className="constraint-field__input-group">
          <label className="constraint-field__input-label" htmlFor={lowId}>{lowLabel}</label>
          <TypeAwareInput
            id={lowId}
            inputType={valueType}
            dateMode={isDateRange ? 'range' : 'single'}
            value={low}
            validate={validate}
            disabled={disabled}
            onChange={handleLowChange}
            {...lowForced()} />
        </div>

        {dualInputs && (
          <>
            <span className="constraint-field__sep">—</span>
            <div className="constraint-field__input-group">
              <label className="constraint-field__input-label" htmlFor={highId}>Max</label>
              <TypeAwareInput
                id={highId}
                inputType={valueType}
                value={high}
                validate={validate}
                disabled={disabled}
                onChange={handleHighChange}
                {...highForced()} />
            </div>
          </>
        )}
      </fieldset>
    </div>
  );
};

export default ConstraintField;
