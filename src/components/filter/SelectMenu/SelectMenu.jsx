'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VisuallyHidden from '@/features/accessibility/components/VisuallyHidden/VisuallyHidden';
import { useSelectOptions } from './useSelectOptions';
import './SelectMenu.scss';

// ── Icônes SVG inline (taille pilotée par le CSS du conteneur) ──
// ✓ — coche, réutilisée pour la case multi et l'option single sélectionnée
const CheckIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

// ✕ — croix de suppression d'un tag
const CrossIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

// Chevron — orienté vers le haut (ouvert) ou le bas (fermé)
const ChevronIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {open ? <path d="m18 15-6-6-6 6" /> : <path d="m6 9 6 6 6-6" />}
  </svg>
);

/**
 * Menu déroulant de sélection (simple ou multiple) avec support de recherche
 * et d'options groupées.
 *
 * @param {string}   fieldName    - Nom du champ API (ex: "country").
 * @param {string}   [catalog]    - Catalogue API (ex: "macroeconomics").
 * @param {boolean}  [allowMulti] - Active la sélection multiple.
 * @param {boolean}  [grouped]    - Active le mode options groupées.
 * @param {string}   [groupField] - Champ de groupe pour le mode groupé.
 * @param {Array}    value        - Tableau des valeurs sélectionnées [{value, label}].
 * @param {Function} onChange     - Callback(newValues: [{value, label}][]).
 * @param {boolean}  [disabled]
 * @param {string}   [placeholder]
 * @returns {JSX.Element}
 */
