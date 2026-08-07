import { describe, it, expect } from 'vitest';
import { EMPTY_PLACEHOLDER } from './constants';

describe('EMPTY_PLACEHOLDER', () => {
  it('is the em dash', () => {
    expect(EMPTY_PLACEHOLDER).toBe('—');
  });
});
