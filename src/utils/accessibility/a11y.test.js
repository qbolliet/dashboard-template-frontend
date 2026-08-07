import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  generateId,
  prefersReducedMotion,
  isElementVisible,
  getAccessibleText,
  announce,
  setupKeyboardDetection,
  isHighContrastMode,
} from './a11y';

afterEach(() => {
  document.body.innerHTML = '';
  document.body.className = '';
  delete window.matchMedia;
  vi.useRealTimers();
});

describe('generateId', () => {
  it('uses the "a11y" prefix by default', () => {
    expect(generateId()).toMatch(/^a11y-\d+$/);
  });

  it('accepts a custom prefix', () => {
    expect(generateId('field')).toMatch(/^field-\d+$/);
  });

  it('never repeats an id across calls', () => {
    const a = generateId('x');
    const b = generateId('x');
    expect(a).not.toBe(b);
  });
});

describe('prefersReducedMotion', () => {
  it('returns false when matchMedia is unavailable (jsdom default)', () => {
    expect(prefersReducedMotion()).toBe(false);
  });

  it('reflects a mocked matchMedia result', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({ matches: true, media: query }));
    expect(prefersReducedMotion()).toBe(true);
  });
});

describe('isHighContrastMode', () => {
  it('returns false when matchMedia is unavailable (jsdom default)', () => {
    expect(isHighContrastMode()).toBe(false);
  });

  it('reflects a mocked matchMedia result', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({ matches: true, media: query }));
    expect(isHighContrastMode()).toBe(true);
  });
});

describe('isElementVisible', () => {
  it('returns false for a null element', () => {
    expect(isElementVisible(null)).toBe(false);
  });

  it('returns true for an element with layout and no hiding styles', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ width: 10, height: 10 });
    expect(isElementVisible(el)).toBe(true);
  });

  it('returns false when display is "none"', () => {
    const el = document.createElement('div');
    el.style.display = 'none';
    document.body.appendChild(el);
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ width: 10, height: 10 });
    expect(isElementVisible(el)).toBe(false);
  });

  it('returns false when it has zero layout size, even without hiding styles', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({ width: 0, height: 0 });
    expect(isElementVisible(el)).toBe(false);
  });
});

describe('getAccessibleText', () => {
  it('returns an empty string for a null element', () => {
    expect(getAccessibleText(null)).toBe('');
  });

  it('prioritizes aria-label over text content', () => {
    const el = document.createElement('button');
    el.setAttribute('aria-label', 'Close');
    el.textContent = 'X';
    expect(getAccessibleText(el)).toBe('Close');
  });

  it('falls back to the aria-labelledby target\'s trimmed text', () => {
    document.body.innerHTML = '<span id="lbl"> Label text </span><button aria-labelledby="lbl">btn</button>';
    expect(getAccessibleText(document.querySelector('button'))).toBe('Label text');
  });

  it('falls back to the trimmed text content when no aria attribute is set', () => {
    const el = document.createElement('div');
    el.textContent = '  hello  ';
    expect(getAccessibleText(el)).toBe('hello');
  });
});

describe('announce', () => {
  it('does nothing for an empty message', () => {
    announce('');
    expect(document.body.children.length).toBe(0);
  });

  it('creates a live region reflecting the requested priority', () => {
    vi.useFakeTimers();
    announce('urgent', 'assertive', 500);
    const region = document.querySelector('[role="alert"]');
    expect(region).not.toBeNull();
    expect(region.getAttribute('aria-live')).toBe('assertive');
  });

  it('defaults to role="status" / aria-live="polite"', () => {
    vi.useFakeTimers();
    announce('hello');
    const region = document.querySelector('[role="status"]');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('fills in the message shortly after insertion, then cleans up after the timeout', () => {
    vi.useFakeTimers();
    announce('hello', 'polite', 500);
    const region = document.querySelector('[role="status"]');
    expect(region.textContent).toBe('');
    vi.advanceTimersByTime(100);
    expect(region.textContent).toBe('hello');
    vi.advanceTimersByTime(500);
    expect(document.body.contains(region)).toBe(false);
  });
});

describe('setupKeyboardDetection', () => {
  it('adds "using-keyboard" to <body> on Tab keydown, removes it on mousedown', () => {
    setupKeyboardDetection();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(document.body.classList.contains('using-keyboard')).toBe(true);
    document.dispatchEvent(new MouseEvent('mousedown'));
    expect(document.body.classList.contains('using-keyboard')).toBe(false);
  });

  it('ignores non-Tab keydowns', () => {
    setupKeyboardDetection();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(document.body.classList.contains('using-keyboard')).toBe(false);
  });
});
