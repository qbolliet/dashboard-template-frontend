import { describe, it, expect } from 'vitest';
import { DEMO_BASE_PATH } from './basePaths';

describe('DEMO_BASE_PATH', () => {
  it('is the /demo mount point', () => {
    expect(DEMO_BASE_PATH).toBe('/demo');
  });
});
