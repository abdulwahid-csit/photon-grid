import { describe, it, expect, beforeEach } from 'vitest';

import {
  clearColorParseCache,
  composite,
  contrastColor,
  formatColor,
  isColor,
  parseColor,
  relativeLuminance,
  toHsl,
} from '../../src/color';
import { colorNames, hexForName, isColorName, nameForHex } from '../../src/color/color-names';

/**
 * The colour parser's contract.
 *
 * A colour column is fed whichever notation the API behind it happened to
 * choose, and every one of them has to resolve to the same colour — that is the
 * whole premise of the `color` cell renderer and the colour editor. These specs
 * pin each accepted form, the boundaries of what is accepted, and the two
 * properties everything downstream depends on: that parsing is memoised, and
 * that results are immutable.
 */

beforeEach(() => {
  clearColorParseCache();
});

describe('parseColor — hex', () => {
  it('accepts 3, 4, 6 and 8 digit forms', () => {
    expect(parseColor('#f00')?.hex).toBe('#ff0000');
    expect(parseColor('#ff0000')?.hex).toBe('#ff0000');
    // Shorthand alpha: the fourth digit is doubled like the rest.
    expect(parseColor('#f00f')?.a).toBe(1);
    expect(parseColor('#ff000080')?.a).toBe(0.502);
  });

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(parseColor('  #FF0000  ')?.hex).toBe('#ff0000');
  });

  it('accepts hex without its hash, as spreadsheet exports write it', () => {
    expect(parseColor('ff0000')?.hex).toBe('#ff0000');
    expect(parseColor('f00')?.hex).toBe('#ff0000');
  });

  it('rejects digit counts CSS does not define', () => {
    // 5 and 7 digits are not colours; guessing which channel was dropped would
    // paint something the author never wrote.
    expect(parseColor('#ff000')).toBeNull();
    expect(parseColor('#ff00000')).toBeNull();
    expect(parseColor('#gg0000')).toBeNull();
  });
});

describe('parseColor — rgb()', () => {
  it('accepts the legacy comma syntax, with and without alpha', () => {
    expect(parseColor('rgb(255, 0, 0)')?.hex).toBe('#ff0000');
    expect(parseColor('rgba(255, 0, 0, 0.5)')?.a).toBe(0.5);
  });

  it('accepts the modern space syntax with a slash-delimited alpha', () => {
    // The separator ordering this pins is easy to get wrong: split the space
    // before the slash on its own and the '/' becomes a fourth argument.
    const color = parseColor('rgb(255 0 0 / 50%)');
    expect(color?.hex).toBe('#ff0000');
    expect(color?.a).toBe(0.5);
  });

  it('accepts percentage channels', () => {
    expect(parseColor('rgb(100%, 0%, 0%)')?.hex).toBe('#ff0000');
  });

  it('clamps out-of-range channels rather than rejecting them', () => {
    expect(parseColor('rgb(300, -20, 0)')?.hex).toBe('#ff0000');
    expect(parseColor('rgba(0, 0, 0, 5)')?.a).toBe(1);
  });

  it('rejects a malformed argument list', () => {
    expect(parseColor('rgb(255, 0)')).toBeNull();
    expect(parseColor('rgb(255, 0, 0, 1, 1)')).toBeNull();
    expect(parseColor('rgb(a, b, c)')).toBeNull();
  });
});

describe('parseColor — hsl()', () => {
  it('converts to the same colour CSS would paint', () => {
    expect(parseColor('hsl(0, 100%, 50%)')?.hex).toBe('#ff0000');
    expect(parseColor('hsl(120, 100%, 25%)')?.hex).toBe('#008000');
    expect(parseColor('hsl(240, 100%, 50%)')?.hex).toBe('#0000ff');
    // Achromatic: saturation 0 is grey at every hue.
    expect(parseColor('hsl(200, 0%, 50%)')?.hex).toBe('#808080');
  });

  it('accepts every CSS angle unit', () => {
    const red = '#ff0000';
    expect(parseColor('hsl(0deg 100% 50%)')?.hex).toBe(red);
    expect(parseColor('hsl(0turn 100% 50%)')?.hex).toBe(red);
    expect(parseColor('hsl(0rad 100% 50%)')?.hex).toBe(red);
    expect(parseColor('hsl(0grad 100% 50%)')?.hex).toBe(red);
    // A full turn is the same hue as none at all.
    expect(parseColor('hsl(1turn 100% 50%)')?.hex).toBe(red);
  });

  it('normalises a negative hue', () => {
    // -120deg is 240deg — blue, not an error.
    expect(parseColor('hsl(-120, 100%, 50%)')?.hex).toBe('#0000ff');
  });

  it('rejects a hue expressed as a percentage', () => {
    expect(parseColor('hsl(50%, 100%, 50%)')).toBeNull();
  });
});

