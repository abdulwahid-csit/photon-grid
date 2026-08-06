import { describe, it, expect } from 'vitest';

import type { ColumnDef } from '../../src/types/column.types';
import type {
  ColumnValidation,
  ValidationContext,
  ValidationResult,
} from '../../src/editing/types/validation.types';
import {
  ValidationEngine,
  ValidatorRegistry,
  createDefaultValidatorFactories,
  createRequiredRule,
  createEmailRule,
  createUrlRule,
  createPatternRule,
  createMinRule,
  createMaxRule,
  createMinLengthRule,
  createMaxLengthRule,
  createIntegerRule,
  createDecimalRule,
  createPositiveRule,
  createNegativeRule,
  createDateRule,
  impliedValidationFor,
  TYPE_IMPLIED_VALIDATION,
} from '../../src/editing/validation';

/** `ColumnDef` plus the declarative block the engine reads. */
type TestColumn = ColumnDef & { validation?: ColumnValidation };

/** Minimal column definition; only the fields under test are ever overridden. */
function column(overrides: Partial<TestColumn> = {}): TestColumn {
  return {
    colId: 'c1',
    field: 'value',
    header: 'Price',
    type: 'string',
    ...overrides,
  } as TestColumn;
}

/** A validation context for `value` on `colDef`. */
function contextFor(
  colDef: ColumnDef,
  value: unknown,
  data: Readonly<Record<string, unknown>> = {},
): ValidationContext {
  return {
    value,
    previousValue: null,
    data,
    node: null,
    colDef,
    label: colDef.header,
    api: null,
  };
}

/** Runs a standalone rule against `value`, asserting the rule was enabled. */
function run(
  rule: ReturnType<typeof createRequiredRule>,
  value: unknown,
  colDef: ColumnDef = column(),
): ValidationResult {
  expect(rule).not.toBeNull();
  const result = (rule as NonNullable<typeof rule>)(contextFor(colDef, value));
  expect(result).not.toBeInstanceOf(Promise);
  return result as ValidationResult;
}

/** Asserts a failure and returns it, narrowed. */
function expectInvalid(result: ValidationResult, code?: string): string {
  expect(result.valid).toBe(false);
  if (!result.valid) {
    if (code !== undefined) expect(result.code).toBe(code);
    return result.message;
  }
  throw new Error('expected an invalid result');
}

