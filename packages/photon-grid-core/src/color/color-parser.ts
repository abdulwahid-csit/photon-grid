/**
 * CSS colour parsing, formatting and contrast — the one place Photon Grid turns
 * whatever a column stores into numbers it can reason about.
 *
 * A colour arrives from an API as any of the forms CSS accepts: `#f00`,
 * `#ff0000`, `#ff0000cc`, `rgb(255 0 0)`, `rgba(255, 0, 0, .5)`,
 * `hsl(0deg 100% 50%)`, or the keyword `red`. Every one of those is the same
 * colour, and a grid that only understood one of them would render the rest as
 * empty cells. This module reduces all of them to a single {@link ParsedColor}
 * so the cell renderer, the editor and any application code agree on what a
 * value means.
 *
 * ### Why parse at all, rather than hand the text to CSS
 * CSS *would* accept most of these directly — but silently. Assigning an
 * unrecognised value to a custom property leaves the previous value in place, so
 * a typo would paint the row above's colour rather than showing an error, and a
 * value the browser rejects paints nothing at all. Parsing first means an
 * unparseable value is a fact the renderer can act on (show the raw text, show a
 * fallback) instead of a blank square. It is also what lets the editor seed a
 * native `<input type="color">`, which accepts `#rrggbb` and nothing else.
 *
 * ### Performance
 * Results are memoised per distinct input string. A colour column typically
 * holds a few dozen distinct values across hundreds of thousands of rows, so
 * scrolling it costs one parse per distinct value for the lifetime of the page
 * rather than one per rendered cell. Every returned object is frozen and shared,
 * so repeat reads allocate nothing at all.
 *
 * @packageDocumentation
 */

import { hexForName, nameForHex } from './color-names';

// ─── Public shapes ────────────────────────────────────────────────────────────

/**
 * The notation a colour value was written in.
 *
 * Preserved through parsing so a value can be written back the way it arrived —
 * see {@link formatColor} and the colour editor's `outputFormat`. A column fed
 * `hsl()` values by its API should not quietly become a column of hex codes the
 * first time somebody edits a row.
 */
export type ColorNotation =
  /** `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa`. */
  | 'hex'
  /** `rgb()` or `rgba()`, in either the legacy comma or the modern space syntax. */
  | 'rgb'
  /** `hsl()` or `hsla()`, in either syntax. */
  | 'hsl'
  /** A CSS colour keyword — `red`, `rebeccapurple`. */
  | 'name'
  /** The `transparent` keyword. */
  | 'transparent';

/**
 * A colour, resolved to numbers.
 *
 * Frozen and shared out of the parse cache, so it must be treated as immutable —
 * two cells holding `"red"` receive the very same object.
 */
export interface ParsedColor {
  /** Red channel, an integer in `[0, 255]`. */
  readonly r: number;
  /** Green channel, an integer in `[0, 255]`. */
  readonly g: number;
  /** Blue channel, an integer in `[0, 255]`. */
  readonly b: number;
  /** Alpha in `[0, 1]`, rounded to three decimal places. `1` when the source carried none. */
  readonly a: number;
  /** How the source value was written. */
  readonly notation: ColorNotation;
  /** The original text, trimmed. What a `'value'` display format shows. */
  readonly source: string;
  /**
   * The opaque colour as `#rrggbb`.
   *
   * Alpha is **not** encoded here: this is the form `<input type="color">`
   * requires, and that control has no alpha channel. Use {@link a} or
   * {@link css} when transparency matters.
   */
  readonly hex: string;
  /**
   * A CSS value safe to paint with, alpha included.
   *
   * `#rrggbb` for an opaque colour and `rgba(…)` for a translucent one — the two
   * shortest forms every engine understands.
   */
  readonly css: string;
}

// ─── Grammar ──────────────────────────────────────────────────────────────────

/** `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`. */
const HEX = /^#([\da-f]{3,8})$/i;

/**
 * A functional colour: `name(args)`.
 *
 * The arguments are captured whole and split afterwards rather than being
 * matched positionally, because CSS admits two separator styles for the same
 * function — `rgb(255, 0, 0)` and `rgb(255 0 0 / 50%)` — and one permissive
 * capture handles both without the pattern doubling in size.
 */
const FUNCTIONAL = /^(rgba?|hsla?)\(([^)]*)\)$/i;

/**
 * Splits functional arguments on commas, whitespace and the alpha `/`.
 *
 * The `/` alternative comes **first** and swallows the whitespace either side of
 * it. Ordered the other way, `rgb(255 0 0 / 50%)` would split the space before
 * the slash on its own and leave `'/'` standing as a fourth argument, taking the
 * count to five and rejecting a perfectly valid colour.
 */
