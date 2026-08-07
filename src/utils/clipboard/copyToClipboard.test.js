import { describe, it, expect, vi, afterEach } from 'vitest';
import { copyToClipboard } from './copyToClipboard';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  // jsdom does not implement execCommand at all (the property doesn't exist),
  // so it can't be vi.spyOn'd — it has to be stubbed directly, and removed again here.
  delete document.execCommand;
});

describe('copyToClipboard', () => {
  it('prefers the async Clipboard API when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    await copyToClipboard('hello');
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to a hidden textarea + execCommand when the Clipboard API is unavailable', async () => {
    vi.stubGlobal('navigator', {});
    const execSpy = vi.fn().mockReturnValue(true);
    document.execCommand = execSpy;
    await copyToClipboard('fallback text');
    expect(execSpy).toHaveBeenCalledWith('copy');
  });

  it('writes the given text into the hidden textarea before copying, then removes it', async () => {
    vi.stubGlobal('navigator', {});
    let capturedValue;
    document.execCommand = () => {
      capturedValue = document.querySelector('textarea')?.value;
      return true;
    };
    await copyToClipboard('fallback text');
    expect(capturedValue).toBe('fallback text');
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('never rejects, even when execCommand throws', async () => {
    vi.stubGlobal('navigator', {});
    document.execCommand = () => { throw new Error('denied'); };
    await expect(copyToClipboard('x')).resolves.toBeUndefined();
    // The textarea must still be cleaned up despite the thrown error.
    expect(document.querySelector('textarea')).toBeNull();
  });
});
