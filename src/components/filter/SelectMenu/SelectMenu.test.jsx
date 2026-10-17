import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