const ARG_SEPARATOR = /\s*\/\s*|[\s,]+/;

/** A number with an optional unit or percent sign — `50%`, `.5`, `180deg`, `-1e2`. */
const NUMBER_WITH_UNIT = /^([+-]?(?:\d*\.)?\d+(?:e[+-]?\d+)?)(%|deg|grad|rad|turn)?$/i;

/** Degrees in one full turn, one gradian turn, and one radian turn. */
const DEGREES_PER_TURN = 360;
const GRADIANS_PER_TURN = 400;
const RADIANS_TO_DEGREES = 180 / Math.PI;

// ─── Memoisation ──────────────────────────────────────────────────────────────

/**
 * Memo of raw text → parsed colour, misses included.
 *
 * Misses are cached deliberately: an unparseable value is almost always a
 * systematic one (a column of `"n/a"`, a stray enum) that recurs on every row,
 * and re-running the grammar against it per cell would be the worst case rather
 * than the rare one.
 */
const parseCache = new Map<string, ParsedColor | null>();

/**
 * Caps {@link parseCache}.
 *
 * Only reachable by a column of genuinely unique colour text — a generated
 * gradient, say. Clearing wholesale rather than evicting one entry keeps the hot
 * path free of recency bookkeeping: the cost is one rebuild on a workload that
 * was never getting cache hits anyway, and the same trade the country registry
 * makes.
 */
const PARSE_CACHE_LIMIT = 512;

/** Test seam — drops the memo so cache behaviour can be asserted directly. */
export function clearColorParseCache(): void {
  parseCache.clear();
}

// ─── Numeric helpers ──────────────────────────────────────────────────────────

/** Constrains `value` to `[min, max]`, mapping `NaN` to `min`. */
function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return value < min ? min : value > max ? max : value;
}

/** Rounds a channel to an integer in `[0, 255]`. */
function channel(value: number): number {
  return Math.round(clamp(value, 0, 255));
}

/** Rounds alpha to three decimals in `[0, 1]` — enough to round-trip `rgba()` text. */
function alpha(value: number): number {
  return Math.round(clamp(value, 0, 1) * 1000) / 1000;
}

/** Two lower-case hex digits for a channel. */
function hexPair(value: number): string {
  return value.toString(16).padStart(2, '0');
}

/**
 * One functional argument, as a number plus its unit.
 *
 * @returns `null` when the token is not a number, which invalidates the whole
 *   colour — a partially-parsed colour is worse than an honest failure.
 */
function argument(token: string): { value: number; unit?: string } | null {
  const match = NUMBER_WITH_UNIT.exec(token);
  if (!match) return null;
  return { value: Number(match[1]), unit: match[2]?.toLowerCase() };
}

/**
 * An `rgb()` colour channel: a number in `[0, 255]`, or a percentage of 255.
 *
 * CSS forbids mixing the two forms within one colour; accepting a mix here is a
 * deliberate leniency, since the intent is never ambiguous and rejecting it
 * would only turn readable data into a blank cell.
 */
function rgbChannel(token: string): number | null {
  const arg = argument(token);
  if (!arg || (arg.unit !== undefined && arg.unit !== '%')) return null;
  return channel(arg.unit === '%' ? (arg.value * 255) / 100 : arg.value);
}

/** An alpha argument: a number in `[0, 1]`, or a percentage. */
function alphaArgument(token: string | undefined): number | null {
  if (token === undefined) return 1;
  const arg = argument(token);
  if (!arg || (arg.unit !== undefined && arg.unit !== '%')) return null;
  return alpha(arg.unit === '%' ? arg.value / 100 : arg.value);
}

/** A hue, normalised to `[0, 360)`. Accepts `deg`, `grad`, `rad`, `turn` and bare numbers. */
function hue(token: string): number | null {
  const arg = argument(token);
  if (!arg) return null;

  let degrees: number;
  switch (arg.unit) {
    case 'grad':
      degrees = (arg.value / GRADIANS_PER_TURN) * DEGREES_PER_TURN;
      break;
    case 'rad':
      degrees = arg.value * RADIANS_TO_DEGREES;
      break;
    case 'turn':
      degrees = arg.value * DEGREES_PER_TURN;
      break;
    case '%':
      return null; // A hue is an angle; a percentage is meaningless here.
    default:
      degrees = arg.value;
  }

  // `%` of a negative angle is still negative in JavaScript, so normalise twice.
  return ((degrees % DEGREES_PER_TURN) + DEGREES_PER_TURN) % DEGREES_PER_TURN;
}

