import { describe, it, expect } from 'vitest';
import { AutoFillEngine } from '../../src/autofill';

describe('AutoFill — alphabet', () => {
  const engine = new AutoFillEngine();

  it('continues an uppercase letter sequence', () => {
    expect(engine.generateSeries(['A', 'B', 'C'], 3)).toEqual(['D', 'E', 'F']);
  });

  it('continues a lowercase letter sequence', () => {
    expect(engine.generateSeries(['a', 'b', 'c'], 1)).toEqual(['d']);
  });

  it('wraps Z → A', () => {
    expect(engine.generateSeries(['Y', 'Z'], 1)).toEqual(['A']);
  });

  it('extrapolates a single letter by one', () => {
    expect(engine.generateSeries(['C'], 1)).toEqual(['D']);
  });

  it('leaves multi-letter tokens to the copy fallback (v1 scope)', () => {
    expect(engine.generateSeries(['AA', 'AB'], 2)).toEqual(['AA', 'AB']);
  });
});

describe('AutoFill — boolean', () => {
  const engine = new AutoFillEngine();

  it('cycles boolean values', () => {
    expect(engine.generateSeries([true, false], 2, { columnType: 'boolean' })).toEqual([true, false]);
  });

  it('cycles TRUE/FALSE strings preserving casing', () => {
    expect(engine.generateSeries(['TRUE', 'FALSE'], 2)).toEqual(['TRUE', 'FALSE']);
  });
});

describe('AutoFill — copy fallback', () => {
  const engine = new AutoFillEngine();

  it('cycles unrecognized values', () => {
    expect(engine.generateSeries(['Apple'], 3)).toEqual(['Apple', 'Apple', 'Apple']);
    expect(engine.generateSeries(['foo', 'bar'], 3)).toEqual(['foo', 'bar', 'foo']);
  });

  it('mirrors cyclic copy for a reverse fill', () => {
    // Source [A,B]; dragging up, the cell nearest the source continues the cycle.
    expect(engine.generateSeries(['A!', 'B!'], 2, { reverse: true })).toEqual(['A!', 'B!']);
  });
});
