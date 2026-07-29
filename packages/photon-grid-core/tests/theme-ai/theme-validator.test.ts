import { describe, it, expect } from 'vitest';
import { ThemeVariableRegistry } from '../../src/photon-ai/theme/theme-variable-registry';
import { ThemeValidator } from '../../src/photon-ai/theme/theme-validator';
import { ThemeVariableType } from '../../src/types/theme-ai.types';

describe('ThemeValidator', () => {
  const validator = new ThemeValidator(new ThemeVariableRegistry());

  it('accepts valid colors and sizes', () => {
    const r = validator.validate({
      '--pg-colors-header-background': '#161B22',
      '--pg-colors-primary': 'rgb(37, 99, 235)',
      '--pg-colors-row-hover': 'green',
      '--pg-sizing-header-row-height': '52px',
    });
    expect(r.valid).toBe(true);
    expect(Object.keys(r.variables)).toHaveLength(4);
    expect(r.rejected).toHaveLength(0);
  });

  it('rejects unknown variables', () => {
    const r = validator.validate({ '--pg-not-real': '#fff' });
    expect(r.valid).toBe(false);
    expect(r.rejected[0].reason).toMatch(/Unknown/);
    expect(r.variables).toEqual({});
  });

  it('rejects malformed values for the token type', () => {
    const r = validator.validate({ '--pg-sizing-header-row-height': 'not-a-size' });
    expect(r.valid).toBe(false);
    expect(r.rejected[0].reason).toMatch(/Invalid/);
  });

  it('rejects CSS-injection payloads', () => {
    for (const evil of ['red; } body{}', 'url(x)', 'blue}<script>', 'red;color:blue']) {
      const r = validator.validate({ '--pg-colors-primary': evil });
      expect(r.valid).toBe(false);
      expect(r.variables).toEqual({});
    }
  });

  it('type grammar checks', () => {
    expect(ThemeValidator.isValidForType(ThemeVariableType.Opacity, '0.5')).toBe(true);
    expect(ThemeValidator.isValidForType(ThemeVariableType.Opacity, '2')).toBe(false);
    expect(ThemeValidator.isValidForType(ThemeVariableType.Duration, '150ms')).toBe(true);
    expect(ThemeValidator.isValidForType(ThemeVariableType.Easing, 'cubic-bezier(0.4, 0, 0.2, 1)')).toBe(true);
    expect(ThemeValidator.isValidForType(ThemeVariableType.BorderStyle, 'dashed')).toBe(true);
    expect(ThemeValidator.isValidForType(ThemeVariableType.BorderStyle, 'wiggly')).toBe(false);
  });
});
