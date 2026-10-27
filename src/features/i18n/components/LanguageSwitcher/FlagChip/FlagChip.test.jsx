import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import FlagChip from './FlagChip';

afterEach(cleanup);

const twoCandidates = () => ['/flags/fr.svg', 'https://flagcdn.com/fr.svg'];

describe('FlagChip', () => {
  it('essaie le candidat suivant quand le premier échoue, puis passe en « loaded »', () => {
    const { container } = render(<FlagChip country="FR" flagSrc={twoCandidates} />);
    expect(container.querySelector('img').getAttribute('src')).toBe('/flags/fr.svg');

    fireEvent.error(container.querySelector('img'));
    const img = container.querySelector('img');
    expect(img.getAttribute('src')).toBe('https://flagcdn.com/fr.svg');
    expect(img.dataset.status).toBe('pending');

    fireEvent.load(img);
    expect(container.querySelector('img').dataset.status).toBe('loaded');
  });

  it('ne garde que le code pays en texte quand tous les candidats échouent', () => {
    const { container } = render(<FlagChip country="FR" flagSrc={twoCandidates} />);
    fireEvent.error(container.querySelector('img'));
    fireEvent.error(container.querySelector('img'));

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.lang-switch-flag-fallback').textContent).toBe('FR');
  });

  it('accepte toujours une chaîne seule', () => {
    const { container } = render(<FlagChip country="FR" flagSrc={() => '/x.svg'} />);
    fireEvent.error(container.querySelector('img'));
    expect(container.querySelector('img')).toBeNull();
  });

  it('repart du premier candidat quand le pays change', () => {
    const { container, rerender } = render(<FlagChip country="FR" flagSrc={twoCandidates} />);
    fireEvent.error(container.querySelector('img'));
    fireEvent.error(container.querySelector('img'));
    rerender(<FlagChip country="DE" flagSrc={(c) => [`/flags/${c.toLowerCase()}.svg`]} />);
    expect(container.querySelector('img').getAttribute('src')).toBe('/flags/de.svg');
  });
});
