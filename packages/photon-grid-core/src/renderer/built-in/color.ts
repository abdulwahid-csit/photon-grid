import type {
  BuiltInRendererDefinition,
  ColorRendererOptions,
  ColorTextFormat,
} from '../../types/built-in-renderer.types';
import type { ParsedColor } from '../../color';
import { contrastColor, formatColor, parseColor } from '../../color';
import { renderIfEmpty, valueSpan } from './shared';

/**
 * The `color` cell renderer — a cell that shows the colour it holds.
 *
 * @packageDocumentation
 */

/** Swatch size when the column names none. Matches the cell's text cap-height. */
const DEFAULT_SWATCH_SIZE = 14;

/**
 * Marks which of the two shapes a rendered cell is in, so {@link patchColor}
 * can tell a patchable cell from one that has to be rebuilt.
 *
 * A colour that stops parsing (or starts) changes the cell's structure — swatch
 * and text, versus the fallback's single text node — and patching across that
 * boundary would leave a swatch painted with the previous row's colour.
 */
const STATE_ATTRIBUTE = 'data-pg-color';

/** The cell holds a parsed colour: swatch and/or text. */
const STATE_PARSED = 'parsed';

/** The value is not a colour; the cell holds fallback text only. */
const STATE_FALLBACK = 'raw';

/** Custom property the CSS paints the swatch and the filled pill from. */
const COLOR_PROPERTY = '--pg-cell-color';

/** Custom property holding the readable text colour for the filled variant. */
const CONTRAST_PROPERTY = '--pg-cell-color-contrast';

/** Custom property driving the swatch's dimensions. */
const SIZE_PROPERTY = '--pg-cell-swatch-size';

/**
 * The text a colour cell displays, for one resolved colour.
 *
 * Shared by {@link colorRenderer.render} and {@link colorRenderer.toText} so
 * what the user sees, what they copy and what they filter on can never disagree.
 *
 * @param color - The parsed colour.
 * @param format - The column's `textFormat`.
 * @returns The display text; `''` for `'none'`, which draws no label.
 */
function displayText(color: ParsedColor, format: ColorTextFormat | undefined): string {
  switch (format) {
    case 'none':
      return '';
    case 'hex':
      return formatColor(color, 'hex');
    case 'rgb':
      return formatColor(color, 'rgb');
    case 'hsl':
      return formatColor(color, 'hsl');
    case 'name':
      return formatColor(color, 'name');
    case 'value':
    default:
      // What the row actually stores. A column fed `hsl()` values should not
      // appear to hold hex codes.
      return color.source;
  }
}

/** Writes the three custom properties the colour CSS reads. */
function applyColor(root: HTMLElement, color: ParsedColor, options: ColorRendererOptions): void {
  root.style.setProperty(COLOR_PROPERTY, color.css);
  root.style.setProperty(SIZE_PROPERTY, `${options.size ?? DEFAULT_SWATCH_SIZE}px`);
  // Only the filled variant paints text on the colour, so the contrast probe —
  // the one non-trivial calculation here — is skipped entirely for the default.
  if (options.variant === 'fill') {
    root.style.setProperty(CONTRAST_PROPERTY, contrastColor(color));
  }
}

/** Builds the swatch element. Decorative unless it is the cell's only content. */
function buildSwatch(color: ParsedColor, options: ColorRendererOptions): HTMLElement {
  const swatch = document.createElement('span');
  let className = `pg-cell-color__swatch pg-cell-color__swatch--${options.shape ?? 'rounded'}`;
  // The checkerboard is what distinguishes a translucent colour from a pale
  // one, and is pure cost on an opaque colour, so it is attached per value.
  if (color.a < 1 && options.showAlpha !== false) className += ' pg-cell-color__swatch--alpha';
  swatch.className = className;
  swatch.setAttribute('aria-hidden', 'true');
  return swatch;
}

/**
 * Renders the fallback for a value that is not a colour.
 *
 * Never an empty cell: an unparseable value is still information — a typo, an
 * `oklch()` the parser does not cover, a status word in a colour column — and
 * hiding it makes the data harder to fix, not tidier.
 */
function renderFallback(
  inner: HTMLElement,
  value: unknown,
  formattedValue: string,
  options: ColorRendererOptions,
): void {
  const span = valueSpan('color', options.cssClass);
  span.setAttribute(STATE_ATTRIBUTE, STATE_FALLBACK);

  if (typeof options.fallback === 'function') {
    const out = options.fallback(value);
    if (typeof out === 'string') span.innerHTML = out;
    else span.appendChild(out);
  } else {
    const text = options.fallback ?? formattedValue;
    span.textContent = text;
    span.title = text;
  }
  inner.appendChild(span);
}

