'use client';

// Importation des modules
import { useEffect, useRef, useState } from 'react';
import VisuallyHidden from '@/features/accessibility/components/VisuallyHidden/VisuallyHidden';
import { CheckIcon, CrossIcon, ChevronIcon } from '@/components/icons';
import { useSelectOptions } from './useSelectOptions';
import './SelectMenu.scss';

/**
 * Menu déroulant de sélection (simple ou multiple) avec support de recherche
 * et d'options groupées.
 *
 * @param {string}   fieldName    - Nom du champ API (ex: "country").
 * @param {string}   [catalog]    - Catalogue API (ex: "macroeconomics").
 * @param {boolean}  [allowMulti] - Active la sélection multiple.
 * @param {boolean}  [grouped]    - Active le mode options groupées.
 * @param {string}   [groupField] - Champ de groupe pour le mode groupé.
 * @param {{value: string, label: string}[]} [options] - Liste statique d'options ;
 *   si fournie, court-circuite useSelectOptions (filtrage client uniquement, groupé non supporté).
 * @param {Array}    value        - Tableau des valeurs sélectionnées [{value, label}].
 * @param {Function} onChange     - Callback(newValues: [{value, label}][]).
 * @param {boolean}  [disabled]
 * @param {string}   [placeholder]
 * @param {boolean}  [compact]    - Variante compacte (hauteur réduite, mono, centré).
 * @param {boolean}  [validate]   - Active la coloration succès quand une valeur est choisie.
 *   Désactivé (false), le container reste neutre même renseigné.
 * @returns {JSX.Element}
 */
const SelectMenu = ({
  fieldName,
  catalog,
  allowMulti = false,
  grouped = false,
  groupField,
  options,
  value = [],
  onChange,
  disabled = false,
  placeholder = 'Sélectionner…',
  compact = false,
  validate = true,
}) => {
  // État local : ouverture du dropdown, terme de recherche, curseur clavier
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [highlighted, setHighlighted] = useState(-1);

  // Références pour la détection du click extérieur et le focus de l'input
  const containerRef = useRef(null);
  const filterRef = useRef(null);

  // Récupération des options via hook — ignorée quand `options` prop est fournie.
  const { options: hookOptions, groups: hookGroups } = useSelectOptions({
    fieldName, catalog, grouped, groupField, searchTerm: filter,
  });

  // Mode statique : filtrage client sur la prop `options` ; groupé non supporté.
  const filteredStatic = options
    ? (filter
        ? options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()))
        : options)
    : null;
    
  // Initialisation des options et des groupes affichés
  const displayOptions = filteredStatic ?? hookOptions;
  const displayGroups  = options ? [] : hookGroups;

  // Ensemble des valeurs sélectionnées — accès O(1) lors du rendu des options.
  const selectedSet = new Set(value.map((v) => v.value));

  // Liste à plat de toutes les options visibles (utile au « tout sélectionner »)
  const flatVisible = grouped ? displayGroups.flatMap((g) => g.options) : displayOptions;

  // Construction des lignes navigables du dropdown :
  // « all » (multi), en-têtes de groupe, puis options. L'ordre dicte la nav clavier.
  const buildNavRows = () => {
    const rows = [];
    if (allowMulti && flatVisible.length > 0) rows.push({ kind: 'all' });
    if (grouped) {
      displayGroups.forEach((g) => {
        rows.push({ kind: 'group', group: g.group, options: g.options });
        g.options.forEach((opt) => rows.push({ kind: 'option', opt }));
      });
    } else {
      displayOptions.forEach((opt) => rows.push({ kind: 'option', opt }));
    }
    return rows;
  };
  const navRows = buildNavRows();

  // Présence d'au moins une option réelle (sinon message « aucun résultat »)
  const hasOptionRows = navRows.some((r) => r.kind === 'option');

  // ── Mutations de sélection ──────────────────────────────────────
  // Toutes émettent un nouveau tableau [{value, label}] via onChange.

  // Bascule d'une option : remplace la sélection en mode single-option, 
  // l'ajoute/retire en mode multi-select.
  const toggle = (opt) => {
    if (disabled) return;
    const isSelected = selectedSet.has(opt.value);
    const next = allowMulti
      ? isSelected ? value.filter((v) => v.value !== opt.value) : [...value, opt]
      : isSelected ? [] : [opt];
    onChange?.(next);
    // En single, la sélection ferme le dropdown
    if (!allowMulti) setOpen(false);
  };

  // « Tout sélectionner » : coche/décoche l'ensemble des options visibles
  const toggleAll = () => {
    if (disabled) return;
    const allIn = flatVisible.length > 0 && flatVisible.every((o) => selectedSet.has(o.value));
    const visibleSet = new Set(flatVisible.map((o) => o.value));
    const next = allIn
      // Décochage : on retire uniquement les options visibles (préserve le hors-filtre)
      ? value.filter((v) => !visibleSet.has(v.value))
      // Cochage : on complète la sélection avec les visibles manquantes
      : [...value, ...flatVisible.filter((o) => !selectedSet.has(o.value))];
    onChange?.(next);
  };

  // Bascule d'un groupe entier (multi uniquement) avec préservation du hors-groupe
  const toggleGroup = (groupOptions) => {
    if (disabled || !allowMulti) return;
    const ids = new Set(groupOptions.map((o) => o.value));
    const allIn = groupOptions.every((o) => selectedSet.has(o.value));
    const next = allIn
      ? value.filter((v) => !ids.has(v.value))
      : [...value, ...groupOptions.filter((o) => !selectedSet.has(o.value))];
    onChange?.(next);
  };

  // Suppression d'un tag — stoppe la propagation pour ne pas rouvrir le champ
  const remove = (val, e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange?.(value.filter((v) => v.value !== val));
  };

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

  // Navigation clavier — gérée via onKeyDown sur le conteneur (le focus est dans
  // l'input de filtre quand le dropdown est ouvert).
  const handleKeyDown = (e) => {
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

  // ── Rendu ───────────────────────────────────────────────────────

  // Cas spécial : single désactivé avec une valeur → label statique, sans contrôle
  if (disabled && !allowMulti && value.length === 1) {
    return (
      <span className={`select-static${compact ? ' select-static--compact' : ''}`}>
        {value[0].label}
      </span>
    );
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
    compact && 'select-container--compact',
    open && 'select-container--open',
    validate && value.length > 0 && 'select-container--success',
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
      onKeyDown={handleKeyDown}
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
        <ChevronIcon direction={open ? 'up' : 'down'} />
        <VisuallyHidden>{open ? 'Fermer' : 'Ouvrir'} la liste</VisuallyHidden>
      </button>

      {/* Dropdown : liste ARIA des options */}
      {open && (
        <ul id={listboxId} className="select-dropdown" role="listbox" aria-multiselectable={allowMulti || undefined}>
          {navRows.map((row, i) => renderRow(row, i))}
          {!hasOptionRows && <li className="select-empty" role="presentation">Aucun résultat</li>}
        </ul>
      )}
    </div>
  );
};

export default SelectMenu;