describe('parseColor — keywords', () => {
  it('resolves CSS colour names, case-insensitively', () => {
    expect(parseColor('red')?.hex).toBe('#ff0000');
    expect(parseColor('RED')?.hex).toBe('#ff0000');
    expect(parseColor('rebeccapurple')?.hex).toBe('#663399');
    expect(parseColor('darkslategrey')?.hex).toBe('#2f4f4f');
  });

  it('treats transparent as a colour with zero alpha, not as black', () => {
    const color = parseColor('transparent');
    expect(color?.a).toBe(0);
    expect(color?.notation).toBe('transparent');
  });

  it('rejects a word that is not a colour', () => {
    expect(parseColor('not a colour')).toBeNull();
    expect(parseColor('chartreuse-ish')).toBeNull();
  });
});

describe('parseColor — non-colour input', () => {
  it('treats absent and blank values as misses', () => {
    expect(parseColor(null)).toBeNull();
    expect(parseColor(undefined)).toBeNull();
    expect(parseColor('')).toBeNull();
    expect(parseColor('   ')).toBeNull();
  });

  it('refuses a plain object rather than parsing "[object Object]"', () => {
    expect(parseColor({})).toBeNull();
    expect(parseColor({ r: 255 })).toBeNull();
  });

  it('accepts an object that stringifies to a colour', () => {
    expect(parseColor({ toString: () => '#ff0000' })?.hex).toBe('#ff0000');
  });

  it('rejects the wide-gamut functions it documents as unsupported', () => {
    // Not a silent partial parse: the renderer needs a definite "no" so it can
    // fall back to showing the raw text.
    expect(parseColor('oklch(70% 0.1 200)')).toBeNull();
    expect(parseColor('color(display-p3 1 0 0)')).toBeNull();
  });
});

describe('ParsedColor', () => {
  it('reports the notation the value was written in', () => {
    expect(parseColor('#f00')?.notation).toBe('hex');
    expect(parseColor('rgb(255,0,0)')?.notation).toBe('rgb');
    expect(parseColor('hsl(0,100%,50%)')?.notation).toBe('hsl');
    expect(parseColor('red')?.notation).toBe('name');
  });

  it('keeps the original text as source', () => {
    expect(parseColor('  RED ')?.source).toBe('RED');
  });

  it('exposes hex without alpha and css with it', () => {
    const translucent = parseColor('rgba(255, 0, 0, 0.5)')!;
    // hex is what <input type="color"> requires, and that control has no alpha.
    expect(translucent.hex).toBe('#ff0000');
    expect(translucent.css).toBe('rgba(255, 0, 0, 0.5)');
    expect(parseColor('#ff0000')!.css).toBe('#ff0000');
  });

  it('is frozen, because results are shared out of the memo', () => {
    const color = parseColor('red')!;
    expect(Object.isFrozen(color)).toBe(true);
  });
});

describe('parseColor — memoisation', () => {
  it('returns the identical object for a repeated value', () => {
    // The property a column of a million rows depends on: repeat reads allocate
    // nothing at all.
    expect(parseColor('red')).toBe(parseColor('red'));
  });

  it('caches misses too, since an unparseable value recurs on every row', () => {
    expect(parseColor('n/a')).toBeNull();
    expect(parseColor('n/a')).toBeNull();
  });

  it('re-parses after the cache is cleared', () => {
    const first = parseColor('red');
    clearColorParseCache();
    const second = parseColor('red');
    expect(second).not.toBe(first);
    expect(second).toEqual(first);
  });
});

describe('isColor', () => {
  it('answers the predicate form of parseColor', () => {
    expect(isColor('#abc')).toBe(true);
    expect(isColor('teal')).toBe(true);
    expect(isColor('teel')).toBe(false);
  });
});

