import { describe, it, expect } from 'vitest';
import { arcTooltipHtml } from './tooltipTemplates';

const A = { label: 'Paris' }, B = { label: 'Berlin' };

describe('arcTooltipHtml', () => {
  it('renders the header and the intensity row', () => {
    const html = arcTooltipHtml({ value: 0.42 }, A, B);
    expect(html).toContain('Paris');
    expect(html).toContain('Berlin');
    expect(html).toContain('>42<');
  });

  it('adds one escaped row per hue field the arc carries', () => {
    const html = arcTooltipHtml(
      { value: 0.5, mode: '<b>rail</b>' },
      A, B, { flowIntensity: 'Intensité' },
      [{ key: 'mode', label: 'Mode & co' }, { key: 'kind', label: 'Absent' }],
    );
    expect(html).toContain('&lt;b&gt;rail&lt;/b&gt;');
    expect(html).toContain('Mode &amp; co');
    expect(html).not.toContain('<b>');
    // Champ que l'arc ne porte pas : aucune ligne.
    expect(html).not.toContain('Absent');
  });

  it('tolerates null fields', () => {
    expect(() => arcTooltipHtml({}, A, B, undefined, null)).not.toThrow();
  });
});
