/**
 * The **Column Mapper** — reconciles imported headers with the grid's columns.
 *
 * Two responsibilities, both pure:
 * 1. **Field synthesis** — turn an arbitrary header (`"Unit Price"`, `"Qty."`)
 *    into a safe, stable `field` key (`unitPrice`, `qty`) when the import
 *    defines new columns.
 * 2. **Auto-mapping** — match imported headers onto an *existing* column schema
 *    (for append / map-onto-existing imports) by normalized header, then by
 *    field, so `"Qty"` maps to a `quantity` column when a session mapping says
 *    so, or to a `qty` field directly.
 *
 * The mapper holds no state; per-session mapping memory lives on the
 * {@link import('../import-engine').ImportEngine} and is passed in, so a mapping
 * a user confirmed once is reused across imports in the same session. The
 * `remembered` override is also the seam a future interactive mapping dialog
 * plugs into.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../../../types/column.types';
import type { ImportMapping } from '../../../types/import.types';

/** Stateless header ↔ field reconciliation. */
export class ColumnMapper {
  /**
   * Normalizes a header/field to a comparison key: lower-cased, alphanumeric
   * only. `"Unit Price"`, `"unit_price"` and `"unitPrice"` all collapse to
   * `unitprice`, so equivalent headers match regardless of punctuation/case.
   *
   * @param value - Any header or field string.
   * @returns The normalized comparison key.
   */
  static normalizeKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  /**
   * Derives a safe camelCase `field` name from a header. Falls back to
   * `column<oneBasedIndex>` for blank/symbol-only headers.
   *
   * @param header - The imported header text.
   * @param index  - 0-based column index (for the fallback name).
   * @returns A field key safe for dot-free property access.
   */
  static toFieldName(header: string, index: number): string {
    const cleaned = header.trim();
    if (cleaned === '') return `column${index + 1}`;

    const parts = cleaned.split(/[^a-zA-Z0-9]+/).filter(Boolean);
    if (parts.length === 0) return `column${index + 1}`;

    const camel = parts
      .map((raw, i) => {
        // Fully-uppercase parts (`TOTAL`, `ID`) lowercase cleanly instead of
        // producing `tOTAL`; mixed-case parts keep their casing.
        const p = /^[A-Z0-9]+$/.test(raw) ? raw.toLowerCase() : raw;
        return i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1);
      })
      .join('');

    // A leading digit is not a valid identifier start for clean field access.
    return /^[0-9]/.test(camel) ? `column${index + 1}` : camel;
  }

  /**
   * Generates distinct field names for a set of headers, disambiguating
   * collisions with a numeric suffix (`total`, `total2`, …).
   *
   * @param headers - Imported headers in column order.
   * @returns A field name per header, parallel to `headers`.
   */
  static synthesizeFields(headers: readonly string[]): string[] {
    const seen = new Map<string, number>();
    const fields: string[] = new Array(headers.length);
    for (let i = 0; i < headers.length; i++) {
      let field = ColumnMapper.toFieldName(headers[i], i);
      const count = seen.get(field) ?? 0;
      seen.set(field, count + 1);
      if (count > 0) field = `${field}${count + 1}`;
      fields[i] = field;
    }
    return fields;
  }

  /**
   * Auto-maps imported headers onto an existing column schema.
   *
   * Resolution order per header:
   * 1. an explicit `remembered` mapping (session memory / dialog override);
   * 2. a column whose normalized `header` matches;
   * 3. a column whose normalized `field` matches.
   *
   * Unmatched headers are reported in {@link ImportMapping.unmapped}.
   *
   * @param headers    - Imported headers in column order.
   * @param columns    - The grid's existing leaf columns.
   * @param remembered - Optional prior header → field overrides.
   * @returns The resolved mapping.
   */
  static autoMap(
    headers: readonly string[],
    columns: readonly ColumnDef[],
    remembered?: Readonly<Record<string, string>>,
  ): ImportMapping {
    const byHeaderKey = new Map<string, string>();
    const byFieldKey = new Map<string, string>();
    const fieldSet = new Set<string>();
    for (const col of columns) {
      byHeaderKey.set(ColumnMapper.normalizeKey(col.header), col.field);
      byFieldKey.set(ColumnMapper.normalizeKey(col.field), col.field);
      fieldSet.add(col.field);
    }

    const headerToField: Record<string, string> = {};
    const unmapped: string[] = [];

    for (const header of headers) {
      const overridden = remembered?.[header];
      if (overridden && fieldSet.has(overridden)) {
        headerToField[header] = overridden;
        continue;
      }
      const key = ColumnMapper.normalizeKey(header);
      const matched = byHeaderKey.get(key) ?? byFieldKey.get(key);
      if (matched) {
        headerToField[header] = matched;
      } else {
        unmapped.push(header);
      }
    }

    return { headerToField, unmapped };
  }
}