describe('formatColor', () => {
  const red = parseColor('#ff0000')!;

  it('writes each notation', () => {
    expect(formatColor(red, 'hex')).toBe('#ff0000');
    expect(formatColor(red, 'rgb')).toBe('rgb(255, 0, 0)');
    expect(formatColor(red, 'hsl')).toBe('hsl(0, 100%, 50%)');
    expect(formatColor(red, 'name')).toBe('red');
  });

  it('carries alpha into every notation, rather than dropping it', () => {
    const translucent = parseColor('rgba(255, 0, 0, 0.5)')!;
    expect(formatColor(translucent, 'hex')).toBe('#ff000080');
    expect(formatColor(translucent, 'rgb')).toBe('rgba(255, 0, 0, 0.5)');
    expect(formatColor(translucent, 'hsl')).toBe('hsla(0, 100%, 50%, 0.5)');
  });

  it('falls back to hex when a colour has no keyword', () => {
    expect(formatColor(parseColor('#123456')!, 'name')).toBe('#123456');
  });

  it('round-trips through every notation', () => {
    const original = parseColor('hsl(210, 50%, 40%)')!;
    for (const notation of ['hex', 'rgb', 'hsl'] as const) {
      const written = formatColor(original, notation);
      expect(parseColor(written)?.hex).toBe(original.hex);
    }
  });
});

describe('toHsl', () => {
  it('inverts the hsl conversion', () => {
    expect(toHsl(parseColor('#ff0000')!)).toEqual({ h: 0, s: 100, l: 50 });
    expect(toHsl(parseColor('#008000')!)).toEqual({ h: 120, s: 100, l: 25 });
    expect(toHsl(parseColor('#808080')!)).toEqual({ h: 0, s: 0, l: 50 });
  });
});

describe('contrast', () => {
  it('measures relative luminance on the gamma-corrected scale', () => {
    expect(relativeLuminance(parseColor('white')!)).toBeCloseTo(1, 5);
    expect(relativeLuminance(parseColor('black')!)).toBeCloseTo(0, 5);
  });

  it('picks the readable text colour for a background', () => {
    expect(contrastColor(parseColor('#ffffff')!)).toBe('#000000');
    expect(contrastColor(parseColor('#000000')!)).toBe('#ffffff');
    expect(contrastColor(parseColor('lemonchiffon')!)).toBe('#000000');
    expect(contrastColor(parseColor('midnightblue')!)).toBe('#ffffff');
  });

  it('composites a translucent colour over the backdrop before deciding', () => {
    // 10% black over white is very nearly white; asking for white text on it
    // would be unreadable.
    expect(contrastColor(parseColor('rgba(0, 0, 0, 0.1)')!)).toBe('#000000');
    // Over a dark backdrop the same colour needs the opposite answer.
    expect(contrastColor(parseColor('rgba(0, 0, 0, 0.1)')!, parseColor('#000000')!)).toBe('#ffffff');
  });
});

describe('composite', () => {
  it('performs the source-over blend a browser would', () => {
    const half = parseColor('rgba(255, 0, 0, 0.5)')!;
    const onWhite = composite(half, parseColor('#ffffff')!);
    expect(onWhite.hex).toBe('#ff8080');
    expect(onWhite.a).toBe(1);
  });
});

describe('colour names', () => {
  it('maps a keyword to its digits', () => {
    expect(hexForName('red')).toBe('ff0000');
    expect(hexForName('nonsense')).toBeUndefined();
  });

  it('maps digits back to a stable keyword', () => {
    expect(nameForHex('#ff0000')).toBe('red');
    expect(nameForHex('ff0000')).toBe('red');
    // One-to-many inverses resolve to the specification's first spelling.
    expect(nameForHex('#808080')).toBe('gray');
    expect(nameForHex('#00ffff')).toBe('aqua');
    expect(nameForHex('#123456')).toBeUndefined();
  });

  it('answers the keyword predicate case-insensitively', () => {
    expect(isColorName('RebeccaPurple')).toBe(true);
    expect(isColorName('burntsienna')).toBe(false);
  });

  it('lists every supported keyword', () => {
    const names = colorNames();
    expect(names).toContain('rebeccapurple');
    // `transparent` is a keyword, not a named colour, and is handled by the
    // parser directly so it keeps its zero alpha.
    expect(names).not.toContain('transparent');
    expect(names.length).toBeGreaterThan(140);
  });
});
