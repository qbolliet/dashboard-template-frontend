import { describe, it, expect, afterEach } from 'vitest';
import {
  getFocusableElements,
  getFirstFocusableElement,
  getLastFocusableElement,
  focusElement,
  isFocusable,
  makeFocusable,
} from './focusManagement';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('getFocusableElements', () => {
  const buildContainer = () => {
    document.body.innerHTML = `
      <div id="container">
        <a href="#">link</a>
        <input />
        <input disabled />
        <button>btn</button>
        <div tabindex="0">tabbable div</div>
        <div tabindex="-1">not tabbable</div>
        <div>plain div</div>
      </div>`;
    return document.getElementById('container');
  };

  it('returns [] for a null container', () => {
    expect(getFocusableElements(null)).toEqual([]);
  });

  it('collects standard focusable elements, in DOM order', () => {
    const tags = getFocusableElements(buildContainer()).map((el) => el.tagName);
    expect(tags).toEqual(['A', 'INPUT', 'BUTTON', 'DIV']);
  });

  it('excludes disabled and tabindex="-1" elements', () => {
    const els = getFocusableElements(buildContainer());
    expect(els.some((el) => el.hasAttribute('disabled'))).toBe(false);
    expect(els.some((el) => el.getAttribute('tabindex') === '-1')).toBe(false);
  });

  it('excludes elements hidden via display:none', () => {
    const container = buildContainer();
    container.querySelector('a').style.display = 'none';
    expect(getFocusableElements(container).map((el) => el.tagName)).not.toContain('A');
  });
});

describe('getFirstFocusableElement / getLastFocusableElement', () => {
  it('return null for a container with nothing focusable', () => {
    document.body.innerHTML = '<div id="empty"></div>';
    const c = document.getElementById('empty');
    expect(getFirstFocusableElement(c)).toBeNull();
    expect(getLastFocusableElement(c)).toBeNull();
  });

  it('return the first and last focusable elements', () => {
    document.body.innerHTML = '<div id="c"><a href="#">a</a><span>skip</span><button>b</button></div>';
    const c = document.getElementById('c');
    expect(getFirstFocusableElement(c).textContent).toBe('a');
    expect(getLastFocusableElement(c).textContent).toBe('b');
  });
});

describe('focusElement', () => {
  it('returns false for a null target or one without a focus() method', () => {
    expect(focusElement(null)).toBe(false);
    expect(focusElement({})).toBe(false);
  });

  it('focuses a focusable element and reports success', () => {
    document.body.innerHTML = '<button id="btn">go</button>';
    const el = document.getElementById('btn');
    expect(focusElement(el)).toBe(true);
    expect(document.activeElement).toBe(el);
  });
});

describe('isFocusable', () => {
  it('returns false for null', () => {
    expect(isFocusable(null)).toBe(false);
  });

  it('returns true for a visible, enabled element with a valid tabindex', () => {
    document.body.innerHTML = '<button id="btn">go</button>';
    expect(isFocusable(document.getElementById('btn'))).toBe(true);
  });

  it('returns false for a disabled element', () => {
    document.body.innerHTML = '<button id="btn" disabled>go</button>';
    expect(isFocusable(document.getElementById('btn'))).toBe(false);
  });

  it('returns false for a display:none element', () => {
    document.body.innerHTML = '<button id="btn" style="display:none">go</button>';
    expect(isFocusable(document.getElementById('btn'))).toBe(false);
  });
});

describe('makeFocusable', () => {
  it('adds tabindex="-1" when absent', () => {
    document.body.innerHTML = '<div id="d"></div>';
    const el = document.getElementById('d');
    expect(makeFocusable(el)).toBe(true);
    expect(el.getAttribute('tabindex')).toBe('-1');
  });

  it('does not override an existing tabindex', () => {
    document.body.innerHTML = '<div id="d" tabindex="3"></div>';
    const el = document.getElementById('d');
    makeFocusable(el);
    expect(el.getAttribute('tabindex')).toBe('3');
  });

  it('returns false for a null element', () => {
    expect(makeFocusable(null)).toBe(false);
  });
});
