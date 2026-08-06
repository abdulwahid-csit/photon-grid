/**
 * Colour support: parsing, formatting, naming and contrast.
 *
 * A framework-agnostic leaf module — it imports nothing from the grid and holds
 * no DOM references, so the `color` cell renderer, the colour editor and
 * application code can all share one definition of what a colour value means.
 *
 * @packageDocumentation
 */

export type { ColorNotation, ParsedColor } from './color-parser';
export {
  clearColorParseCache,
  composite,
  contrastColor,
  formatColor,
  isColor,
  parseColor,
  relativeLuminance,
  toHsl,
} from './color-parser';
export { colorNames, hexForName, isColorName, nameForHex } from './color-names';
