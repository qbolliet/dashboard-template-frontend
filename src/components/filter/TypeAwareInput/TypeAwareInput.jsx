'use client';

// Importation des modules
import { useEffect, useId, useRef, useState } from 'react';
import VisuallyHidden from '@/components/common/VisuallyHidden';
import { useFocusTrap } from '@/hooks/accessibility';
import { ariaAnnouncer } from '@/utils/accessibility/AriaAnnouncer';
import { CalendarIcon, CheckIcon, InfoIcon } from '@/components/icons';
import CalendarMonth from '../CalendarMonth/CalendarMonth';
import {
  DATE_SINGLE_RE,
  DATE_RANGE_RE,
  DEFAULT_DATE_ORDER,
  formatDate,
  parseDate,
} from '../utils/dateParse';
import { mergeLabels } from '@/utils/i18n/mergeLabels';
import { interpolate } from '@/utils/i18n/interpolate';
import { DEFAULT_INTL_LOCALE } from '@/utils/format/constants';
import './TypeAwareInput.scss';

// ── Configurations de saisie par type ────────────────────────────
// Pilote l'inputMode (clavier mobile) et le type/step HTML. Les placeholders ne sont
// PLUS ici : ceux du texte et de la date se traduisent (`labels`), ceux des nombres sont
// des exemples de saisie universels et restent en dur ci-dessous.
const TYPE_CONFIG = {
  text: { inputMode: 'text', html: 'text', step: undefined },
  integer: { placeholder: '0', inputMode: 'numeric', html: 'number', step: '1' },
  float: { placeholder: '0.00', inputMode: 'decimal', html: 'number', step: 'any' },
  date: { inputMode: 'text', html: 'text', step: undefined },
};

// ── Libellés ─────────────────────────────────────────────────────
// ATTENTION : les messages de validation d'ici sont diffusés en région ARIA vive
// (ariaAnnouncer, plus bas). Les traduire sans traduire leur déclencheur, ou l'inverse,
// produirait une annonce dans une langue et un affichage dans l'autre.
const DEFAULT_LABELS = {
  textPlaceholder: 'Texte libre…',
  // Le masque vient de la LOCALE et non de la traduction : voir `dateMask` dans
  // src/i18n/formats.js. Le français écrit JJ/MM/AAAA, l'anglais MM/DD/YYYY.
  datePlaceholder: '{mask}',
  rangePending: ' → …',
  integerRequired: 'Entier requis',
  decimalRequired: 'Nombre décimal requis',
  dateFormat: 'Format {mask}',
  valid: 'Valide',
  validRange: 'Plage valide',
  validDate: 'Date valide',
  openCalendar: 'Ouvrir le calendrier',
  calendar: 'Calendrier',
};

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
 * @param {Date}     [minDate]  - Earliest selectable calendar date (date type only).
 * @param {Date}     [maxDate]  - Latest selectable calendar date (date type only).
 * @param {boolean}  [validate] - Enable real-time validation feedback.
 * @param {number}   [precision] - Decimal places used to normalise floats on blur.
 * @param {string}   value      - Controlled value.
 * @param {Function} onChange   - (value: string) => void.
 * @param {Function} [onCommit] - Called on blur, once the value is settled. Lets a
 *   debounced parent flush any pending emission (no stale last keystroke).
 * @param {boolean}  [disabled]
 * @param {string}   [id]       - Input id, for an external <label htmlFor>.
 * @param {"success"|"error"} [forcedState] - External VALUE verdict overriding the
 *   internal type state for the border/message display.
 * @param {string}   [forcedMessage] - Message shown alongside `forcedState`.
 * @param {string}   [className] - Additional class(es) merged on the root wrapper.
 * @param {Object}   [style]     - Additional inline styles merged on the root wrapper.
 * @param {boolean}  [disabled] - Disables the input and the calendar trigger.
 * @param {string}   [intlLocale] - Full Intl tag, driving number and date formatting.
 * @param {string}   [dateMask] - Human-readable date mask shown as a placeholder.
 * @param {string}   [dateOrder] - Permutation of 'D', 'M' and 'Y' telling how to read
 *   a typed date. The mask is its display, this is its meaning.
 * @param {number}   [firstDayOfWeek] - 0 for Sunday, 1 for Monday.
 * @param {Object}   [labels] - Wording overrides, merged over the French defaults.
 * @returns {JSX.Element}
 */
