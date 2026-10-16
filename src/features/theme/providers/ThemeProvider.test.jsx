import { act, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ThemeProvider, { useTheme } from './ThemeProvider';

// React ne prend en compte `act` que si cet indicateur est posé.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Boîte partagée : le sondeur y publie le contexte dans un effet (pas d'écriture pendant le
// rendu, cf. règle react-hooks/globals), les tests le relisent.
const probe = { current: null };

const Probe = () => {
    const context = useTheme();
    useEffect(() => {
        probe.current = context;
    });
    return <p data-testid="theme">{context.theme}</p>;
};

const App = () => (
    <ThemeProvider>
        <Probe />
    </ThemeProvider>
);

let container;
let root;

beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    });
    document.documentElement.removeAttribute('data-theme');
    window.localStorage.clear();
    probe.current = null;
    container = document.createElement('div');
    document.body.appendChild(container);
});

afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    root = null;
    vi.useRealTimers();
    vi.restoreAllMocks();
});

/** Server-render the app, then hydrate it with a dark theme already applied to <html>. */
const hydrateAsDarkUser = async () => {
    const html = renderToString(<App />);
    document.documentElement.setAttribute('data-theme', 'dark');
    window.localStorage.setItem('theme', 'dark');
    container.innerHTML = html;

    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
        root = hydrateRoot(container, <App />);
    });
    return errors;
};

describe('ThemeProvider — hydratation', () => {
    it('renders light on the server', () => {
        document.documentElement.setAttribute('data-theme', 'dark');
        expect(renderToString(<App />)).toContain('>light<');
    });

    it('hydrates a dark document without any mismatch, then adopts dark', async () => {
        const errors = await hydrateAsDarkUser();

        expect(errors).not.toHaveBeenCalled();
        expect(container.querySelector('[data-testid="theme"]').textContent).toBe('dark');
        expect(probe.current.isDark).toBe(true);
    });

    it('does not overwrite the stored preference or the attribute while hydrating', async () => {
        await hydrateAsDarkUser();

        expect(window.localStorage.getItem('theme')).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
});

describe('ThemeProvider — bascule', () => {
    it('flips with a SINGLE toggle right after hydrating a dark document', async () => {
        await hydrateAsDarkUser();
        vi.useFakeTimers();

        act(() => probe.current.toggleTheme());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60);
        });

        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
        expect(probe.current.theme).toBe('light');
        expect(window.localStorage.getItem('theme')).toBe('light');
        expect(window.localStorage.getItem('theme-manual')).toBe('true');
    });

    it('two rapid toggles bring the theme back to where it started', async () => {
        await hydrateAsDarkUser();
        vi.useFakeTimers();

        act(() => {
            probe.current.toggleTheme();
            probe.current.toggleTheme();
        });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60);
        });

        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        expect(probe.current.theme).toBe('dark');
    });

    it('does not persist when following the system preference', async () => {
        await hydrateAsDarkUser();
        window.localStorage.clear();
        window.matchMedia = vi.fn().mockReturnValue({ matches: false });
        vi.useFakeTimers();

        act(() => probe.current.syncWithSystemTheme());
        await act(async () => {
            await vi.advanceTimersByTimeAsync(60);
        });

        expect(probe.current.theme).toBe('light');
        expect(window.localStorage.getItem('theme')).toBeNull();
    });
});
