import { describe, it, expect } from 'vitest';
import { highlight } from './highlight';
import { escapeHtml } from '@/utils/html/escapeHtml';

describe('highlight — unknown language', () => {
  it('returns the escaped source, uncolored, for an unrecognized language', () => {
    expect(highlight('<div>&', 'not-a-lang')).toBe(escapeHtml('<div>&'));
  });

  it('treats a null/undefined code as an empty string', () => {
    expect(highlight(undefined, 'js')).toBe('');
    expect(highlight(null, 'not-a-lang')).toBe('');
  });
});

describe('highlight — js', () => {
  it('wraps a keyword and a number in their respective spans, escaping the rest verbatim', () => {
    expect(highlight('const a = 1;', 'js'))
      .toBe('<span class="hl-k">const</span> a = <span class="hl-n">1</span>;');
  });

  it('matches a whole-line comment as ONE token — a keyword-looking word inside it is not recolored', () => {
    expect(highlight('// const\nx', 'js'))
      .toBe('<span class="hl-c">// const</span>\nx');
  });

  it('matches a block comment across newlines', () => {
    expect(highlight('/* const\nreturn */x', 'js'))
      .toBe('<span class="hl-c">/* const\nreturn */</span>x');
  });

  it('keeps an escaped quote inside a string as part of the same token', () => {
    const src = String.raw`const s = "a\"b";`;
    const out = highlight(src, 'js');
    expect(out).toContain(`<span class="hl-s">${escapeHtml(String.raw`"a\"b"`)}</span>`);
    // No stray, unclosed span from stopping at the escaped quote.
    expect(out.match(/<span class="hl-s">/g)).toHaveLength(1);
  });

  it('escapes HTML-significant characters found inside a matched string token', () => {
    const src = `const s = "<b>";`;
    expect(highlight(src, 'js')).toContain('<span class="hl-s">&quot;&lt;b&gt;&quot;</span>');
  });

  it('accepts the "javascript" alias identically to "js"', () => {
    expect(highlight('const a = 1;', 'javascript')).toBe(highlight('const a = 1;', 'js'));
  });
});

describe('highlight — jsx', () => {
  it('colors an uppercase component tag as hl-t', () => {
    expect(highlight('<Chart />', 'jsx')).toContain('<span class="hl-t">&lt;Chart</span>');
  });

  it('does not treat a lowercase HTML tag as a component tag', () => {
    expect(highlight('<div>', 'jsx')).not.toContain('hl-t');
  });

  it('colors an attribute name (identifier glued to "=") as hl-a', () => {
    const out = highlight('<Chart x="age" />', 'jsx');
    expect(out).toContain('<span class="hl-a">x</span>');
  });

  it('accepts the "tsx" alias identically to "jsx"', () => {
    expect(highlight('<Chart x="age" />', 'tsx')).toBe(highlight('<Chart x="age" />', 'jsx'));
  });
});

describe('highlight — python', () => {
  it('colors a "#" comment as hl-c', () => {
    expect(highlight('# hello', 'python')).toBe('<span class="hl-c"># hello</span>');
  });

  it('colors an f-string (with its prefix) as a single hl-s token', () => {
    expect(highlight('f"hello {x}"', 'python')).toBe(`<span class="hl-s">${escapeHtml('f"hello {x}"')}</span>`);
  });

  it('colors a Python keyword as hl-k', () => {
    expect(highlight('import os', 'python')).toContain('<span class="hl-k">import</span>');
  });

  it('accepts the "py" alias identically to "python"', () => {
    expect(highlight('import os', 'py')).toBe(highlight('import os', 'python'));
  });
});

describe('highlight — bash', () => {
  it('colors a recognized CLI keyword as hl-k', () => {
    expect(highlight('curl -X POST', 'bash')).toContain('<span class="hl-k">curl</span>');
  });

  it('colors short and long flags as hl-n', () => {
    const out = highlight('curl -X --data', 'bash');
    expect(out).toContain('<span class="hl-n">-X</span>');
    expect(out).toContain('<span class="hl-n">--data</span>');
  });

  it('accepts the "curl" alias identically to "bash"', () => {
    expect(highlight('curl -X', 'curl')).toBe(highlight('curl -X', 'bash'));
  });
});

describe('highlight — scss', () => {
  it('colors a hex color as hl-n, checked before the generic number rule', () => {
    expect(highlight('#0f3f66', 'scss')).toBe('<span class="hl-n">#0f3f66</span>');
  });

  it('colors a custom property (declared or read via var()) as hl-a', () => {
    expect(highlight('--color-navy: #000;', 'scss')).toContain('<span class="hl-a">--color-navy</span>');
    expect(highlight('color: var(--color-navy);', 'scss')).toContain('<span class="hl-a">--color-navy</span>');
  });

  it('colors an at-rule as hl-k', () => {
    expect(highlight('@use "tokens";', 'scss')).toContain('<span class="hl-k">@use</span>');
  });

  it('accepts the "css" alias identically to "scss"', () => {
    expect(highlight('#000', 'css')).toBe(highlight('#000', 'scss'));
  });
});
