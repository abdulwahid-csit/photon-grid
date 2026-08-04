import type { ColumnDef } from '../../types/column.types';

export function parseValue(raw: unknown, col: ColumnDef): unknown {
  if (raw === null || raw === undefined || raw === '') {
    return col.required ? null : null;
  }

  switch (col.type) {
    case 'number':
    case 'currency':
    case 'percentage':
    // Stored as a plain number of seconds so it sorts, filters and aggregates
    // like any other measure. The `duration` renderer owns the presentation.
    case 'duration': {
      const n = Number(raw);
      return isNaN(n) ? null : n;
    }
    case 'boolean':
      if (typeof raw === 'boolean') return raw;
      if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw === '1';
      return Boolean(raw);
    case 'date':
    case 'datetime':
    case 'time': {
      const d = new Date(raw as string);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    case 'array':
      return Array.isArray(raw) ? raw : [raw];
    // Listed rather than left to `default` so the intent is on the record:
    // these are strings, and a future change to `default` must not silently
    // start coercing them.
    case 'phone':
    case 'url':
    case 'email':
    default:
      return String(raw);
  }
}

export function formatValue(value: unknown, col: ColumnDef, options?: FormatOptions): string {
  if (value === null || value === undefined) return '';

  switch (col.type) {
    case 'number': {
      const n = Number(value);
      if (isNaN(n)) return String(value);
      const locale = options?.locale ?? 'en-US';
      return n.toLocaleString(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
    case 'currency': {
      const n = Number(value);
      if (isNaN(n)) return String(value);
      const symbol = options?.currencySymbol ?? '$';
      return `${symbol}${n.toLocaleString(options?.locale ?? 'en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    // Previously absent, so percentage columns fell to `default:` and rendered
    // a capitalised raw string. Scale is `'value'` (42 → "42%") to match how
    // the grid's percentage columns already store their data.
    case 'percentage': {
      const n = Number(value);
      if (isNaN(n)) return String(value);
      return `${n.toLocaleString(options?.locale ?? 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}%`;
    }
    case 'date': {
      const d = new Date(value as string);
      if (isNaN(d.getTime())) return String(value);
      return formatDate(d, options?.dateFormat ?? 'dd/MM/yyyy', options?.timeZone);
    }
    case 'datetime': {
      const d = new Date(value as string);
      if (isNaN(d.getTime())) return String(value);
      return formatDate(d, options?.dateFormat ?? 'dd/MM/yyyy HH:mm', options?.timeZone);
    }
    case 'time': {
      const d = new Date(value as string);
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleTimeString(options?.locale ?? 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: options?.timeZone,
      });
    }
    // Seconds → the same "2h 15m" shape the `duration` renderer draws, so a
    // duration reads identically on screen, in an export and on the clipboard.
    case 'duration': {
      const n = Number(value);
      if (isNaN(n)) return String(value);
      const total = Math.abs(n);
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = Math.floor(total % 60);
      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      if (parts.length < 2 && (seconds > 0 || parts.length === 0)) parts.push(`${seconds}s`);
      return (n < 0 ? '-' : '') + parts.slice(0, 2).join(' ');
    }
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'array':
      return Array.isArray(value) ? value.join(', ') : String(value);
    case 'dropdown': {
      const opt = col.dropdownOptions?.find((o) => String(o.value) === String(value));
      return opt ? opt.label : String(value);
    }
    // Verbatim. Title-casing a URL would turn `https://x` into `Https://x`,
    // and an email address is not a sentence either.
    case 'url':
    case 'phone':
    case 'email':
      return String(value);
    default: {
      const str = String(value);
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  }
}

export function validateValue(value: unknown, col: ColumnDef): string | null {
  if (col.required && (value === null || value === undefined || value === '')) {
    return `${col.header} is required`;
  }
  if (col.type === 'number' || col.type === 'currency' || col.type === 'percentage' || col.type === 'duration') {
    const n = Number(value);
    if (value !== null && value !== undefined && value !== '' && isNaN(n)) {
      return `${col.header} must be a number`;
    }
    if (!isNaN(n)) {
      if (col.min !== undefined && col.min !== null && n < col.min) {
        return `${col.header} must be at least ${col.min}`;
      }
      if (col.max !== undefined && col.max !== null && n > col.max) {
        return `${col.header} must be at most ${col.max}`;
      }
    }
  }
  if (col.type === 'email' && value) {
    const emailRe = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRe.test(String(value))) {
      return `${col.header} must be a valid email address`;
    }
  }
  if (col.validatorFn) {
    return col.validatorFn(value);
  }
  return null;
}

/**
 * Renders a date through a token format string (`yyyy MM dd HH mm ss`).
 *
 * Exported so the built-in `date`/`datetime`/`time` renderers format exactly
 * the way `formatValue` does instead of growing a second, subtly different
 * implementation.
 *
 * @param date - The date to format.
 * @param format - Token string, e.g. `'dd/MM/yyyy HH:mm'`.
 * @param timeZone - IANA zone the date is shifted into before its parts are read.
 */
export function formatDate(date: Date, format: string, timeZone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {};
  if (timeZone) opts.timeZone = timeZone;

  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date(date.toLocaleString('en-US', opts));

  return format
    .replace('yyyy', String(d.getFullYear()))
    .replace('MM', pad(d.getMonth() + 1))
    .replace('dd', pad(d.getDate()))
    .replace('HH', pad(d.getHours()))
    .replace('mm', pad(d.getMinutes()))
    .replace('ss', pad(d.getSeconds()));
}

export interface FormatOptions {
  locale?: string;
  dateFormat?: string;
  timeZone?: string;
  currencySymbol?: string;
  currencyFormat?: string;
}
