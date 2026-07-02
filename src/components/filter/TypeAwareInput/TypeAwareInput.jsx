'use client';

// Importation des modules
import { useEffect, useId, useRef, useState } from 'react';
import VisuallyHidden from '@/features/accessibility/components/VisuallyHidden/VisuallyHidden';
import useFocusTrap from '@/features/accessibility/hooks/useFocusTrap';
import { ariaAnnouncer } from '@/features/accessibility/services/AriaAnnouncer';
import { CalendarIcon, CheckIcon, InfoIcon } from '@/components/icons';
import CalendarMonth from '../CalendarMonth/CalendarMonth';
import { DATE_SINGLE_RE, DATE_RANGE_RE, formatDate, parseDate } from '../utils/dateParse';
import './TypeAwareInput.scss';

// ── Configurations de saisie par type ────────────────────────────
// Pilote le placeholder, l'inputMode (clavier mobile) et le type/step HTML.
const TYPE_CONFIG = {
  text: { placeholder: 'Texte libre…', inputMode: 'text', html: 'text', step: undefined },
  integer: { placeholder: '0', inputMode: 'numeric', html: 'number', step: '1' },
  float: { placeholder: '0.00', inputMode: 'decimal', html: 'number', step: 'any' },
  date: { placeholder: 'JJ/MM/AAAA', inputMode: 'text', html: 'text', step: undefined },
};

// Suffixe affiché après le choix de la première borne d'une plage
const RANGE_PENDING = ' → …';

/**
 * Type-adaptive input: text, integer, float or date (single/range).
 *
 * Controlled component — the displayed value is owned by the parent via `value`
 * and `onChange`. For dates, an inline calendar popover supplements manual entry;
 * range mode builds a `"A → B"` string across two synchronised months. Real-time
 * validation (optional) reflects success/error inline.
 *
 * Validation scope: this component validates the TYPE of a single value only.
 * A parent that owns a higher-level VALUE verdict (bounds, ordering…) can override
 * the displayed state via `forcedState`/`forcedMessage`; the override wins over the
 * internal type verdict (the parent is expected to set it only once the type is valid).
 *
 * @param {"text"|"integer"|"float"|"date"} [inputType] - Expected value type.
 * @param {"single"|"range"} [dateMode] - Date selection mode (date type only).
 * @param {boolean}  [validate] - Enable real-time validation feedback.
 * @param {number}   [precision] - Decimal places used to normalise floats on blur.
 * @param {string}   value      - Controlled value.
 * @param {Function} onChange   - (value: string) => void.
 * @param {boolean}  [disabled]
 * @param {string}   [id]       - Input id, for an external <label htmlFor>.
 * @param {"success"|"error"} [forcedState] - External VALUE verdict overriding the
 *   internal type state for the border/message display.
 * @param {string}   [forcedMessage] - Message shown alongside `forcedState`.
 * @param {string}   [className] - Additional class(es) merged on the root wrapper.
 * @param {Object}   [style]     - Additional inline styles merged on the root wrapper.
 * @returns {JSX.Element}
 */