const TypeAwareInput = ({
  inputType = 'text',
  dateMode = 'single',
  minDate,
  maxDate,
  validate = false,
  precision = 2,
  value = '',
  onChange,
  onCommit,
  disabled = false,
  id,
  forcedState,
  forcedMessage,
  className = '',
  style,
  intlLocale = DEFAULT_INTL_LOCALE,
  dateMask = 'JJ/MM/AAAA',
  dateOrder = DEFAULT_DATE_ORDER,
  firstDayOfWeek = 1,
  labels: labelOverrides,
}) => {
  const labels = mergeLabels(DEFAULT_LABELS, labelOverrides);

  // Suffixe affiché après le choix de la première borne d'une plage.
  const RANGE_PENDING = labels.rangePending;
  const dateFormatMessage = interpolate(labels.dateFormat, { mask: dateMask });
  // Extraction de la configuration associé au type demandé
  const cfg = TYPE_CONFIG[inputType] || TYPE_CONFIG.text;

  // Placeholder : traduit pour le texte et la date, littéral pour les nombres (un '0'
  // ou un '0.00' n'a pas de version française).
  const placeholder = inputType === 'date'
    ? interpolate(labels.datePlaceholder, { mask: dateMask })
    : inputType === 'text'
      ? labels.textPlaceholder
      : cfg.placeholder;
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
      if (!Number.isInteger(n)) { setState('error'); setMessage(labels.integerRequired); }
      else { setState('success'); setMessage(labels.valid); }
    } else if (inputType === 'float') {
      const n = parseFloat(val);
      if (Number.isNaN(n)) { setState('error'); setMessage(labels.decimalRequired); }
      else { setState('success'); setMessage(labels.valid); }
    } else if (inputType === 'date') {
      if (val.includes(' → ')) {
        const [a, b] = val.split(' → ');
        if (parseDate(a, dateOrder) && parseDate(b, dateOrder)) { setState('success'); setMessage(labels.validRange); }
        else { setState('error'); setMessage(dateFormatMessage); }
      } else if (parseDate(val, dateOrder)) {
        setState('success'); setMessage(labels.validDate);
      } else {
        setState('error'); setMessage(dateFormatMessage);
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
    } else if (isDate && validate && value) {
      // Dates : on signale un format incomplet/erroné resté en l'état
      if (DATE_SINGLE_RE.test(value) || DATE_RANGE_RE.test(value)) validateValue(value);
      else if (!value.endsWith(RANGE_PENDING)) { setState('error'); setMessage(dateFormatMessage); }
    }

    // Valeur stabilisée : on laisse un parent amorti vider son émission en attente
    // (la normalisation éventuelle ci-dessus a déjà été émise via onChange).
    onCommit?.();
  };

  // ── Sélection au calendrier ─────────────────────────────────────
  const handleCalSelect = (date) => {
    if (disabled) return;

    if (dateMode === 'single') {
      const str = formatDate(date, dateOrder);
      onChange?.(str);
      if (validate) { setState('success'); setMessage(labels.validDate); }
      setCalOpen(false);
      return;
    }

    // Mode plage : premier clic pose la borne de départ, second clic la ferme
    if (!rangeStart || rangeEnd) {
      setRangeStart(date);
      setRangeEnd(null);
      setHoverDate(null);
      onChange?.(formatDate(date, dateOrder) + RANGE_PENDING);
    } else {
      // Inversion automatique si le second clic précède le premier
      const lo = date < rangeStart ? date : rangeStart;
      const hi = date < rangeStart ? rangeStart : date;
      setRangeStart(lo);
      setRangeEnd(hi);
      setHoverDate(null);
      onChange?.(`${formatDate(lo, dateOrder)} → ${formatDate(hi, dateOrder)}`);
      if (validate) { setState('success'); setMessage(labels.validRange); }
      setCalOpen(false);
    }
  };

  // ── Ouverture du calendrier ─────────────────────────────────────
  // Mois d'ouverture : date déjà saisie si valide, sinon aujourd'hui, le tout clampé
  // dans [minDate, maxDate] (sans quoi le popover peut s'ouvrir sur un mois entièrement
  // hors bornes, donc inerte). En plage, on recule d'un mois quand la base est le mois
  // de maxDate, pour que le calendrier de droite (base + 1) reste dans les bornes.
  const seedCalDate = () => {
    // Première date de la valeur saisie (« A », « A → B » ou « A → … »)
    const firstTyped = (value || '').split('→')[0].trim();
    const typed = DATE_SINGLE_RE.test(firstTyped) ? parseDate(firstTyped, dateOrder) : null;
    let base = typed ?? new Date();
    if (maxDate && base > maxDate) base = maxDate;
    if (minDate && base < minDate) base = minDate;
    if (dateMode === 'range' && maxDate
        && base.getFullYear() === maxDate.getFullYear()
        && base.getMonth() === maxDate.getMonth()) {
      base = new Date(base.getFullYear(), base.getMonth() - 1, 1);
    }
    return base;
  };

  // Bascule du popover ; à l'ouverture, les mois affichés sont recalés sur la graine.
  const toggleCalendar = () => {
    if (!calOpen) {
      const s = seedCalDate();
      setCalYear(s.getFullYear());
      setCalMonth(s.getMonth());
      setCalYear2(s.getMonth() === 11 ? s.getFullYear() + 1 : s.getFullYear());
      setCalMonth2(s.getMonth() === 11 ? 0 : s.getMonth() + 1);
    }
    setCalOpen(!calOpen);
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
    ? parseDate(value, dateOrder)
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
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onBlur={handleBlur}
        />

        {isDate && (
          <button
            type="button"
            className="type-input__cal-btn"
            onClick={toggleCalendar}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={calOpen}
            aria-controls={popoverId}>
            <CalendarIcon />
            <VisuallyHidden>{labels.openCalendar}</VisuallyHidden>
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
          aria-label={labels.calendar}
          className={`calendar-popover ${dateMode === 'range' ? 'calendar-popover--range' : ''}`}
          onKeyDown={(e) => { if (e.key === 'Escape') setCalOpen(false); }}>
          <CalendarMonth
            intlLocale={intlLocale}
            firstDayOfWeek={firstDayOfWeek}
            labels={labelOverrides}
            year={calYear}
            month={calMonth}
            onMonthChange={handleMonth1}
            onYearChange={handleYear1}
            minDate={minDate}
            maxDate={maxDate}
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
            intlLocale={intlLocale}
            firstDayOfWeek={firstDayOfWeek}
            labels={labelOverrides}
              year={calYear2}
              month={calMonth2}
              onMonthChange={setCalMonth2}
              onYearChange={setCalYear2}
              minDate={minDate}
              maxDate={maxDate}
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
