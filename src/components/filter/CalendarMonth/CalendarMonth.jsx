'use client';

import { useEffect, useRef, useState } from 'react';
import VisuallyHidden from '@/features/accessibility/components/VisuallyHidden/VisuallyHidden';
import { ChevronIcon } from '@/components/icons';
import './CalendarMonth.scss';

// ── Libellés français ────────────────────────────────────────────
// Mois : index 0 = Janvier (aligné sur Date.getMonth()).
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
// Jours : index 0 = Dimanche (aligné sur Date.getDay()).
const DAYS_FR = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

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

  // Initialisation de al liste des semaines
  const weeks = [];
  let day = 1;
  let nextDay = 1;

  // Parcours des jours
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
 * @param {number}        [minYear]     - Earliest selectable year (default: current year − 30).
 * @param {number}        [maxYear]     - Latest selectable year (default: current year + 5).
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
  minYear,
  maxYear,
}) => {
  // Initialisation de la date du jour
  const today = new Date();
  // Initialisation des semaines d'intérêt
  const weeks = buildWeeks(year, month);

  // ── Roving tabindex : un seul jour focusable à la fois ─────────────
  // Nombre de jours du mois affiché (borne le jour focalisable).
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Jour portant tabIndex=0. Init : sélection / borne de plage / aujourd'hui si
  // présents dans le mois affiché, sinon le 1er.
  const initialFocusDay = () => {
    const inMonth = (d) => d && d.getFullYear() === year && d.getMonth() === month;
    if (inMonth(selected)) return selected.getDate();
    if (inMonth(rangeStart)) return rangeStart.getDate();
    if (inMonth(today)) return today.getDate();
    return 1;
  };
  const [focusedDay, setFocusedDay] = useState(initialFocusDay);
  // Le jour focusable est borné au mois courant (le parent peut changer de mois).
  const tabbableDay = Math.min(Math.max(focusedDay, 1), daysInMonth);

  // Réf de la grille + drapeau « déplacer réellement le focus » : posé par la
  // navigation clavier uniquement, pour ne pas voler le focus aux rendus normaux.
  const gridRef = useRef(null);
  const shouldFocusRef = useRef(false);
  useEffect(() => {
    // Focus impératif du jour focusable seulement après une action clavier.
    if (!shouldFocusRef.current) return;
    shouldFocusRef.current = false;
    gridRef.current?.querySelector('button.calendar__day[tabindex="0"]')?.focus();
  });

  // Plage d'années du sélecteur : paramétrable via minYear/maxYear.
  // Défauts : année courante −30 à +5 (la plage n'a pas à couvrir l'année courante).
  const minY = minYear ?? today.getFullYear() - 30;
  const maxY = maxYear ?? today.getFullYear() + 5;
  const years = Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i);

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

  // Bascule vers le jour `day` du mois courant et demande le focus impératif.
  const focusDay = (day) => { setFocusedDay(day); shouldFocusRef.current = true; };

  // Applique un jour cible : si `target` déborde du mois, on bascule de mois et
  // on recale le jour relatif ; sinon on reste dans le mois courant.
  const navigate = (target, daysInPrev) => {
    if (target < 1) { goPrev(); focusDay(daysInPrev + target); }
    else if (target > daysInMonth) { goNext(); focusDay(target - daysInMonth); }
    else focusDay(target);
  };

  // ── Navigation clavier dans la grille (pattern grille WAI-ARIA) ─────
  // Flèches = ±1 jour / ±1 semaine ; Home/End = début/fin de semaine ;
  // PageUp/PageDown = mois précédent/suivant ; Enter/Espace = sélection.
  // Le franchissement d'une borne de mois recale le mois via onMonthChange.
  const handleGridKeyDown = (e) => {
    const daysInPrev = new Date(year, month, 0).getDate();
    const daysInNext = new Date(year, month + 2, 0).getDate();
    const weekday = new Date(year, month, tabbableDay).getDay();

    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); navigate(tabbableDay - 1, daysInPrev); break;
      case 'ArrowRight': e.preventDefault(); navigate(tabbableDay + 1, daysInPrev); break;
      case 'ArrowUp': e.preventDefault(); navigate(tabbableDay - 7, daysInPrev); break;
      case 'ArrowDown': e.preventDefault(); navigate(tabbableDay + 7, daysInPrev); break;
      // Début/fin de semaine, bornés au mois affiché
      case 'Home': e.preventDefault(); focusDay(Math.max(1, tabbableDay - weekday)); break;
      case 'End': e.preventDefault(); focusDay(Math.min(daysInMonth, tabbableDay + (6 - weekday))); break;
      // Mois précédent/suivant en conservant le jour (clampé sur la longueur du mois)
      case 'PageUp': e.preventDefault(); goPrev(); focusDay(Math.min(tabbableDay, daysInPrev)); break;
      case 'PageDown': e.preventDefault(); goNext(); focusDay(Math.min(tabbableDay, daysInNext)); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        onSelect(new Date(year, month, tabbableDay));
        break;
      default:
    }
  };

  return (
    <div className="calendar">
      <header className="calendar__header">
        {navLeft ? (
          <button type="button" className="calendar__nav" onClick={goPrev}>
            <ChevronIcon direction="left" />
            <VisuallyHidden>Mois précédent</VisuallyHidden>
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
            disabled={minY === maxY}
            aria-label="Année">
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </span>

        {navRight ? (
          <button type="button" className="calendar__nav" onClick={goNext}>
            <ChevronIcon direction="right" />
            <VisuallyHidden>Mois suivant</VisuallyHidden>
          </button>
        ) : (
          <span className="calendar__nav-spacer" aria-hidden="true" />
        )}
      </header>

      <table className="calendar__grid" role="grid" onKeyDown={handleGridKeyDown} ref={gridRef}>
        <thead>
          <tr>
            {DAYS_FR.map((label) => <th key={label} scope="col" className="calendar__weekday">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, ri) => (
            <tr key={ri}>
              {week.map((cell, ci) => {
                // Jours « autres mois » : visuels mais inertes (hors arbre a11y)
                if (cell.other) {
                  return (
                    <td key={ci} className="calendar__cell">
                      <span className={dayClass(cell)} aria-hidden="true">{cell.d}</span>
                    </td>
                  );
                }
                const date = cellDate(cell);
                const cls = dayClass(cell);
                // État ARIA dérivé des classes (évite de recalculer la logique de plage)
                const isSelected = /--selected|--range-start|--range-end/.test(cls);
                const isToday = /--today/.test(cls);
                return (
                  <td key={ci} className="calendar__cell">
                    <button
                      type="button"
                      className={cls}
                      // Date complète lisible pour les lecteurs d'écran
                      aria-label={`${cell.d} ${MONTHS_FR[month]} ${year}`}
                      // Bouton bascule : « pressé » = jour sélectionné / borne de plage
                      // (aria-pressed est valable sur un button, contrairement à aria-selected)
                      aria-pressed={isSelected}
                      aria-current={isToday ? 'date' : undefined}
                      // Roving tabindex : un seul jour atteignable au Tab
                      tabIndex={cell.d === tabbableDay ? 0 : -1}
                      onClick={() => { setFocusedDay(cell.d); onSelect(date); }}
                      onMouseEnter={() => onHover?.(date)}>
                      {cell.d}
                    </button>
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