/** A saturation or lightness: a percentage, or (per Level 4) a bare number read as one. */
function percentage(token: string): number | null {
  const arg = argument(token);
  if (!arg || (arg.unit !== undefined && arg.unit !== '%')) return null;
  return clamp(arg.value, 0, 100) / 100;
}

/**
 * Converts HSL to RGB.
 *
 * The chroma/hue-prime formulation from CSS Color Level 4 rather than the older
 * `hue2rgb` helper: it is branch-light, allocation-free, and reads directly
 * against the specification, which matters because this is the one piece of
 * genuine colour maths in the module.
 *
 * @param h - Hue in degrees, `[0, 360)`.
 * @param s - Saturation, `[0, 1]`.
 * @param l - Lightness, `[0, 1]`.
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = h / 60;
  const second = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const lightnessOffset = l - chroma / 2;

  // Plain assignments rather than destructured tuples: this is six branches of
  // three writes either way, and the tuple form would allocate an array per
  // call for no gain in clarity.
  let r = 0;
  let g = 0;
  let b = 0;
  if (huePrime < 1) {
    r = chroma;
    g = second;
  } else if (huePrime < 2) {
    r = second;
    g = chroma;
  } else if (huePrime < 3) {
    g = chroma;
    b = second;
  } else if (huePrime < 4) {
    g = second;
    b = chroma;
  } else if (huePrime < 5) {
    r = second;
    b = chroma;
  } else {
    r = chroma;
    b = second;
  }

  return {
    r: channel((r + lightnessOffset) * 255),
    g: channel((g + lightnessOffset) * 255),
    b: channel((b + lightnessOffset) * 255),
  };
}

// ─── Construction ─────────────────────────────────────────────────────────────

/** Builds the frozen result, deriving {@link ParsedColor.hex} and `css` once. */
function build(
  r: number,
  g: number,
  b: number,
  a: number,
  notation: ColorNotation,
  source: string,
): ParsedColor {
  const hex = `#${hexPair(r)}${hexPair(g)}${hexPair(b)}`;
  return Object.freeze({
    r,
    g,
    b,
    a,
    notation,
    source,
    hex,
    // An opaque colour is written as hex — shorter, and what most consumers
    // expect to see in a style attribute or a devtools inspection.
    css: a >= 1 ? hex : `rgba(${r}, ${g}, ${b}, ${a})`,
  });
}

/** Parses `#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa`. */
function parseHex(text: string): ParsedColor | null {
  const match = HEX.exec(text);
  if (!match) return null;

  const digits = match[1].toLowerCase();
  // 5 and 7 digits are not valid CSS; rejecting them beats guessing which
  // channel the author meant to leave off.
  const shorthand = digits.length === 3 || digits.length === 4;
  if (!shorthand && digits.length !== 6 && digits.length !== 8) return null;

  const at = (index: number): number =>
    shorthand
      ? parseInt(digits[index] + digits[index], 16)
      : parseInt(digits.slice(index * 2, index * 2 + 2), 16);

  const hasAlpha = digits.length === 4 || digits.length === 8;
  return build(at(0), at(1), at(2), hasAlpha ? alpha(at(3) / 255) : 1, 'hex', text);
}

/** Parses `rgb()`, `rgba()`, `hsl()` and `hsla()` in both separator styles. */
function parseFunctional(text: string): ParsedColor | null {
  const match = FUNCTIONAL.exec(text);
  if (!match) return null;

  const fn = match[1].toLowerCase();
  const args = match[2].trim().split(ARG_SEPARATOR).filter(Boolean);
  // Three components, plus an optional alpha. Anything else is malformed —
  // `rgb(255, 0)` is not a colour with an implied blue.
  if (args.length < 3 || args.length > 4) return null;

  const a = alphaArgument(args[3]);
  if (a === null) return null;

  if (fn === 'rgb' || fn === 'rgba') {
    const r = rgbChannel(args[0]);
    const g = rgbChannel(args[1]);
    const b = rgbChannel(args[2]);
    if (r === null || g === null || b === null) return null;
    return build(r, g, b, a, 'rgb', text);
  }

  const h = hue(args[0]);
  const s = percentage(args[1]);
  const l = percentage(args[2]);
  if (h === null || s === null || l === null) return null;

  const rgb = hslToRgb(h, s, l);
  return build(rgb.r, rgb.g, rgb.b, a, 'hsl', text);
}