describe('validation rules', () => {
  describe('required', () => {
    it('rejects null, undefined, empty string and empty array', () => {
      const rule = createRequiredRule(true);
      for (const blank of [null, undefined, '', []]) {
        expect(expectInvalid(run(rule, blank), 'required')).toBe('Price is required');
      }
    });

    it('accepts any filled value, including zero and false', () => {
      const rule = createRequiredRule(true);
      for (const filled of [0, false, 'x', [1]]) {
        expect(run(rule, filled).valid).toBe(true);
      }
    });

    it('is disabled by required: false', () => {
      expect(createRequiredRule(false)).toBeNull();
      expect(createRequiredRule(undefined)).toBeNull();
    });
  });

  describe('email', () => {
    it('accepts a well-formed address', () => {
      expect(run(createEmailRule(true), 'a.b+tag@example.co.uk').valid).toBe(true);
    });

    it('rejects a malformed address', () => {
      expect(expectInvalid(run(createEmailRule(true), 'nope'), 'email')).toBe(
        'Price must be a valid email address',
      );
    });
  });

  describe('url', () => {
    it('accepts an absolute URL', () => {
      expect(run(createUrlRule(true), 'https://example.com/a?b=1').valid).toBe(true);
    });

    it('rejects a bare host', () => {
      expect(expectInvalid(run(createUrlRule(true), 'example.com'), 'url')).toBe(
        'Price must be a valid URL',
      );
    });
  });

  describe('pattern', () => {
    it('accepts a matching value and rejects a non-matching one', () => {
      const rule = createPatternRule(/^[A-Z]{3}$/);
      expect(run(rule, 'ABC').valid).toBe(true);
      expect(expectInvalid(run(rule, 'abc'), 'pattern')).toBe('Price is not in the expected format');
    });

    it('compiles a string source once and reuses it', () => {
      const rule = createPatternRule('^\\d+$');
      expect(run(rule, '123').valid).toBe(true);
      expect(run(rule, '12a').valid).toBe(false);
    });

    it('is stateless across calls even for a global expression', () => {
      const rule = createPatternRule(/a/g);
      expect(run(rule, 'aaa').valid).toBe(true);
      expect(run(rule, 'aaa').valid).toBe(true);
      expect(run(rule, 'aaa').valid).toBe(true);
    });

    it('honours a custom message from the object form', () => {
      const rule = createPatternRule({ pattern: /^X/, message: 'Must start with X' });
      expect(expectInvalid(run(rule, 'Y'), 'pattern')).toBe('Must start with X');
    });

    it('is disabled without a pattern', () => {
      expect(createPatternRule(undefined)).toBeNull();
      expect(createPatternRule('')).toBeNull();
    });
  });

  describe('min / max', () => {
    it('bounds numbers inclusively', () => {
      const min = createMinRule(10);
      expect(run(min, 10).valid).toBe(true);
      expect(expectInvalid(run(min, 9), 'min')).toBe('Price must be at least 10');

      const max = createMaxRule(100);
      expect(run(max, 100).valid).toBe(true);
      expect(expectInvalid(run(max, 101), 'max')).toBe('Price must be at most 100');
    });

    it('compares dates by time, including ISO strings', () => {
      const bound = new Date('2024-01-01T00:00:00.000Z');
      const min = createMinRule(bound);
      expect(run(min, new Date('2024-06-01T00:00:00.000Z')).valid).toBe(true);
      expect(run(min, '2024-06-01T00:00:00.000Z').valid).toBe(true);
      expect(run(min, '2023-06-01T00:00:00.000Z').valid).toBe(false);

      const max = createMaxRule(bound);
      expect(run(max, '2023-06-01T00:00:00.000Z').valid).toBe(true);
      expect(run(max, new Date('2024-06-01T00:00:00.000Z')).valid).toBe(false);
    });

    it('defers un-coercible values to the type rules', () => {
      expect(run(createMinRule(10), 'abc').valid).toBe(true);
      expect(run(createMaxRule(10), 'abc').valid).toBe(true);
    });

    it('treats zero as a real bound and null as no bound', () => {
      expect(createMinRule(0)).not.toBeNull();
      expect(createMinRule(null)).toBeNull();
      expect(createMaxRule(undefined)).toBeNull();
    });
  });

  describe('minLength / maxLength', () => {
    it('measures the string form', () => {
      const min = createMinLengthRule(3);
      expect(run(min, 'abc').valid).toBe(true);
      expect(expectInvalid(run(min, 'ab'), 'minLength')).toBe('Price must be at least 3 characters');

      const max = createMaxLengthRule(3);
      expect(run(max, 'abc').valid).toBe(true);
      expect(expectInvalid(run(max, 'abcd'), 'maxLength')).toBe('Price must be at most 3 characters');
    });

    it('writes a singular unit for a limit of one', () => {
      expect(expectInvalid(run(createMaxLengthRule(1), 'ab'))).toBe(
        'Price must be at most 1 character',
      );
    });
  });

  describe('integer', () => {
    it('accepts whole numbers and numeric strings', () => {
      const rule = createIntegerRule(true);
      expect(run(rule, 42).valid).toBe(true);
      expect(run(rule, '42').valid).toBe(true);
    });

    it('rejects fractions and non-numbers with distinct wording', () => {
      const rule = createIntegerRule(true);
      expect(expectInvalid(run(rule, 4.2), 'integer')).toBe('Price must be a whole number');
      expect(expectInvalid(run(rule, 'abc'), 'integer')).toBe('Price must be a number');
    });
  });

  describe('decimal', () => {
    it('asserts numeric-ness when enabled with true', () => {
      const rule = createDecimalRule(true);
      expect(run(rule, '3.14159').valid).toBe(true);
      expect(expectInvalid(run(rule, 'abc'), 'decimal')).toBe('Price must be a number');
    });

    it('bounds the number of decimal places when given a number', () => {
      const rule = createDecimalRule(2);
      expect(run(rule, 3.14).valid).toBe(true);
      expect(run(rule, 3).valid).toBe(true);
      expect(expectInvalid(run(rule, 3.145), 'decimal')).toBe(
        'Price must have at most 2 decimal places',
      );
    });

    it('is disabled by false', () => {
      expect(createDecimalRule(false)).toBeNull();
    });
  });

  describe('positive / negative', () => {
    it('excludes zero from both', () => {
      expect(expectInvalid(run(createPositiveRule(true), 0), 'positive')).toBe(
        'Price must be greater than zero',
      );
      expect(expectInvalid(run(createNegativeRule(true), 0), 'negative')).toBe(
        'Price must be less than zero',
      );
    });

    it('accepts values on the right side of zero', () => {
      expect(run(createPositiveRule(true), 0.1).valid).toBe(true);
      expect(run(createNegativeRule(true), -0.1).valid).toBe(true);
    });
  });

  describe('date', () => {
    it('accepts Date instances and parseable strings', () => {
      const rule = createDateRule(true);
      expect(run(rule, new Date()).valid).toBe(true);
      expect(run(rule, '2024-03-01T00:00:00.000Z').valid).toBe(true);
    });

    it('rejects unparseable input', () => {
      expect(expectInvalid(run(createDateRule(true), 'tomorrow'), 'date')).toBe(
        'Price must be a valid date',
      );
    });
  });

  describe('blank values', () => {
    it('are skipped by every rule except required', () => {
      const factories = createDefaultValidatorFactories();
      const configs: Readonly<Record<string, unknown>> = {
        email: true,
        url: true,
        pattern: /^Z$/,
        min: 10,
        max: 1,
        minLength: 5,
        maxLength: 1,
        integer: true,
        decimal: 2,
        positive: true,
        negative: true,
        date: true,
      };

      for (const name of Object.keys(configs)) {
        const rule = factories[name](configs[name]);
        expect(rule, `${name} should be enabled`).not.toBeNull();
        for (const blank of [null, undefined, '']) {
          expect(run(rule, blank).valid, `${name} should skip ${String(blank)}`).toBe(true);
        }
      }
    });
  });
});

