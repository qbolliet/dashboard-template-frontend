import { describe, it, expect, afterEach, vi } from 'vitest';

// BASE_PATH is read from process.env.NEXT_PUBLIC_BASE_PATH once, at module load time
// (inlined by SWC in the real build) — so each scenario needs its own fresh module
// instance, loaded AFTER the env var is set.
const loadWithBasePath = async () => {
  vi.resetModules();
  const mod = await import('./withBasePath');
  return mod.withBasePath;
};

describe('withBasePath', () => {
  const original = process.env.NEXT_PUBLIC_BASE_PATH;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = original;
  });

  it('leaves paths untouched when the base path is empty (dev / server build)', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '';
    const withBasePath = await loadWithBasePath();
    expect(withBasePath('/globe/earth-day.jpg')).toBe('/globe/earth-day.jpg');
  });

  it('prefixes an internal absolute path with the deployment base path', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/dashboard-template-frontend';
    const withBasePath = await loadWithBasePath();
    expect(withBasePath('/globe/earth-day.jpg')).toBe('/dashboard-template-frontend/globe/earth-day.jpg');
  });

  it('strips a trailing slash from the configured base path once, at load time', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/dashboard-template-frontend/';
    const withBasePath = await loadWithBasePath();
    expect(withBasePath('/x.png')).toBe('/dashboard-template-frontend/x.png');
  });

  it('passes through protocol-relative URLs ("//cdn…") untouched', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/dashboard-template-frontend';
    const withBasePath = await loadWithBasePath();
    expect(withBasePath('//cdn.example.com/x.png')).toBe('//cdn.example.com/x.png');
  });

  it('passes through non-internal paths (external URL, data URI, anchor)', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/dashboard-template-frontend';
    const withBasePath = await loadWithBasePath();
    expect(withBasePath('https://example.com/x.png')).toBe('https://example.com/x.png');
    expect(withBasePath('data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA');
    expect(withBasePath('#anchor')).toBe('#anchor');
  });

  it('returns non-string / empty input untouched', async () => {
    process.env.NEXT_PUBLIC_BASE_PATH = '/dashboard-template-frontend';
    const withBasePath = await loadWithBasePath();
    expect(withBasePath('')).toBe('');
    expect(withBasePath(undefined)).toBeUndefined();
    expect(withBasePath(null)).toBeNull();
  });
});
