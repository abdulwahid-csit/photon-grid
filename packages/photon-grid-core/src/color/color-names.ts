/**
 * The CSS named-colour table.
 *
 * A static table rather than a `getComputedStyle` probe, for three reasons that
 * all matter to a grid: it works with no DOM at all (server-side rendering,
 * tests, a worker), it costs no layout read on the render path, and it gives the
 * same answer on every platform. Probing the DOM would mean a style write and a
 * computed-style read per distinct value — a forced synchronous style
 * recalculation in the middle of rendering a viewport, which is precisely the
 * cost `CLAUDE.md` rules out.
 *
 * Values are stored as bare six-digit hex — no `#`, lower case — because that is
 * the form {@link parseColor} consumes, and skipping the prefix keeps the table
 * a little under 3 KB in the bundle.
 *
 * @packageDocumentation
 */

/**
 * Every colour keyword in CSS Color Module Level 4, plus the `grey` spellings.
 *
 * `transparent` is deliberately absent: it is a keyword rather than a colour and
 * carries an alpha of zero, so {@link parseColor} handles it directly instead of
 * pretending it is opaque black.
 *
 * @see https://www.w3.org/TR/css-color-4/#named-colors
 */
const CSS_COLOR_NAMES: Readonly<Record<string, string>> = Object.freeze({
  aliceblue: 'f0f8ff',
  antiquewhite: 'faebd7',
  aqua: '00ffff',
  aquamarine: '7fffd4',
  azure: 'f0ffff',
  beige: 'f5f5dc',
  bisque: 'ffe4c4',
  black: '000000',
  blanchedalmond: 'ffebcd',
  blue: '0000ff',
  blueviolet: '8a2be2',
  brown: 'a52a2a',
  burlywood: 'deb887',
  cadetblue: '5f9ea0',
  chartreuse: '7fff00',
  chocolate: 'd2691e',
  coral: 'ff7f50',
  cornflowerblue: '6495ed',
  cornsilk: 'fff8dc',
  crimson: 'dc143c',
  cyan: '00ffff',
  darkblue: '00008b',
  darkcyan: '008b8b',
  darkgoldenrod: 'b8860b',
  darkgray: 'a9a9a9',
  darkgreen: '006400',
  darkgrey: 'a9a9a9',
  darkkhaki: 'bdb76b',
  darkmagenta: '8b008b',
  darkolivegreen: '556b2f',
  darkorange: 'ff8c00',
  darkorchid: '9932cc',
  darkred: '8b0000',
  darksalmon: 'e9967a',
  darkseagreen: '8fbc8f',
  darkslateblue: '483d8b',
  darkslategray: '2f4f4f',
  darkslategrey: '2f4f4f',
  darkturquoise: '00ced1',
  darkviolet: '9400d3',
  deeppink: 'ff1493',
  deepskyblue: '00bfff',
  dimgray: '696969',
  dimgrey: '696969',
  dodgerblue: '1e90ff',
  firebrick: 'b22222',
  floralwhite: 'fffaf0',
  forestgreen: '228b22',
  fuchsia: 'ff00ff',
  gainsboro: 'dcdcdc',
  ghostwhite: 'f8f8ff',
  gold: 'ffd700',
  goldenrod: 'daa520',
  gray: '808080',
  green: '008000',
  greenyellow: 'adff2f',
  grey: '808080',
  honeydew: 'f0fff0',
  hotpink: 'ff69b4',
  indianred: 'cd5c5c',
  indigo: '4b0082',
  ivory: 'fffff0',
  khaki: 'f0e68c',
  lavender: 'e6e6fa',
  lavenderblush: 'fff0f5',
  lawngreen: '7cfc00',
  lemonchiffon: 'fffacd',
  lightblue: 'add8e6',
  lightcoral: 'f08080',
  lightcyan: 'e0ffff',
  lightgoldenrodyellow: 'fafad2',
  lightgray: 'd3d3d3',
  lightgreen: '90ee90',
  lightgrey: 'd3d3d3',
  lightpink: 'ffb6c1',
  lightsalmon: 'ffa07a',
  lightseagreen: '20b2aa',
  lightskyblue: '87cefa',
  lightslategray: '778899',
  lightslategrey: '778899',
  lightsteelblue: 'b0c4de',
  lightyellow: 'ffffe0',
  lime: '00ff00',
  limegreen: '32cd32',
  linen: 'faf0e6',
  magenta: 'ff00ff',
  maroon: '800000',
  mediumaquamarine: '66cdaa',
  mediumblue: '0000cd',
  mediumorchid: 'ba55d3',
  mediumpurple: '9370db',
  mediumseagreen: '3cb371',
  mediumslateblue: '7b68ee',
  mediumspringgreen: '00fa9a',
  mediumturquoise: '48d1cc',
  mediumvioletred: 'c71585',
  midnightblue: '191970',
  mintcream: 'f5fffa',
  mistyrose: 'ffe4e1',
  moccasin: 'ffe4b5',
  navajowhite: 'ffdead',
  navy: '000080',
  oldlace: 'fdf5e6',
  olive: '808000',
  olivedrab: '6b8e23',
  orange: 'ffa500',
  orangered: 'ff4500',
  orchid: 'da70d6',
  palegoldenrod: 'eee8aa',
  palegreen: '98fb98',
  paleturquoise: 'afeeee',
  palevioletred: 'db7093',
  papayawhip: 'ffefd5',
  peachpuff: 'ffdab9',
  peru: 'cd853f',
  pink: 'ffc0cb',
  plum: 'dda0dd',
  powderblue: 'b0e0e6',
  purple: '800080',
  rebeccapurple: '663399',
  red: 'ff0000',
  rosybrown: 'bc8f8f',
  royalblue: '4169e1',
  saddlebrown: '8b4513',
  salmon: 'fa8072',
  sandybrown: 'f4a460',
  seagreen: '2e8b57',
  seashell: 'fff5ee',
  sienna: 'a0522d',
  silver: 'c0c0c0',
  skyblue: '87ceeb',
  slateblue: '6a5acd',
  slategray: '708090',
  slategrey: '708090',
  snow: 'fffafa',
  springgreen: '00ff7f',
  steelblue: '4682b4',
  tan: 'd2b48c',
  teal: '008080',
  thistle: 'd8bfd8',
  tomato: 'ff6347',
  turquoise: '40e0d0',
  violet: 'ee82ee',
  wheat: 'f5deb3',
  white: 'ffffff',
  whitesmoke: 'f5f5f5',
  yellow: 'ffff00',
  yellowgreen: '9acd32',
});