describe('type-implied validation', () => {
  it('maps only the documented types', () => {
    expect(TYPE_IMPLIED_VALIDATION.email).toEqual({ email: true });
    expect(TYPE_IMPLIED_VALIDATION.url).toEqual({ url: true });
    expect(TYPE_IMPLIED_VALIDATION.number).toEqual({ decimal: true });
    expect(TYPE_IMPLIED_VALIDATION.currency).toEqual({ decimal: true });
    expect(TYPE_IMPLIED_VALIDATION.percentage).toEqual({ decimal: true });
    expect(TYPE_IMPLIED_VALIDATION.duration).toEqual({ decimal: true });
    expect(TYPE_IMPLIED_VALIDATION.date).toEqual({ date: true });
    expect(TYPE_IMPLIED_VALIDATION.datetime).toEqual({ date: true });
    expect(TYPE_IMPLIED_VALIDATION.time).toEqual({ date: true });
    expect(TYPE_IMPLIED_VALIDATION.string).toBeUndefined();
    expect(TYPE_IMPLIED_VALIDATION.boolean).toBeUndefined();
  });

  it('returns an empty object for unmapped types', () => {
    expect(impliedValidationFor(column({ type: 'boolean' }))).toEqual({});
  });

  it('makes type: email reject a malformed address with zero config', () => {
    const engine = new ValidationEngine();
    const col = column({ type: 'email', header: 'Contact' });
    expect(expectInvalid(
      engine.validate(contextFor(col, 'nope')) as ValidationResult,
      'email',
    )).toBe('Contact must be a valid email address');
    expect((engine.validate(contextFor(col, 'a@b.co')) as ValidationResult).valid).toBe(true);
  });

  it('makes type: number reject non-numeric input, matching legacy wording', () => {
    const engine = new ValidationEngine();
    const col = column({ type: 'number' });
    expect(expectInvalid(engine.validate(contextFor(col, 'abc')) as ValidationResult)).toBe(
      'Price must be a number',
    );
  });

  it('lets an explicit rule refine what the type implied', () => {
    const engine = new ValidationEngine();
    const col = column({ type: 'number', validation: { decimal: 2 } });
    expect(expectInvalid(engine.validate(contextFor(col, 1.234)) as ValidationResult)).toBe(
      'Price must have at most 2 decimal places',
    );
  });
});

