import type {
  BuiltInRenderContext,
  BuiltInRendererDefinition,
  CurrencyRendererOptions,
  NumericRendererOptions,
  PercentageRendererOptions,
} from '../../types/built-in-renderer.types';
import { renderIfEmpty, renderText, toNumber } from './shared';

/** Fallback locale, matching `formatValue`'s. */
const DEFAULT_LOCALE = 'en-US';

/**
 * Formats a number for display, honouring the column's and the grid's locale.
 *
 * @param ctx - Render context, for the grid-level `locale`.
 * @param n - The number to format.
 * @param min - Minimum fraction digits.
 * @param max - Maximum fraction digits.
 */
function localeNumber(
  ctx: BuiltInRenderContext,
  n: number,
  min: number,
  max: number,
): string {
  const opts = ctx.options as NumericRendererOptions;
  return n.toLocaleString(opts.locale ?? ctx.locale ?? DEFAULT_LOCALE, {
    minimumFractionDigits: opts.minimumFractionDigits ?? min,
    maximumFractionDigits: opts.maximumFractionDigits ?? max,
  });
}

/**
 * A number that is not numeric is shown verbatim rather than as `NaN`.
 *
 * Real datasets contain `'N/A'` and `'—'` in numeric columns; rendering those
 * as `NaN` loses information the user put there deliberately.
 */
function renderNonNumeric(ctx: BuiltInRenderContext): void {
  renderText(ctx, ctx.formattedValue);
}

/** Locale-formatted number. Matches `formatValue`'s number branch. */
export const numberRenderer: BuiltInRendererDefinition = {
  name: 'number',
  textOnly: true,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const n = toNumber(ctx.value);
    if (n === null) return renderNonNumeric(ctx);
    renderText(ctx, localeNumber(ctx, n, 0, 2));
  },
};

/**
 * Currency-formatted number.
 *
 * The symbol comes from the renderer options, then `GridOptions.currencySymbol`,
 * then `$` — the same chain `formatValue` uses, so switching a column to this
 * renderer does not change what it shows.
 */
export const currencyRenderer: BuiltInRendererDefinition = {
  name: 'currency',
  textOnly: true,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const n = toNumber(ctx.value);
    if (n === null) return renderNonNumeric(ctx);
    const opts = ctx.options as CurrencyRendererOptions;
    const symbol = opts.symbol ?? ctx.currencySymbol ?? '$';
    renderText(ctx, `${symbol}${localeNumber(ctx, n, 2, 2)}`);
  },
};

/**
 * Percentage-formatted number.
 *
 * This is genuinely new behaviour rather than a port: `formatValue` has never
 * had a `percentage` case, so those columns fell through to its default branch
 * and rendered a capitalised raw string.
 *
 * `scale` decides how the stored number maps to a percentage — `'value'` (the
 * default) treats `42` as `42%`, `'ratio'` treats `0.42` as `42%`. The default
 * is `'value'` because that is what the grid's existing `percentage` columns
 * store; `'ratio'` is the spreadsheet convention and has to be opted into.
 */
export const percentageRenderer: BuiltInRendererDefinition = {
  name: 'percentage',
  textOnly: true,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const n = toNumber(ctx.value);
    if (n === null) return renderNonNumeric(ctx);
    const opts = ctx.options as PercentageRendererOptions;
    const scaled = opts.scale === 'ratio' ? n * 100 : n;
    renderText(ctx, `${localeNumber(ctx, scaled, 0, 2)}%`);
  },
};