/**
 * Reverse index, built on first use by {@link nameForHex}.
 *
 * Lazy because the forward direction is the common one — a grid *reads* colour
 * values far more often than it labels them — and an application that never asks
 * for a name never pays for the index. `null` until built, matching the country
 * registry's lazy-index pattern.
 */
let hexToName: Map<string, string> | null = null;

/**
 * The hex digits for a CSS colour keyword, or `undefined` when the name is not
 * one.
 *
 * @param name - A colour keyword. Matched case-insensitively, since `Red`,
 *   `RED` and `red` are the same colour to CSS and all three turn up in real
 *   data.
 * @returns Six lower-case hex digits, without a leading `#`.
 */
export function hexForName(name: string): string | undefined {
  return CSS_COLOR_NAMES[name.toLowerCase()];
}

/**
 * The CSS keyword for a colour, or `undefined` when it has no name.
 *
 * The inverse is one-to-many — `#00ffff` is both `aqua` and `cyan`, `#808080`
 * both `gray` and `grey` — and this answers with whichever the table lists
 * first, so the result is stable rather than merely arbitrary. The `gray`
 * spellings precede the `grey` ones in the table, which makes the American
 * spelling the canonical answer, matching the CSS specification's own ordering.
 *
 * @param hex - Six hex digits, with or without a leading `#`. Case-insensitive.
 * @returns The keyword, or `undefined` when no named colour has that value.
 */
export function nameForHex(hex: string): string | undefined {
  if (!hexToName) {
    hexToName = new Map<string, string>();
    for (const [name, digits] of Object.entries(CSS_COLOR_NAMES)) {
      // First writer wins, so the table's order decides the canonical spelling.
      if (!hexToName.has(digits)) hexToName.set(digits, name);
    }
  }
  const key = (hex.startsWith('#') ? hex.slice(1) : hex).toLowerCase();
  return hexToName.get(key);
}

/** `true` when `name` is a CSS colour keyword. Case-insensitive. */
export function isColorName(name: string): boolean {
  return hexForName(name) !== undefined;
}

/**
 * Every supported colour keyword, lower case, in specification order.
 *
 * The list a colour picker's "named colours" palette or a column filter's
 * autocomplete would be built from.
 */
export function colorNames(): readonly string[] {
  return Object.keys(CSS_COLOR_NAMES);
}
