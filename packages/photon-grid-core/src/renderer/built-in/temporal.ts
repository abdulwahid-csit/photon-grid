import type {
  BuiltInRenderContext,
  BuiltInRendererDefinition,
  DateRendererOptions,
  DurationRendererOptions,
} from '../../types/built-in-renderer.types';
import { formatDate } from '../../engines/editing/value-parser';
import { renderIfEmpty, renderText, toNumber } from './shared';

/** Matches `formatValue`'s date default, so switching renderers changes nothing. */
const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';
const DEFAULT_DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';

/**
 * Parses a cell value into a `Date`.
 *
 * Accepts a `Date`, an epoch number, or anything `Date` can parse. Returns
 * `null` for values that are not dates, so the caller can show the original
 * text rather than `Invalid Date`.
 */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Shared body for `date` and `datetime`.
 *
 * Format precedence: renderer option → `ColumnDef.dateFormat` → the built-in
 * default. Time zone: renderer option → `GridOptions.timeZone`.
 */
function renderDateLike(ctx: BuiltInRenderContext, fallbackFormat: string): void {
  if (renderIfEmpty(ctx)) return;
  const d = toDate(ctx.value);
  // Not a date — show whatever the author put in the cell instead of a
  // meaningless "Invalid Date".
  if (!d) return renderText(ctx, ctx.formattedValue);

  const opts = ctx.options as DateRendererOptions;
  const format = opts.format ?? ctx.colDef.dateFormat ?? ctx.dateFormat ?? fallbackFormat;
  renderText(ctx, formatDate(d, format, opts.timeZone ?? ctx.timeZone));
}

/** Formatted date. */
export const dateRenderer: BuiltInRendererDefinition = {
  name: 'date',
  textOnly: true,
  render: (ctx) => renderDateLike(ctx, DEFAULT_DATE_FORMAT),
};

/** Formatted date and time. */
export const datetimeRenderer: BuiltInRendererDefinition = {
  name: 'datetime',
  textOnly: true,
  render: (ctx) => renderDateLike(ctx, DEFAULT_DATETIME_FORMAT),
};

/**
 * Formatted time of day.
 *
 * Uses `toLocaleTimeString` rather than the token formatter so 12-/24-hour
 * choice follows the locale — which is what `formatValue`'s `time` branch
 * already does.
 */
export const timeRenderer: BuiltInRendererDefinition = {
  name: 'time',
  textOnly: true,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const opts = ctx.options as DateRendererOptions;

    // A bare "HH:mm" string is not parseable as a Date on its own; the token
    // formatter handles it only if it round-trips, so fall back to showing it
    // verbatim, which is already the correct display for a time-only string.
    const d = toDate(ctx.value);
    if (!d) return renderText(ctx, ctx.formattedValue);

    if (opts.format) {
      return renderText(ctx, formatDate(d, opts.format, opts.timeZone ?? ctx.timeZone));
    }
    renderText(
      ctx,
      d.toLocaleTimeString(opts.locale ?? ctx.locale ?? 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: opts.timeZone ?? ctx.timeZone,
      }),
    );
  },
};

/** Multipliers converting each supported input unit to seconds. */
const UNIT_SECONDS: Record<NonNullable<DurationRendererOptions['unit']>, number> = {
  ms: 1 / 1000,
  s: 1,
  m: 60,
};

/**
 * An elapsed span of time.
 *
 * `'short'` (the default) reads as `2h 15m` — the two most significant
 * non-zero units, which is what makes a column of durations scannable. `'clock'`
 * gives `02:15:00` for cases where exact alignment matters more.
 */
export const durationRenderer: BuiltInRendererDefinition = {
  name: 'duration',
  textOnly: true,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const raw = toNumber(ctx.value);
    if (raw === null) return renderText(ctx, ctx.formattedValue);

    const opts = ctx.options as DurationRendererOptions;
    const totalSeconds = Math.abs(raw * UNIT_SECONDS[opts.unit ?? 's']);
    const sign = raw < 0 ? '-' : '';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    if (opts.style === 'clock') {
      const pad = (n: number): string => String(n).padStart(2, '0');
      return renderText(ctx, `${sign}${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    }

    // Two units is the sweet spot: "2h 15m" is precise enough to act on and
    // short enough to scan. A third ("2h 15m 3s") is noise at this scale.
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (parts.length < 2 && (seconds > 0 || parts.length === 0)) parts.push(`${seconds}s`);
    renderText(ctx, sign + parts.slice(0, 2).join(' '));
  },
};