describe('legacy normalisation', () => {
  it('honours the flat required field', () => {
    const engine = new ValidationEngine();
    const col = column({ required: true });
    expect(expectInvalid(engine.validate(contextFor(col, '')) as ValidationResult, 'required')).toBe(
      'Price is required',
    );
  });

  it('honours the flat min and max fields', () => {
    const engine = new ValidationEngine();
    const col = column({ type: 'number', min: 10, max: 100 });
    expect(expectInvalid(engine.validate(contextFor(col, 9)) as ValidationResult, 'min')).toBe(
      'Price must be at least 10',
    );
    expect(expectInvalid(engine.validate(contextFor(col, 101)) as ValidationResult, 'max')).toBe(
      'Price must be at most 100',
    );
    expect((engine.validate(contextFor(col, 50)) as ValidationResult).valid).toBe(true);
  });

  it('ignores null min and max, as the legacy validator did', () => {
    const engine = new ValidationEngine();
    const col = column({ type: 'number', min: null, max: null });
    expect((engine.validate(contextFor(col, -5)) as ValidationResult).valid).toBe(true);
  });

  it('adapts the legacy validatorFn signature', () => {
    const engine = new ValidationEngine();
    const col = column({
      validatorFn: (value: unknown) => (value === 'bad' ? 'Price is not allowed' : null),
    });
    expect(expectInvalid(engine.validate(contextFor(col, 'bad')) as ValidationResult, 'validate')).toBe(
      'Price is not allowed',
    );
    expect((engine.validate(contextFor(col, 'good')) as ValidationResult).valid).toBe(true);
  });

  it('lets the declarative block win over the legacy field', () => {
    const engine = new ValidationEngine();
    const col = column({ type: 'number', min: 10, validation: { min: 100 } });
    expect(expectInvalid(engine.validate(contextFor(col, 50)) as ValidationResult, 'min')).toBe(
      'Price must be at least 100',
    );
  });
});

describe('ValidationEngine.compile', () => {
  it('memoises per ColumnDef object', () => {
    const engine = new ValidationEngine();
    const col = column({ validation: { required: true, min: 1 } });
    const first = engine.compile(col);
    expect(engine.compile(col)).toBe(first);
    expect(engine.compile(column({ validation: { required: true, min: 1 } }))).not.toBe(first);
  });

  it('recompiles after invalidate', () => {
    const engine = new ValidationEngine();
    const col = column({ validation: { required: true } });
    const first = engine.compile(col);
    engine.invalidate(col);
    expect(engine.compile(col)).not.toBe(first);
  });

  it('recompiles every column after a bare invalidate', () => {
    const engine = new ValidationEngine();
    const col = column({ validation: { required: true } });
    const first = engine.compile(col);
    engine.invalidate();
    expect(engine.compile(col)).not.toBe(first);
  });

  it('drops disabled rules instead of compiling no-ops', () => {
    const engine = new ValidationEngine();
    const compiled = engine.compile(
      column({ validation: { required: false, pattern: '', minLength: 0 } }),
    );
    expect(compiled.sync).toHaveLength(0);
    expect(compiled.async).toHaveLength(0);
  });

  it('splits sync and async rules', () => {
    const engine = new ValidationEngine();
    const compiled = engine.compile(
      column({
        validation: {
          required: true,
          validate: () => ({ valid: true as const }),
          validateAsync: () => Promise.resolve({ valid: true as const }),
        },
      }),
    );
    expect(compiled.sync).toHaveLength(2);
    expect(compiled.async).toHaveLength(1);
  });

  it('ignores unknown rule keys silently', () => {
    const engine = new ValidationEngine();
    const col = column({ validation: { iban: true, somethingForeign: 42 } });
    expect(engine.compile(col).sync).toHaveLength(0);
    expect((engine.validate(contextFor(col, 'x')) as ValidationResult).valid).toBe(true);
  });

  it('replaces the pattern message with patternMessage', () => {
    const engine = new ValidationEngine();
    const col = column({
      validation: { pattern: /^[A-Z]+$/, patternMessage: 'Use capitals only' },
    });
    expect(expectInvalid(engine.validate(contextFor(col, 'abc')) as ValidationResult, 'pattern')).toBe(
      'Use capitals only',
    );
  });
});

