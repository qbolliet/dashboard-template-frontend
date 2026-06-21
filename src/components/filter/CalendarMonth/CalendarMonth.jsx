'use client';

import './CalendarMonth.scss';

// ── Libellés français ────────────────────────────────────────────
// Mois : index 0 = Janvier (aligné sur Date.getMonth()).
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
// Jours : index 0 = Dimanche (aligné sur Date.getDay()).
const DAYS_FR = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

// ── Icônes SVG inline (taille pilotée par le CSS) ──
// Chevron gauche — navigation vers le mois précédent
const ChevronLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m15 6-6 6 6 6" />
  </svg>
);

// Chevron droit — navigation vers le mois suivant
const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

/**
 * Builds the visible weeks of a month (Sunday in column 0).
 *
 * Each cell carries its day number and a flag indicating whether it belongs to
 * the previous/next month (rendered greyed out and non-selectable). The grid is
 * trimmed to 5 weeks when 5 suffice to cover the month, otherwise 6.
 *
 * @param {number} year
 * @param {number} month - 0-indexed (January = 0).
 * @returns {Array<Array<{d: number, other: boolean, prev?: boolean, next?: boolean}>>}
 */
function buildWeeks(year, month) {
  // Jour de la semaine du 1er (0 = dimanche) et nombre de jours du mois courant/précédent
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const weeks = [];
  let day = 1;
  let nextDay = 1;

  for (let row = 0; row < 6; row += 1) {
    const week = [];
    for (let col = 0; col < 7; col += 1) {
      if (row === 0 && col < firstWeekday) {
        // Remplissage avant le 1er : derniers jours du mois précédent
        week.push({ d: daysInPrev - (firstWeekday - col - 1), other: true, prev: true });
      } else if (day > daysInMonth) {
        // Débordement après le dernier jour : premiers jours du mois suivant
        week.push({ d: nextDay, other: true, next: true });
        nextDay += 1;
      } else {
        week.push({ d: day, other: false });
        day += 1;
      }
    }
    weeks.push(week);
    // 5 semaines suffisent si tous les jours sont placés ; sinon on garde la 6e
    if (day > daysInMonth && weeks.length >= 5) break;
  }
  return weeks;
}

// Compare deux dates au jour près (ignore l'heure)
const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();

/**
 * Monthly calendar grid used for single-date and range selection.
 *
 * Stateless: the selection/hover model is owned by the parent (TypeAwareInput),
 * which feeds `selected`, `rangeStart`, `rangeEnd` and `hoverDate` and reacts to
 * `onSelect`/`onHover`. Day cells from adjacent months are shown but inert.
 *
 * @param {number}        year
 * @param {number}        month         - 0-indexed (January = 0).
 * @param {Function}      onMonthChange - (newMonth: number) => void.
 * @param {Function}      onYearChange  - (newYear: number) => void.
 * @param {Date|null}     [selected]    - Selected date (single mode).
 * @param {Date|null}     [rangeStart]  - Range start (range mode).
 * @param {Date|null}     [rangeEnd]    - Range end (range mode).
 * @param {Date|null}     [hoverDate]   - Hovered date (range preview).
 * @param {Function}      [onHover]     - (date: Date) => void.
 * @param {Function}      onSelect      - (date: Date) => void.
 * @param {boolean}       [navLeft]     - Show the previous-month chevron.
 * @param {boolean}       [navRight]    - Show the next-month chevron.
 * @returns {JSX.Element}
 */
const CalendarMonth = ({
  year,
  month,
  onMonthChange,
  onYearChange,
  selected = null,
  rangeStart = null,
  rangeEnd = null,
  hoverDate = null,
  onHover,
  onSelect,
  navLeft = true,
  navRight = true,
}) => {
  // Le React Compiler (cf. next.config.ts) mémoïse ces dérivations : pas de useMemo.
  const today = new Date();
  const weeks = buildWeeks(year, month);

  // Plage d'années du sélecteur : année courante −5 à +14 (20 ans)
  const years = Array.from({ length: 20 }, (_, i) => today.getFullYear() - 5 + i);

  // Date réelle d'une cellule (résout le report d'année/mois pour les cellules « autres »)
  const cellDate = (cell) => {
    if (cell.other && cell.prev) {
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      return new Date(y, m, cell.d);
    }
    if (cell.other && cell.next) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      return new Date(y, m, cell.d);
    }
    return new Date(year, month, cell.d);
  };

  // Classe d'un jour selon son état (sélection, plage, aujourd'hui, hors-mois)
  const dayClass = (cell) => {
    const classes = ['calendar__day'];
    if (cell.other) {
      classes.push('calendar__day--other');
      return classes.join(' ');
    }

    const date = new Date(year, month, cell.d);
    if (sameDay(date, today)) classes.push('calendar__day--today');

    // Sélection unique
    if (sameDay(date, selected)) {
      classes.push('calendar__day--selected');
      return classes.join(' ');
    }

    // Plage confirmée (rangeStart + rangeEnd) ou prévisualisée (rangeStart + hoverDate).
    // On normalise les bornes pour gérer une sélection « à rebours ».
    const previewEnd = rangeEnd || (rangeStart ? hoverDate : null);
    if (rangeStart && previewEnd) {
      const lo = rangeStart < previewEnd ? rangeStart : previewEnd;
      const hi = rangeStart < previewEnd ? previewEnd : rangeStart;
      if (sameDay(date, lo)) classes.push('calendar__day--range-start');
      if (sameDay(date, hi)) classes.push('calendar__day--range-end');
      if (date > lo && date < hi) classes.push('calendar__day--in-range');
    } else if (sameDay(date, rangeStart)) {
      // Première borne posée, en attente de la seconde
      classes.push('calendar__day--range-start');
    }

    return classes.join(' ');
  };

  // Navigation mois précédent / suivant (avec report d'année aux bornes)
  const goPrev = () => {
    if (month === 0) { onMonthChange(11); onYearChange(year - 1); }
    else onMonthChange(month - 1);
  };
  const goNext = () => {
    if (month === 11) { onMonthChange(0); onYearChange(year + 1); }
    else onMonthChange(month + 1);
  };

  return (
    <div className="calendar">
      <header className="calendar__header">
        {navLeft ? (
          <button type="button" className="calendar__nav" onClick={goPrev} aria-label="Mois précédent">
            <ChevronLeftIcon />
          </button>
        ) : (
          <span className="calendar__nav-spacer" aria-hidden="true" />
        )}

        <span className="calendar__title">
          <select
            className="calendar__select"
            value={month}
            onChange={(e) => onMonthChange(Number(e.target.value))}
            aria-label="Mois">
            {MONTHS_FR.map((label, i) => <option key={label} value={i}>{label}</option>)}
          </select>
          <select
            className="calendar__select"
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            aria-label="Année">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </span>

        {navRight ? (
          <button type="button" className="calendar__nav" onClick={goNext} aria-label="Mois suivant">
            <ChevronRightIcon />
          </button>
        ) : (
          <span className="calendar__nav-spacer" aria-hidden="true" />
        )}
      </header>

      <table className="calendar__grid">
        <thead>
          <tr>
            {DAYS_FR.map((label) => <th key={label} scope="col" className="calendar__weekday">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, ri) => (
            <tr key={ri}>
              {week.map((cell, ci) => {
                const date = cellDate(cell);
                return (
                  <td key={ci} className="calendar__cell">
                    <span
                      className={dayClass(cell)}
                      onClick={() => !cell.other && onSelect(date)}
                      onMouseEnter={() => !cell.other && onHover?.(date)}>
                      {cell.d}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CalendarMonth;