const TypeAwareInput = ({
  inputType = 'text',
  dateMode = 'single',
  validate = false,
  precision = 2,
  value = '',
  onChange,
  disabled = false,
  id,
  forcedState,
  forcedMessage,
  className = '',
  style,
}) => {
  // Extraction de la configuration associé au type demandé
  const cfg = TYPE_CONFIG[inputType] || TYPE_CONFIG.text;
  // Extraction du type de l'entrée
  const isDate = inputType === 'date';
  const isNumber = inputType === 'integer' || inputType === 'float';

  // État de validation (default | success | error) + message associé
  const [state, setState] = useState('default');
  const [message, setMessage] = useState('');

  // État du popover calendrier
  const [calOpen, setCalOpen] = useState(false);

  // Mois affichés : le second (mode plage) suit toujours le premier (+1 mois)
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear2, setCalYear2] = useState(now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear());
  const [calMonth2, setCalMonth2] = useState(now.getMonth() === 11 ? 0 : now.getMonth() + 1);

  // Bornes de la plage en cours de construction (mode range)
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  const wrapRef = useRef(null);

  // Identifiant stable du popover (lié au bouton via aria-controls)
  const popoverId = useId();
  // Piège + retour de focus : le focus entre dans le calendrier à l'ouverture et
  // revient au bouton déclencheur à la fermeture.
  const popoverRef = useFocusTrap({ active: calOpen, returnFocus: true, autoFocus: true });

  // ── Validation ──────────────────────────────────────────────────
  // Met à jour state/message à partir d'une valeur. Vide ⇒ état neutre.
  const validateValue = (val) => {
    if (!validate || !val) { setState('default'); setMessage(''); return; }

    if (inputType === 'integer') {
      const n = Number(val);
      if (!Number.isInteger(n)) { setState('error'); setMessage('Entier requis'); }
      else { setState('success'); setMessage('Valide'); }
    } else if (inputType === 'float') {
      const n = parseFloat(val);
      if (Number.isNaN(n)) { setState('error'); setMessage('Nombre décimal requis'); }
      else { setState('success'); setMessage('Valide'); }
    } else if (inputType === 'date') {
      if (val.includes(' → ')) {
        const [a, b] = val.split(' → ');
        if (parseDate(a) && parseDate(b)) { setState('success'); setMessage('Plage valide'); }
        else { setState('error'); setMessage('Format JJ/MM/AAAA'); }
      } else if (parseDate(val)) {
        setState('success'); setMessage('Date valide');
      } else {
        setState('error'); setMessage('Format JJ/MM/AAAA');
      }
    } else {
      // text : non vide ⇒ succès
      setState('success'); setMessage('');
    }
  };

  // ── Saisie clavier ──────────────────────────────────────────────
  const handleChange = (e) => {
    if (disabled) return;
    const v = e.target.value;
    onChange?.(v);

    if (isDate) {
      // Dates : on ne valide qu'une saisie complète ; sinon état neutre (suite au blur)
      if (!v || v.endsWith(RANGE_PENDING)) { setState('default'); setMessage(''); }
      else if (DATE_SINGLE_RE.test(v) || DATE_RANGE_RE.test(v)) validateValue(v);
      else { setState('default'); setMessage(''); }
    } else {
      validateValue(v);
    }
  };

  // Au blur : normalisation de l'affichage (nombres) et signalement d'un format
  // de date resté incomplet. Repris de l'ancienne implémentation (formatValue) :
  // l'entier est arrondi, le flottant fixé à `precision` décimales.
  const handleBlur = () => {
    if (disabled) return;

    // Nombres : on recale la valeur affichée à la sortie du champ (si numérique)
    if (isNumber && value !== '') {
      const n = Number(value);
      if (!Number.isNaN(n)) {
        const normalized = inputType === 'integer' ? String(Math.round(n)) : n.toFixed(precision);
        if (normalized !== value) {
          onChange?.(normalized);
          validateValue(normalized);
        }
      }
      return;
    }

    // Dates : on signale un format incomplet/erroné resté en l'état
    if (isDate && validate && value) {
      if (DATE_SINGLE_RE.test(value) || DATE_RANGE_RE.test(value)) validateValue(value);
      else if (!value.endsWith(RANGE_PENDING)) { setState('error'); setMessage('Format JJ/MM/AAAA'); }
    }
  };

  // ── Sélection au calendrier ─────────────────────────────────────
  const handleCalSelect = (date) => {
    if (disabled) return;

    if (dateMode === 'single') {
      const str = formatDate(date);
      onChange?.(str);
      if (validate) { setState('success'); setMessage('Date valide'); }
      setCalOpen(false);
      return;
    }

    // Mode plage : premier clic pose la borne de départ, second clic la ferme
    if (!rangeStart || rangeEnd) {
      setRangeStart(date);
      setRangeEnd(null);
      setHoverDate(null);
      onChange?.(formatDate(date) + RANGE_PENDING);
    } else {
      // Inversion automatique si le second clic précède le premier
      const lo = date < rangeStart ? date : rangeStart;
      const hi = date < rangeStart ? rangeStart : date;
      setRangeStart(lo);
      setRangeEnd(hi);
      setHoverDate(null);
      onChange?.(`${formatDate(lo)} → ${formatDate(hi)}`);
      if (validate) { setState('success'); setMessage('Plage valide'); }
      setCalOpen(false);
    }
  };

  // ── Synchronisation des deux mois (mode plage) ──────────────────
  // Changer le mois/année de gauche recale automatiquement le mois de droite à +1.
  const handleMonth1 = (m) => {
    setCalMonth(m);
    if (dateMode === 'range') {
      setCalMonth2(m === 11 ? 0 : m + 1);
      setCalYear2(m === 11 ? calYear + 1 : calYear);
    }
  };
  const handleYear1 = (y) => {
    setCalYear(y);
    if (dateMode === 'range') {
      setCalMonth2(calMonth === 11 ? 0 : calMonth + 1);
      setCalYear2(calMonth === 11 ? y + 1 : y);
    }
  };

  // ── Fermeture au click extérieur ────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setCalOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Date sélectionnée transmise au calendrier (single) — dérivée de la valeur saisie
  const selectedDate = dateMode === 'single' && value && DATE_SINGLE_RE.test(value)
    ? parseDate(value)
    : null;

  // État effectif affiché : un verdict de VALEUR externe (forcedState) prime sur
  // l'état de TYPE interne. Sinon, l'état interne n'est montré que si validate est actif.
  const effectiveState = forcedState ?? (validate ? state : 'default');
  const effectiveMessage = forcedState ? (forcedMessage ?? '') : (validate ? message : '');

  // ── Annonce des verdicts aux lecteurs d'écran ───────────────────
  // L'affichage inline reste inchangé ; on double le message d'une annonce live
  // (assertive pour une erreur, polite pour un succès). Singleton importé ⇒ pas
  // de dépendance instable dans l'effet.
  useEffect(() => {
    if (!effectiveMessage) return;
    ariaAnnouncer.announce(effectiveMessage, effectiveState === 'error' ? 'assertive' : 'polite');
  }, [effectiveState, effectiveMessage]);

  // Classe d'état appliquée au cadre du champ (uniquement hors état neutre)
  const stateClass = effectiveState !== 'default' ? `type-input--${effectiveState}` : '';

  return (
    <div className={`type-input-wrap${className ? ` ${className}` : ''}`} style={style} ref={wrapRef}>
      <span className={`type-input ${stateClass} ${disabled ? 'type-input--disabled' : ''}`}>
        <input
          id={id}
          className="type-input__field"
          type={isNumber ? 'number' : 'text'}
          inputMode={cfg.inputMode}
          step={cfg.step}
          placeholder={cfg.placeholder}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        {isDate && (
          <button
            type="button"
            className="type-input__cal-btn"
            onClick={() => setCalOpen((o) => !o)}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={calOpen}
            aria-controls={popoverId}>
            <CalendarIcon />
            <VisuallyHidden>Ouvrir le calendrier</VisuallyHidden>
          </button>
        )}
      </span>

      {effectiveMessage && (
        <span className={`type-input__message type-input__message--${effectiveState}`}>
          {effectiveState === 'success' ? <CheckIcon strokeWidth={2.5} /> : <InfoIcon />}
          {effectiveMessage}
        </span>
      )}

      {isDate && calOpen && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label="Calendrier"
          className={`calendar-popover ${dateMode === 'range' ? 'calendar-popover--range' : ''}`}
          onKeyDown={(e) => { if (e.key === 'Escape') setCalOpen(false); }}>
          <CalendarMonth
            year={calYear}
            month={calMonth}
            onMonthChange={handleMonth1}
            onYearChange={handleYear1}
            selected={selectedDate}
            rangeStart={dateMode === 'range' ? rangeStart : null}
            rangeEnd={dateMode === 'range' ? rangeEnd : null}
            hoverDate={dateMode === 'range' ? hoverDate : null}
            onHover={setHoverDate}
            onSelect={handleCalSelect}
            navLeft
            navRight={dateMode !== 'range'}
          />

          {dateMode === 'range' && (
            <CalendarMonth
              year={calYear2}
              month={calMonth2}
              onMonthChange={setCalMonth2}
              onYearChange={setCalYear2}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              hoverDate={hoverDate}
              onHover={setHoverDate}
              onSelect={handleCalSelect}
              navLeft={false}
              navRight
            />
          )}
        </div>
      )}
    </div>
  );
};

export default TypeAwareInput;