describe('rule order', () => {
  it('reports emptiness before range', () => {
    const engine = new ValidationEngine();
    const col = column({ type: 'number', validation: { required: true, min: 10 } });
    expect(expectInvalid(engine.validate(contextFor(col, '')) as ValidationResult, 'required')).toBe(
      'Price is required',
    );
    expect(expectInvalid(engine.validate(contextFor(col, 5)) as ValidationResult, 'min')).toBe(
      'Price must be at least 10',
    );
  });

  it('reports format before range', () => {
    const engine = new ValidationEngine();
    const col = column({
      type: 'date',
      header: 'Start',
      validation: { min: new Date('2024-01-01T00:00:00.000Z') },
    });
    expect(expectInvalid(engine.validate(contextFor(col, 'tomorrow')) as ValidationResult)).toBe(
      'Start must be a valid date',
    );
  });

  it('runs the custom validate rule after the declarative ones', () => {
    const engine = new ValidationEngine();
    const seen: string[] = [];
    const col = column({
      validation: {
        required: true,
        validate: () => {
          seen.push('custom');
          return { valid: false as const, message: 'custom failed' };
        },
      },
    });
    expect(expectInvalid(engine.validate(contextFor(col, '')) as ValidationResult, 'required')).toBe(
      'Price is required',
    );
    expect(seen).toHaveLength(0);
    expect(expectInvalid(engine.validate(contextFor(col, 'x')) as ValidationResult)).toBe(
      'custom failed',
    );
    expect(seen).toEqual(['custom']);
  });
});

describe('ValidationEngine.validate', () => {
  it('returns synchronously when every rule is synchronous', () => {
    const engine = new ValidationEngine();
    const col = column({ validation: { required: true, minLength: 2 } });

    const pass = engine.validate(contextFor(col, 'ok'));
    expect(pass).not.toBeInstanceOf(Promise);
    expect((pass as ValidationResult).valid).toBe(true);

    const fail = engine.validate(contextFor(col, 'x'));
    expect(fail).not.toBeInstanceOf(Promise);
    expect(expectInvalid(fail as ValidationResult, 'minLength')).toBe(
      'Price must be at least 2 characters',
    );
  });

  it('returns synchronously for a column with no validation at all', () => {
    const engine = new ValidationEngine();
    const result = engine.validate(contextFor(column(), 'anything'));
    expect(result).not.toBeInstanceOf(Promise);
    expect((result as ValidationResult).valid).toBe(true);
  });

  it('runs an async rule only after every sync rule passed', async () => {
    const engine = new ValidationEngine();
    let calls = 0;
    const col = column({
      validation: {
        required: true,
        validateAsync: () => {
          calls++;
          return Promise.resolve({ valid: false as const, message: 'Already taken', code: 'unique' });
        },
      },
    });

    const blocked = engine.validate(contextFor(col, ''));
    expect(blocked).not.toBeInstanceOf(Promise);
    expect(expectInvalid(blocked as ValidationResult, 'required')).toBe('Price is required');
    expect(calls).toBe(0);

    const pending = engine.validate(contextFor(col, 'taken'));
    expect(pending).toBeInstanceOf(Promise);
    expect(expectInvalid(await pending, 'unique')).toBe('Already taken');
    expect(calls).toBe(1);
  });

  it('resolves VALID when an async rule passes', async () => {
    const engine = new ValidationEngine();
    const col = column({
      validation: { validateAsync: () => Promise.resolve({ valid: true as const }) },
    });
    const result = await engine.validate(contextFor(col, 'x'));
    expect(result.valid).toBe(true);
  });

  it('falls into the async path when a sync rule returns a promise, preserving order', async () => {
    const engine = new ValidationEngine();
    const order: string[] = [];
    const col = column({
      validation: {
        validate: () => {
          order.push('thenable');
          return Promise.resolve({ valid: true as const });
        },
        validateAsync: () => {
          order.push('async');
          return Promise.resolve({ valid: false as const, message: 'late failure' });
        },
      },
    });

    const pending = engine.validate(contextFor(col, 'x'));
    expect(pending).toBeInstanceOf(Promise);
    expect(expectInvalid(await pending)).toBe('late failure');
    expect(order).toEqual(['thenable', 'async']);
  });
});