/**
 * A colour value, drawn as the colour it is.
 *
 * Accepts every notation CSS does — `#f00`, `#ff0000`, `#ff0000cc`,
 * `rgb(255 0 0)`, `rgba(255, 0, 0, .5)`, `hsl(0deg 100% 50%)`, and the colour
 * keywords such as `red` and `rebeccapurple` — and resolves all of them through
 * the shared colour parser, so a column whose API mixes forms still renders one
 * consistent set of swatches. Parsing is memoised per distinct value, so a
 * column of a million rows drawn from twenty colours performs twenty parses.
 *
 * ### Editing
 * The colour itself is never a control: making the swatch clickable would put a
 * hit target in every row of a column the user is trying to scroll, and it would
 * fight the grid's own selection model. Instead an editable colour column
 * behaves exactly like every other editable column — focus the cell, press
 * `Enter`, and the colour editor opens with a native swatch that raises the
 * platform's colour picker when clicked. A `type: 'color'` column gets that
 * editor with no configuration; see `DEFAULT_EDITOR_BY_TYPE`.
 *
 * ### Themeability
 * The colour reaches the DOM as the `--pg-cell-color` custom property rather
 * than as an inline `background`, which keeps the whole cell restyleable from a
 * theme and makes {@link colorRenderer.patch} a two-property write — cheap
 * enough for a column fed by a live feed.
 */
export const colorRenderer: BuiltInRendererDefinition<ColorRendererOptions> = {
  name: 'color',
  textOnly: false,

  /**
   * The colour as text.
   *
   * `'value'` needs no answer — the cell shows what the row stores, which is
   * what the caller would have formatted anyway — so it returns `null` and the
   * clipboard and filters keep their own formatting. Every normalising format
   * does answer, so filtering a column displayed as hex matches on the hex the
   * user can see rather than on the `hsl()` behind it.
   *
   * A swatch-only column (`textFormat: 'none'`) reports its hex: the cell shows
   * no text, but "nothing" is not a useful thing to copy or filter by.
   */
  toText(value, options) {
    const color = parseColor(value);
    // Unparseable — the cell falls back to the raw text, so the caller should
    // too rather than being handed an empty string.
    if (!color) return null;

    const format = options.textFormat ?? 'value';
    if (format === 'value') return null;
    if (format === 'none') return formatColor(color, 'hex');
    return displayText(color, format);
  },

  render(ctx) {
    if (renderIfEmpty(ctx)) return;

    const { options } = ctx;
    const color = parseColor(ctx.value);
    if (!color) {
      renderFallback(ctx.inner, ctx.value, ctx.formattedValue, options);
      return;
    }

    const fill = options.variant === 'fill';
    const span = valueSpan('color', options.cssClass);
    span.classList.add(fill ? 'pg-cell-color--fill' : 'pg-cell-color--swatch');
    span.setAttribute(STATE_ATTRIBUTE, STATE_PARSED);
    applyColor(span, color, options);

    // The filled variant *is* the swatch, so a separate one would be redundant.
    if (!fill && options.showSwatch !== false) {
      span.appendChild(buildSwatch(color, options));
    }

    const text = displayText(color, options.textFormat);
    // The filled pill always carries its label element, even when empty: it is
    // the element painted with the colour, so dropping it would leave nothing
    // to see.
    if (fill || text !== '') {
      const label = document.createElement('span');
      label.className = 'pg-cell-color__text';
      label.textContent = text;
      span.appendChild(label);
    }

    // Hex regardless of what is displayed — an `hsl()` column is only scannable
    // if hovering gives you the code you would paste elsewhere.
    if (options.tooltip !== false) span.title = color.hex;

    // With no visible text the swatch is the cell's whole content, so it has to
    // carry the accessible name the label would otherwise have provided.
    if (text === '' && !fill) {
      span.setAttribute('role', 'img');
      span.setAttribute('aria-label', color.hex);
    }

    ctx.inner.appendChild(span);
  },

  /**
   * Repaints an existing cell rather than rebuilding it.
   *
   * Refuses — by returning `false`, which takes the caller's rebuild path — when
   * the cell is in the other structural state, since swatch-and-text and
   * fallback-text are different DOM.
   */
  patch(cellEl, ctx) {
    const span = cellEl.querySelector<HTMLElement>('.pg-cell__value--color');
    if (!span) return false;

    const { options } = ctx;
    const color = parseColor(ctx.value);
    const state = span.getAttribute(STATE_ATTRIBUTE);
    if (state !== (color ? STATE_PARSED : STATE_FALLBACK)) return false;
    if (!color) return false; // Fallback text may be author-built markup; rebuild it.

    applyColor(span, color, options);

    const swatch = span.querySelector<HTMLElement>('.pg-cell-color__swatch');
    if (swatch) {
      swatch.classList.toggle(
        'pg-cell-color__swatch--alpha',
        color.a < 1 && options.showAlpha !== false,
      );
    }

    const label = span.querySelector<HTMLElement>('.pg-cell-color__text');
    const text = displayText(color, options.textFormat);
    if (label) label.textContent = text;
    else if (text !== '') return false; // Went from label-less to labelled.

    if (options.tooltip !== false) span.title = color.hex;
    if (span.hasAttribute('aria-label')) span.setAttribute('aria-label', color.hex);
    return true;
  },
};