/** The shared result for the `transparent` keyword — parsed once, reused forever. */
const TRANSPARENT: ParsedColor = build(0, 0, 0, 0, 'transparent', 'transparent');

/**
 * Parses any CSS colour this grid understands.
 *
 * Accepts, in the order they are tried: hex (3, 4, 6 or 8 digits), `rgb()` /
 * `rgba()`, `hsl()` / `hsla()`, the `transparent` keyword, and the CSS colour
 * keywords. Leading and trailing whitespace is ignored and matching is
 * case-insensitive throughout, because real data is not tidy.
 *
 * Values are looked up in a memo first, so a column of a million rows drawn from
 * twenty distinct colours performs twenty parses in total.
 *
 * ### What is deliberately not supported
 * The wide-gamut and perceptual functions — `color()`, `lab()`, `lch()`,
 * `oklab()`, `oklch()`, `color-mix()` — and `currentColor`. Each needs either a
 * colour-space conversion the grid has no other use for or a live DOM to resolve
 * against, and a column storing them is vanishingly rare next to the five forms
 * above. They parse as `null`, which the `color` renderer surfaces as the raw
 * text rather than an empty cell.
 *
 * @param value - Anything a cell might hold. Non-strings are stringified, so a
 *   `String` object or a value object with a sensible `toString` works; `null`,
 *   `undefined` and blank text are misses.
 * @returns The parsed colour — frozen and shared, never mutate it — or `null`
 *   when the value is not a colour this module recognises.
 *
 * @example
 * ```ts
 * parseColor('#f00')?.hex;                 // '#ff0000'
 * parseColor('rgb(255 0 0 / 50%)')?.a;     // 0.5
 * parseColor('hsl(120, 100%, 25%)')?.hex;  // '#008000'
 * parseColor('rebeccapurple')?.hex;        // '#663399'
 * parseColor('not a colour');              // null
 * ```
 */
export function parseColor(value: unknown): ParsedColor | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' && typeof value !== 'number') {
    // An object with a custom `toString` is fair game; a plain one would
    // stringify to '[object Object]' and waste a parse, so it is refused here.
    if (typeof value !== 'object' || value.toString === Object.prototype.toString) return null;
  }

  const text = String(value).trim();
  if (text === '') return null;

  const cached = parseCache.get(text);
  if (cached !== undefined) return cached;

  const parsed = parseUncached(text);

  if (parseCache.size >= PARSE_CACHE_LIMIT) parseCache.clear();
  parseCache.set(text, parsed);
  return parsed;
}

/** The grammar itself, run once per distinct input by {@link parseColor}. */
function parseUncached(text: string): ParsedColor | null {
  if (text.charCodeAt(0) === 35 /* '#' */) return parseHex(text);
  if (text.includes('(')) return parseFunctional(text);

  const lower = text.toLowerCase();
  if (lower === 'transparent') return TRANSPARENT;

  const named = hexForName(lower);
  if (named) {
    return build(
      parseInt(named.slice(0, 2), 16),
      parseInt(named.slice(2, 4), 16),
      parseInt(named.slice(4, 6), 16),
      1,
      'name',
      text,
    );
  }

  // A bare `f00` or `ff0000` — hex without its hash. Common in data exported
  // from spreadsheets and design tools, and unambiguous, so it is accepted.
  return parseHex(`#${text}`);
}

