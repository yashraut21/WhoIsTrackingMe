import { describe, expect, it } from 'vitest';
import { maskValue } from '../utils/masking';

describe('Masking Utility', () => {
  it('masks standard-length sensitive strings', () => {
    expect(maskValue('abc123456789')).toBe('abc1••••••89');
    expect(maskValue('sess_9876543210')).toBe('sess••••••10');
  });

  it('masks short strings safely', () => {
    expect(maskValue('abc')).toBe('••••');
    expect(maskValue('test')).toBe('••••');
    expect(maskValue('12345')).toBe('12••••45');
  });

  it('handles null, undefined, or empty values without error', () => {
    expect(maskValue('')).toBe('');
    expect(maskValue(null)).toBe('');
    expect(maskValue(undefined)).toBe('');
    expect(maskValue('   ')).toBe('');
  });
});