describe('ValidatorRegistry', () => {
  it('seeds every built-in rule', () => {
    const registry = new ValidatorRegistry();
    for (const name of Object.keys(createDefaultValidatorFactories())) {
      expect(registry.has(name), name).toBe(true);
    }
    expect(registry.names()).toHaveLength(13);
  });

  it('registers, replaces, removes and clears', () => {
    const registry = new ValidatorRegistry({});
    expect(registry.names()).toEqual([]);

    registry.register('iban', () => null);
    expect(registry.has('iban')).toBe(true);

    const replacement = (): null => null;
    registry.register('iban', replacement);
    expect(registry.get('iban')).toBe(replacement);

    registry.registerAll({ a: () => null, b: () => null });
    expect(registry.names()).toEqual(['iban', 'a', 'b']);

    expect(registry.getAll()).toBeInstanceOf(Map);
    registry.remove('a');
    expect(registry.has('a')).toBe(false);

    registry.clear();
    expect(registry.names()).toEqual([]);
  });

  it('hands out a defensive copy from getAll', () => {
    const registry = new ValidatorRegistry();
    registry.getAll().delete('required');
    expect(registry.has('required')).toBe(true);
  });

  it('compiles a custom rule registered on the engine, invalidating the cache', () => {
    const engine = new ValidationEngine();
    const col = column({ header: 'Account', validation: { iban: true } });

    expect((engine.validate(contextFor(col, 'nonsense')) as ValidationResult).valid).toBe(true);

    engine.registerValidator('iban', (config) =>
      config === true
        ? ({ value, label }) =>
            String(value).startsWith('GB')
              ? { valid: true }
              : { valid: false, message: `${label} is not an IBAN`, code: 'iban' }
        : null,
    );

    expect(expectInvalid(engine.validate(contextFor(col, 'nonsense')) as ValidationResult, 'iban')).toBe(
      'Account is not an IBAN',
    );
    expect((engine.validate(contextFor(col, 'GB00')) as ValidationResult).valid).toBe(true);
  });

  it('is exposed for inspection', () => {
    const registry = new ValidatorRegistry();
    expect(new ValidationEngine(registry).getRegistry()).toBe(registry);
  });
});

describe('ValidationEngine.validateRow', () => {
  it('passes the row through to the validator', () => {
    const engine = new ValidationEngine();
    const data = { start: 2, end: 1 };
    const result = engine.validateRow(data, null, (row) =>
      Number(row.end) > Number(row.start)
        ? { valid: true }
        : { valid: false, message: 'End must be after start', code: 'row' },
    );
    expect(expectInvalid(result as ValidationResult, 'row')).toBe('End must be after start');
  });

  it('supports a per-field result map', () => {
    const engine = new ValidationEngine();
    const result = engine.validateRow({}, null, () => ({
      end: { valid: false, message: 'End must be after start' },
    })) as Readonly<Record<string, ValidationResult>>;
    expect(result.end.valid).toBe(false);
  });

  it('awaits an asynchronous row validator', async () => {
    const engine = new ValidationEngine();
    const result = await engine.validateRow({}, null, () => Promise.resolve({ valid: true as const }));
    expect((result as ValidationResult).valid).toBe(true);
  });
});