export default function SelectMenu({
  fieldName,
  catalog,
  allowMulti = false,
  grouped = false,
  groupField,
  value = [],
  onChange,
  disabled = false,
  placeholder = 'Sélectionner…',
}) {
  // État local : ouverture du dropdown, terme de recherche, curseur clavier
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [highlighted, setHighlighted] = useState(-1);

  // Références pour la détection du click extérieur et le focus de l'input
  const containerRef = useRef(null);
  const filterRef = useRef(null);

  // Récupération des options (mock pour l'instant), filtrées par le terme de recherche
  const { options, groups } = useSelectOptions({
    fieldName, catalog, grouped, groupField, searchTerm: filter,
  });

  // Ensemble des valeurs sélectionnées — accès O(1) lors du rendu des options
  const selectedSet = useMemo(() => new Set(value.map((v) => v.value)), [value]);

  // Liste à plat de toutes les options visibles (utile au « tout sélectionner »)
  const flatVisible = useMemo(
    () => (grouped ? groups.flatMap((g) => g.options) : options),
    [grouped, groups, options],
  );

  // Construction des lignes navigables du dropdown :
  // « all » (multi), en-têtes de groupe, puis options. L'ordre dicte la nav clavier.
  const navRows = useMemo(() => {
    const rows = [];
    if (allowMulti && flatVisible.length > 0) rows.push({ kind: 'all' });
    if (grouped) {
      groups.forEach((g) => {
        rows.push({ kind: 'group', group: g.group, options: g.options });
        g.options.forEach((opt) => rows.push({ kind: 'option', opt }));
      });
    } else {
      options.forEach((opt) => rows.push({ kind: 'option', opt }));
    }
    return rows;
  }, [allowMulti, grouped, groups, options, flatVisible.length]);

  // Présence d'au moins une option réelle (sinon message « aucun résultat »)
  const hasOptionRows = navRows.some((r) => r.kind === 'option');

  // ── Mutations de sélection ──────────────────────────────────────
  // Toutes émettent un nouveau tableau [{value, label}] via onChange.

  // Bascule d'une option : remplace la sélection en single, l'ajoute/retire en multi
  const toggle = useCallback((opt) => {
    if (disabled) return;
    const isSelected = selectedSet.has(opt.value);
    const next = allowMulti
      ? isSelected ? value.filter((v) => v.value !== opt.value) : [...value, opt]
      : isSelected ? [] : [opt];
    onChange?.(next);
    // En single, la sélection ferme le dropdown
    if (!allowMulti) setOpen(false);
  }, [allowMulti, disabled, onChange, selectedSet, value]);

  // « Tout sélectionner » : coche/décoche l'ensemble des options visibles
  const toggleAll = useCallback(() => {
    if (disabled) return;
    const allIn = flatVisible.length > 0 && flatVisible.every((o) => selectedSet.has(o.value));
    const visibleSet = new Set(flatVisible.map((o) => o.value));
    const next = allIn
      // Décochage : on retire uniquement les options visibles (préserve le hors-filtre)
      ? value.filter((v) => !visibleSet.has(v.value))
      // Cochage : on complète la sélection avec les visibles manquantes
      : [...value, ...flatVisible.filter((o) => !selectedSet.has(o.value))];
    onChange?.(next);
  }, [disabled, flatVisible, onChange, selectedSet, value]);

  // Bascule d'un groupe entier (multi uniquement) avec préservation du hors-groupe
  const toggleGroup = useCallback((groupOptions) => {
    if (disabled || !allowMulti) return;
    const ids = new Set(groupOptions.map((o) => o.value));
    const allIn = groupOptions.every((o) => selectedSet.has(o.value));
    const next = allIn
      ? value.filter((v) => !ids.has(v.value))
      : [...value, ...groupOptions.filter((o) => !selectedSet.has(o.value))];
    onChange?.(next);
  }, [allowMulti, disabled, onChange, selectedSet, value]);

  // Suppression d'un tag — stoppe la propagation pour ne pas rouvrir le champ
  const remove = useCallback((val, e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange?.(value.filter((v) => v.value !== val));
  }, [disabled, onChange, value]);

  // ── Effets ──────────────────────────────────────────────────────

  // Fermeture au click extérieur (mousedown sur le document)
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Navigation clavier active uniquement dropdown ouvert
  useEffect(() => {
    if (!open) return;

    // Une ligne est navigable si ce n'est pas un en-tête de groupe non interactif (single)
    const isInteractive = (row) => row && (row.kind !== 'group' || allowMulti);

    // Déplacement cyclique du curseur en sautant les lignes non interactives
    const move = (dir) => setHighlighted((prev) => {
      let i = prev;
      for (let n = 0; n < navRows.length; n++) {
        i += dir;
        if (i < 0) i = navRows.length - 1;
        if (i >= navRows.length) i = 0;
        if (isInteractive(navRows[i])) return i;
      }
      return prev;
    });

    const handler = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const row = navRows[highlighted];
        if (!row) return;
        if (row.kind === 'all') toggleAll();
        else if (row.kind === 'group') toggleGroup(row.options);
        else toggle(row.opt);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, highlighted, navRows, allowMulti, toggle, toggleAll, toggleGroup]);

  // ── Rendu ───────────────────────────────────────────────────────

  // Cas spécial : single désactivé avec une valeur → label statique, sans contrôle
  if (disabled && !allowMulti && value.length === 1) {
    return <span className="select-static">{value[0].label}</span>;
  }

  // Ouvre/ferme le dropdown puis place le focus sur l'input de filtre.
  // Le curseur clavier est réinitialisé pour repartir du haut de la liste.
  const openAndFocus = () => {
    setHighlighted(-1);
    setOpen((o) => !o);
    setTimeout(() => filterRef.current?.focus(), 50);
  };

  // Identifiant du listbox, exposé via aria-controls sur le combobox
  const listboxId = `select-${fieldName || 'options'}-listbox`;

  // État de validité : succès dès qu'une valeur est sélectionnée
  const isSingleSelected = !allowMulti && value.length === 1;
  const containerClass = [
    'select-container',
    open && 'select-container--open',
    value.length > 0 && 'select-container--success',
    disabled && 'select-container--disabled',
  ].filter(Boolean).join(' ');

  // Rendu d'une ligne du dropdown selon son type
  const renderRow = (row, i) => {
    const isHL = highlighted === i;

    // Ligne « tout sélectionner » (multi) avec case reflétant l'état global
    if (row.kind === 'all') {
      const allChecked = flatVisible.length > 0 && flatVisible.every((o) => selectedSet.has(o.value));
      const someChecked = !allChecked && flatVisible.some((o) => selectedSet.has(o.value));
      const checkClass = [
        'select-check',
        allChecked && 'select-check--checked',
        someChecked && 'select-check--indeterminate',
      ].filter(Boolean).join(' ');
      return (
        <li key="__all" role="option" aria-selected={allChecked}
          className={`select-option select-option--all ${isHL ? 'select-option--highlighted' : ''}`}
          onMouseEnter={() => setHighlighted(i)}
          onClick={toggleAll}>
          <span className={checkClass}>
            {allChecked ? <CheckIcon /> : someChecked ? <span className="select-check-dash" /> : null}
          </span>
          <span className="select-label">Tout sélectionner</span>
        </li>
      );
    }

    // En-tête de groupe
    if (row.kind === 'group') {
      // Single : simple titre non interactif
      if (!allowMulti) {
        return (
          <li key={`g-${row.group.value}`} role="presentation" className="select-group">
            <span className="select-group-label">{row.group.label}</span>
          </li>
        );
      }
      // Multi : case de groupe avec état coché / indéterminé
      const allIn = row.options.every((o) => selectedSet.has(o.value));
      const someIn = !allIn && row.options.some((o) => selectedSet.has(o.value));
      const checkClass = [
        'select-check',
        allIn && 'select-check--checked',
        someIn && 'select-check--indeterminate',
      ].filter(Boolean).join(' ');
      return (
        <li key={`g-${row.group.value}`} role="presentation"
          className={`select-group select-group--interactive ${isHL ? 'select-group--highlighted' : ''}`}
          onMouseEnter={() => setHighlighted(i)}
          onClick={() => toggleGroup(row.options)}>
          <span className={checkClass}>
            {allIn ? <CheckIcon /> : someIn ? <span className="select-check-dash" /> : null}
          </span>
          <span className="select-group-label">{row.group.label}</span>
        </li>
      );
    }

    // Option simple
    const { opt } = row;
    const isSelected = selectedSet.has(opt.value);
    const optionClass = [
      'select-option',
      grouped && 'select-option--child',
      isSelected && 'select-option--selected',
      isHL && 'select-option--highlighted',
    ].filter(Boolean).join(' ');
    return (
      <li key={opt.value} role="option" aria-selected={isSelected}
        className={optionClass}
        onMouseEnter={() => setHighlighted(i)}
        onClick={() => toggle(opt)}>
        {/* Multi : case à cocher ; single : ✓ à gauche du label sélectionné */}
        {allowMulti && (
          <span className={`select-check ${isSelected ? 'select-check--checked' : ''}`}>
            {isSelected && <CheckIcon />}
          </span>
        )}
        {!allowMulti && isSelected && <CheckIcon className="select-single-check" />}
        <span className="select-label">{opt.label}</span>
      </li>
    );
  };

  return (
    <div
      ref={containerRef}
      className={containerClass}
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-controls={listboxId}
      aria-disabled={disabled || undefined}>

      {/* Zone champ : tags (multi) ou valeur unique (single) + input de filtre */}
      <div
        className={`select-field ${isSingleSelected ? 'select-field--centered' : ''}`}
        onClick={openAndFocus}>

        {/* Multi : liste de tags supprimables */}
        {allowMulti && value.length > 0 && (
          <ul className="select-tags">
            {value.map((v) => (
              <li key={v.value} className="select-tag">
                {v.label}
                <button type="button" className="select-tag-remove"
                  onClick={(e) => remove(v.value, e)}>
                  <CrossIcon />
                  <VisuallyHidden>Retirer {v.label}</VisuallyHidden>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Single : valeur sélectionnée affichée en clair */}
        {isSingleSelected && <span className="select-single">{value[0].label}</span>}

        {/* Input de filtre — masqué (mais focusable) quand une valeur single est affichée */}
        <input
          ref={filterRef}
          type="text"
          className={`select-filter ${isSingleSelected ? 'select-filter--hidden' : ''}`}
          placeholder={value.length === 0 ? placeholder : ''}
          value={filter}
          disabled={disabled}
          onChange={(e) => { setFilter(e.target.value); setOpen(true); setHighlighted(-1); }}
          onFocus={() => setOpen(true)}
          aria-label={fieldName ? `Filtrer ${fieldName}` : 'Filtrer les options'}
        />
      </div>

      {/* Bouton chevron — non atteignable au Tab (le champ porte déjà le focus) */}
      <button type="button" className="select-toggle" onClick={openAndFocus} tabIndex={-1}>
        <ChevronIcon open={open} />
        <VisuallyHidden>{open ? 'Fermer' : 'Ouvrir'} la liste</VisuallyHidden>
      </button>

      {/* Dropdown : liste ARIA des options (jamais un <select> natif) */}
      {open && (
        <ul id={listboxId} className="select-dropdown" role="listbox" aria-multiselectable={allowMulti || undefined}>
          {navRows.map((row, i) => renderRow(row, i))}
          {!hasOptionRows && <li className="select-empty" role="presentation">Aucun résultat</li>}
        </ul>
      )}
    </div>
  );
}
