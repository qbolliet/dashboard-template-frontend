'use client';

// Importation des modules
import { useEffect, useRef, useState } from 'react';
import VisuallyHidden from '@/features/accessibility/components/VisuallyHidden/VisuallyHidden';
import CalendarMonth from '../CalendarMonth/CalendarMonth';
import './TypeAwareInput.scss';

// ── Configurations de saisie par type ────────────────────────────
// Pilote le placeholder, l'inputMode (clavier mobile) et le type/step HTML.
const TYPE_CONFIG = {
  text: { placeholder: 'Texte libre…', inputMode: 'text', html: 'text', step: undefined },
  integer: { placeholder: '0', inputMode: 'numeric', html: 'number', step: '1' },
  float: { placeholder: '0.00', inputMode: 'decimal', html: 'number', step: 'any' },
  date: { placeholder: 'JJ/MM/AAAA', inputMode: 'text', html: 'text', step: undefined },
};

// ── Formats de date attendus (saisie manuelle) ──
const DATE_SINGLE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const DATE_RANGE_RE = /^\d{2}\/\d{2}\/\d{4} → \d{2}\/\d{2}\/\d{4}$/;
// Suffixe affiché après le choix de la première borne d'une plage
const RANGE_PENDING = ' → …';

// Formate une Date en chaîne JJ/MM/AAAA
const formatDate = (date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};

// Analyse une chaîne JJ/MM/AAAA → Date valide, ou null si la date n'existe pas
const parseDate = (str) => {
  const parts = str.trim().split('/');
  if (parts.length !== 3 || parts.some((x) => !x || Number.isNaN(Number(x)))) return null;
  const [d, m, y] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  // Re-vérifie les composantes pour rejeter les débordements (ex: 31/02)
  const valid = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  return valid ? date : null;
};

// ── Icônes SVG inline (taille pilotée par le CSS) ──
// Calendrier — déclencheur du popover de dates
const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

// ✓ — message de succès
const SuccessIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// ⓘ — message d'erreur
const ErrorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

/**
 * Type-adaptive input: text, integer, float or date (single/range).
 *
 * Controlled component — the displayed value is owned by the parent via `value`
 * and `onChange`. For dates, an inline calendar popover supplements manual entry;
 * range mode builds a `"A → B"` string across two synchronised months. Real-time
 * validation (optional) reflects success/error inline.
 *
 * @param {"text"|"integer"|"float"|"date"} [inputType] - Expected value type.
 * @param {"single"|"range"} [dateMode] - Date selection mode (date type only).
 * @param {boolean}  [validate] - Enable real-time validation feedback.
 * @param {number}   [precision] - Decimal places used to normalise floats on blur.
 * @param {string}   value      - Controlled value.
 * @param {Function} onChange   - (value: string) => void.
 * @param {boolean}  [disabled]
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

  // Classe d'état appliquée au cadre du champ (uniquement si validation active)
  const stateClass = validate && state !== 'default' ? `type-input--${state}` : '';

  return (
    <div className="type-input-wrap" ref={wrapRef}>
      <span className={`type-input ${stateClass} ${disabled ? 'type-input--disabled' : ''}`}>
        <input
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
            tabIndex={-1}>
            <CalendarIcon />
            <VisuallyHidden>Ouvrir le calendrier</VisuallyHidden>
          </button>
        )}
      </span>

      {validate && message && (
        <span className={`type-input__message type-input__message--${state}`}>
          {state === 'success' ? <SuccessIcon /> : <ErrorIcon />}
          {message}
        </span>
      )}

      {isDate && calOpen && (
        <div className={`calendar-popover ${dateMode === 'range' ? 'calendar-popover--range' : ''}`}>
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
