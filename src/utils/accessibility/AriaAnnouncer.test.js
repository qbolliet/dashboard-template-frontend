import { describe, it, expect, afterEach, vi } from 'vitest';
import { ariaAnnouncer } from './AriaAnnouncer';
import ariaAnnouncerDefault from './AriaAnnouncer';

afterEach(() => {
  ariaAnnouncer.destroy();
  vi.useRealTimers();
});

describe('ariaAnnouncer', () => {
  it('exports the singleton as both named and default export', () => {
    expect(ariaAnnouncerDefault).toBe(ariaAnnouncer);
  });

  it('lazily creates the live regions on the first announce()', () => {
    expect(document.getElementById('aria-announcer')).toBeNull();
    ariaAnnouncer.announce('hello');
    expect(document.getElementById('aria-announcer')).not.toBeNull();
  });

  it('writes the message into the polite region by default', () => {
    ariaAnnouncer.announce('hello');
    expect(document.querySelector('[role="status"]').textContent).toBe('hello');
  });

  it('writes the message into the assertive region when requested', () => {
    ariaAnnouncer.announce('urgent', 'assertive');
    expect(document.querySelector('[role="alert"]').textContent).toBe('urgent');
    expect(document.querySelector('[role="status"]').textContent).toBe('');
  });

  it('ignores a non-string or empty message (never initializes)', () => {
    ariaAnnouncer.announce('');
    ariaAnnouncer.announce(42);
    expect(document.getElementById('aria-announcer')).toBeNull();
  });

  it('clears the region content 1s after announcing', () => {
    vi.useFakeTimers();
    ariaAnnouncer.announce('hello');
    const region = document.querySelector('[role="status"]');
    vi.advanceTimersByTime(999);
    expect(region.textContent).toBe('hello');
    vi.advanceTimersByTime(1);
    expect(region.textContent).toBe('');
  });

  it('destroy() removes the container so a later announce() re-initializes it', () => {
    ariaAnnouncer.announce('hello');
    ariaAnnouncer.destroy();
    expect(document.getElementById('aria-announcer')).toBeNull();
    ariaAnnouncer.announce('again');
    expect(document.getElementById('aria-announcer')).not.toBeNull();
  });

  it('destroy() is a no-op when never initialized', () => {
    expect(() => ariaAnnouncer.destroy()).not.toThrow();
  });
});
