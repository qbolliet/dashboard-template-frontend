import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SWRConfig } from 'swr';
import SelectMenu from './SelectMenu';

const OPTIONS = [
  { value: 'in', label: 'dans' },
  { value: 'eq', label: 'égal à' },
];

// Contrôlé comme dans CriterionMenu : l'état vit chez le parent.
const Harness = ({ onChange, initial = [OPTIONS[0]], ...props }) => {
  const [value, setValue] = useState(initial);
  return (
    <SelectMenu
      options={OPTIONS}
      value={value}
      onChange={(next) => { onChange?.(next); setValue(next); }}
      {...props}
    />
  );
};

afterEach(cleanup);

describe('SelectMenu — clic dans le champ', () => {
  it('opens the list when the combobox input itself is clicked', () => {
    render(<Harness initial={[]} placeholder="Choisir" />);
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    // Un vrai clic : mousedown (donne le focus, donc ouvre) puis click.
    fireEvent.mouseDown(input);
    fireEvent.focus(input);
    fireEvent.click(input);

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('keeps the list open on a second click in the input', () => {
    render(<Harness initial={[]} />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.click(input);
    fireEvent.click(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
  });

  it('still toggles through the chevron', () => {
    render(<Harness initial={[]} />);
    const toggle = screen.getByRole('button', { name: /ouvrir la liste/i });
    fireEvent.click(toggle);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /fermer la liste/i }));
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('SelectMenu — re-sélection de la valeur courante (single)', () => {
  const reclick = () => {
    fireEvent.click(screen.getByRole('button', { name: /ouvrir la liste/i }));
    fireEvent.click(screen.getByRole('option', { name: /dans/ }));
  };

  it('clears the value by default', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    reclick();
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('keeps the value when clearable is false', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} clearable={false} />);
    reclick();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('dans', { selector: '.select-single' })).toBeInTheDocument();
    // La liste se referme comme après n'importe quelle sélection.
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
  });

  it('still switches to another option when clearable is false', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} clearable={false} />);
    fireEvent.click(screen.getByRole('button', { name: /ouvrir la liste/i }));
    fireEvent.click(screen.getByRole('option', { name: /égal à/ }));
    expect(onChange).toHaveBeenCalledWith([OPTIONS[1]]);
  });
});

// =================================================================
// Périmètre (scopeFilters) — transport mock réel, panel macro
// =================================================================
// Seules les lignes d'Allemagne ont un PIB au-delà de 105 (fixtures/chartFactTable.js).
describe('SelectMenu — scopeFilters', () => {
  const gdpAbove = (min) => ({ children: [{ criterion: { variable: 'gdp', operation: 'GT', value: String(min) } }] });
  const FRANCE = { value: 'France', label: 'France' };

  // Cache SWR isolé : les réponses d'un test ne fuient pas dans le suivant
  const renderScoped = (props) => render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Harness options={undefined} fieldName="country" allowMulti initial={[FRANCE]} {...props} />
    </SWRConfig>,
  );
  const open = () => fireEvent.click(screen.getByRole('button', { name: /ouvrir la liste/i }));
  const optionNames = () => screen.getAllByRole('option').map((o) => o.textContent);

  it('keeps an out-of-scope selection visible and selected, listed first (flat)', async () => {
    renderScoped({ grouped: false, scopeFilters: gdpAbove(105) });
    open();

    await waitFor(() => expect(optionNames()).toEqual(['Tout sélectionner', 'France', 'Allemagne']));
    expect(screen.getByRole('option', { name: 'France' })).toHaveAttribute('aria-selected', 'true');
    // Italie : hors périmètre et non choisie, absente
    expect(screen.queryByRole('option', { name: 'Italie' })).not.toBeInTheDocument();
    // Le tag reste là
    expect(screen.getByRole('button', { name: /retirer france/i })).toBeInTheDocument();
  });

  it('puts it under an « Hors périmètre » group in grouped mode', async () => {
    renderScoped({ grouped: true, scopeFilters: gdpAbove(105) });
    open();

    await waitFor(() => expect(screen.getByText('Union européenne')).toBeInTheDocument());
    const listbox = screen.getByRole('listbox');
    const rows = [...listbox.children].map((li) => li.textContent);
    expect(rows).toEqual(['Tout sélectionner', 'Hors périmètre', 'France', 'Union européenne', 'Allemagne']);
    expect(within(listbox).getByRole('option', { name: 'France' })).toHaveAttribute('aria-selected', 'true');
  });

  it('never drops the out-of-scope selection when selecting another value', async () => {
    const onChange = vi.fn();
    renderScoped({ grouped: false, scopeFilters: gdpAbove(105), onChange });
    open();

    await waitFor(() => expect(screen.getByRole('option', { name: 'Allemagne' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('option', { name: 'Allemagne' }));
    expect(onChange).toHaveBeenLastCalledWith([FRANCE, { value: 'Allemagne', label: 'Allemagne' }]);
  });

  it('shows the empty message for an empty scope, never the global options', async () => {
    renderScoped({ grouped: false, scopeFilters: gdpAbove(1000), initial: [] });
    open();

    await waitFor(() => expect(screen.getByText('Aucun résultat')).toBeInTheDocument());
    expect(screen.queryAllByRole('option')).toEqual([]);
  });

  it('adds nothing without a scope (behaviour unchanged)', async () => {
    renderScoped({ grouped: false, initial: [{ value: 'Espagne', label: 'Espagne' }] });
    open();

    await waitFor(() => expect(optionNames()).toEqual(['Tout sélectionner', 'France', 'Allemagne', 'Italie']));
  });
});
