import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import Table from './Table';

afterEach(cleanup);

const columnsMetadata = [
  { name: 'nc8', label: 'NC8', typeFamily: 'TEXT', isCategorical: true, labelFields: ['nc8_label'] },
  { name: 'nc8_label', label: 'Libellé NC8', typeFamily: 'TEXT', isCategorical: false, labelFor: 'nc8', labelFields: [] },
  { name: 'montant', label: 'Montant', typeFamily: 'NUMBER', isCategorical: false, unit: '€', displayFormat: ',.2f', labelFields: [] },
  { name: 'part', label: 'Part', typeFamily: 'NUMBER', isCategorical: false, displayFormat: '.1%', labelFields: [] },
  { name: 'volume', label: 'Volume', typeFamily: 'NUMBER', isCategorical: false, labelFields: [] },
];

const data = [
  { nc8: '01012100', nc8_label: 'Chevaux reproducteurs', montant: 1234.5, part: 0.256, volume: 1234.5 },
];

describe('<Table columnsMetadata>', () => {
  it('formats numeric cells with the displayFormat and unit of their column', () => {
    render(<Table data={data} columnsMetadata={columnsMetadata} locale="fr" />);

    // Le normaliseur de getByText écrase les espaces insécables : on lit le texte brut.
    const cells = screen.getAllByRole('cell').map((td) => td.textContent);
    expect(cells).toContain('1 234,50 €');
    expect(cells).toContain('25,6 %');
    // Sans displayFormat : le nombre localisé d'avant.
    expect(cells).toContain((1234.5).toLocaleString('fr-FR'));
  });

  it('shows the code and its label in separate columns by default', () => {
    render(<Table data={data} columnsMetadata={columnsMetadata} locale="fr" />);

    expect(screen.getByText('01012100')).toBeInTheDocument();
    expect(screen.getByText('Chevaux reproducteurs')).toBeInTheDocument();
  });

  it('folds the label column into « code — libellé » with codeLabels', () => {
    render(<Table data={data} columnsMetadata={columnsMetadata} codeLabels locale="fr" />);

    expect(screen.getByText('01012100 — Chevaux reproducteurs')).toBeInTheDocument();
    expect(screen.queryByText('Libellé NC8')).not.toBeInTheDocument();
  });

  it('keeps the label column when the rows do not carry it', () => {
    const rows = [{ nc8: '01012100', montant: 1, part: 0.1, volume: 1 }];
    render(<Table data={rows} columnsMetadata={columnsMetadata} codeLabels locale="fr" />);

    expect(screen.getByText('01012100')).toBeInTheDocument();
  });
});
