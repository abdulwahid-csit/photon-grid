import type { ColumnDef } from '../../types/column.types';

export function parseValue(raw: unknown, col: ColumnDef): unknown {
  if (raw === null || raw === undefined || raw === '') {
    return col.required ? null : null;
  }

  switch (col.type) {
    case 'number':
    case 'currency': {
      const n = Number(raw);
      return isNaN(n) ? null : n;
    }
    case 'boolean':
      if (typeof raw === 'boolean') return raw;
      if (typeof raw === 'string') return raw.toLowerCase() === 'true' || raw === '1';
      return Boolean(raw);
    case 'date':
    case 'time': {
      const d = new Date(raw as string);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }
    case 'array':
      return Array.isArray(raw) ? raw : [raw];
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
    case 'date': {
      const d = new Date(value as string);
      if (isNaN(d.getTime())) return String(value);
      return formatDate(d, options?.dateFormat ?? 'dd/MM/yyyy', options?.timeZone);
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
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'array':
      return Array.isArray(value) ? value.join(', ') : String(value);
    case 'dropdown': {
      const opt = col.dropdownOptions?.find((o) => String(o.value) === String(value));
      return opt ? opt.label : String(value);
    }
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
  if (col.type === 'number' || col.type === 'currency') {
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

function formatDate(date: Date, format: string, timeZone?: string): string {
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