/** `true` when `value` is a colour {@link parseColor} understands. */
export function isColor(value: unknown): boolean {
  return parseColor(value) !== null;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Writes a parsed colour back out in a chosen notation.
 *
 * The counterpart to {@link parseColor}, and what lets an edit preserve the form
 * a column's data is stored in instead of rewriting every row as hex.
 *
 * @param color - A parsed colour.
 * @param notation - The form to produce. `'name'` falls back to hex when the
 *   colour has no CSS keyword, since most colours do not. `'transparent'` is
 *   accepted for symmetry and produces the keyword only for a fully transparent
 *   colour, hex otherwise.
 * @returns CSS text. Alpha is included whenever it is below `1`, which upgrades
 *   `'hex'` to eight digits and `'rgb'`/`'hsl'` to their `a` forms — dropping it
 *   would silently make a translucent colour opaque.
 *
 * @example
 * ```ts
 * const red = parseColor('#ff0000')!;
 * formatColor(red, 'rgb');   // 'rgb(255, 0, 0)'
 * formatColor(red, 'hsl');   // 'hsl(0, 100%, 50%)'
 * formatColor(red, 'name');  // 'red'
 * ```
 */
export function formatColor(color: ParsedColor, notation: ColorNotation): string {
  const { r, g, b, a } = color;

  switch (notation) {
    case 'rgb':
      return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;

    case 'hsl': {
      const { h, s, l } = toHsl(color);
      return a >= 1 ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${a})`;
    }

    case 'name':
      return nameForHex(color.hex) ?? formatColor(color, 'hex');

    case 'transparent':
      return a <= 0 ? 'transparent' : formatColor(color, 'hex');

    case 'hex':
    default:
      return a >= 1 ? color.hex : `${color.hex}${hexPair(Math.round(a * 255))}`;
  }
}

/**
 * The colour as hue, saturation and lightness — degrees and whole percentages,
 * the units `hsl()` is written in.
 *
 * Rounded rather than exact: this feeds display text and `hsl()` output, where
 * fractional percentages are noise, and rounding here keeps
 * `formatColor(…, 'hsl')` free of eleven-decimal values.
 */
export function toHsl(color: ParsedColor): { h: number; s: number; l: number } {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const lightness = (max + min) / 2;

  if (chroma === 0) return { h: 0, s: 0, l: Math.round(lightness * 100) };

  const saturation = chroma / (1 - Math.abs(2 * lightness - 1));

  let h: number;
  if (max === r) h = ((g - b) / chroma) % 6;
  else if (max === g) h = (b - r) / chroma + 2;
  else h = (r - g) / chroma + 4;

  return {
    h: Math.round((((h * 60) % DEGREES_PER_TURN) + DEGREES_PER_TURN) % DEGREES_PER_TURN),
    s: Math.round(clamp(saturation, 0, 1) * 100),
    l: Math.round(lightness * 100),
  };
}

// ─── Contrast ─────────────────────────────────────────────────────────────────

/** Threshold above which a colour is treated as light. Tuned to WCAG's own 4.5:1 pivot against black and white. */
const LIGHT_THRESHOLD = 0.179;

/** Linearises one sRGB channel, per the WCAG relative-luminance definition. */
function linearize(value: number): number {
  const channelValue = value / 255;
  return channelValue <= 0.04045
    ? channelValue / 12.92
    : Math.pow((channelValue + 0.055) / 1.055, 2.4);
}

/**
 * WCAG relative luminance, `0` (black) to `1` (white).
 *
 * The gamma-corrected definition rather than a naive weighted average of the
 * raw channels: the difference decides whether text on a mid-tone swatch is
 * legible, which is the only reason this function exists.
 *
 * Alpha is ignored — a translucent colour's apparent luminance depends on what
 * is behind it, which is {@link contrastColor}'s job to know.
 */
export function relativeLuminance(color: ParsedColor): number {
  return 0.2126 * linearize(color.r) + 0.7152 * linearize(color.g) + 0.0722 * linearize(color.b);
}

/**
 * Black or white, whichever stays readable on top of `color`.
 *
 * What the `color` renderer's filled variant uses to keep its label legible on
 * every swatch from `lemonchiffon` to `midnightblue`, without the author
 * choosing a text colour per row.
 *
 * A translucent colour is composited over `backdrop` first, because a 10%-alpha
 * red is very nearly the surface behind it and asking for white text on that
 * would be wrong.
 *
 * @param color - The background colour.
 * @param backdrop - What shows through a translucent `color`. Defaults to white,
 *   the light theme's cell surface; pass the real surface colour in a dark theme.
 * @returns `'#000000'` or `'#ffffff'`.
 */
export function contrastColor(color: ParsedColor, backdrop?: ParsedColor): string {
  const composited = color.a >= 1 ? color : composite(color, backdrop ?? WHITE);
  return relativeLuminance(composited) > LIGHT_THRESHOLD ? '#000000' : '#ffffff';
}

/** Opaque white — the assumed surface behind a translucent colour. */
const WHITE: ParsedColor = build(255, 255, 255, 1, 'name', 'white');

/**
 * Composites a translucent colour over an opaque one — the `source-over`
 * operation a browser performs when painting.
 *
 * @returns The visible result, always opaque when `backdrop` is.
 */
export function composite(color: ParsedColor, backdrop: ParsedColor): ParsedColor {
  const weight = color.a;
  const blend = (top: number, bottom: number): number =>
    channel(top * weight + bottom * (1 - weight));

  return build(
    blend(color.r, backdrop.r),
    blend(color.g, backdrop.g),
    blend(color.b, backdrop.b),
    backdrop.a,
    color.notation,
    color.source,
  );
}
