import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    applyThemeAttribute,
    getServerTheme,
    persistTheme,
    readTheme,
    subscribeTheme,
} from './themeStore';

const mockSystemTheme = (dark) => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: dark });
};

beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
    window.localStorage.clear();
    mockSystemTheme(false);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('getServerTheme', () => {
    it('is always light, whatever the document says', () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        expect(getServerTheme()).toBe('light');
    });
});

describe('readTheme', () => {
    it('prefers the attribute set by the bootstrap script', () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        window.localStorage.setItem('theme', 'light');
        expect(readTheme()).toBe('dark');
    });

    it('falls back to the stored theme when the attribute is missing', () => {
        window.localStorage.setItem('theme', 'dark');
        expect(readTheme()).toBe('dark');
    });

    it('ignores an invalid attribute and an invalid stored value', () => {
        document.documentElement.setAttribute('data-theme', 'sepia');
        window.localStorage.setItem('theme', 'sepia');
        mockSystemTheme(true);
        expect(readTheme()).toBe('dark');
    });

    it('falls back to the system preference', () => {
        mockSystemTheme(true);
        expect(readTheme()).toBe('dark');
    });

    it('survives a localStorage that throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(readTheme()).toBe('light');
    });
});

describe('subscribeTheme', () => {
    it('notifies after data-theme changes, once the attribute is already written', async () => {
        let seen = null;
        const unsubscribe = subscribeTheme(() => {
            seen = readTheme();
        });

        applyThemeAttribute('dark');
        await Promise.resolve();

        expect(seen).toBe('dark');
        unsubscribe();
    });

    it('stops notifying once unsubscribed', async () => {
        const onChange = vi.fn();
        subscribeTheme(onChange)();

        applyThemeAttribute('dark');
        await Promise.resolve();

        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('persistTheme', () => {
    it('stores the theme and flags it as an explicit choice', () => {
        persistTheme('dark');
        expect(window.localStorage.getItem('theme')).toBe('dark');
        expect(window.localStorage.getItem('theme-manual')).toBe('true');
    });

    it('does not throw when storage is blocked', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        expect(() => persistTheme('dark')).not.toThrow();
    });
});
