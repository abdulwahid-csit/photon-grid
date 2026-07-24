/**
 * The **Import Validator** — inspects a parsed {@link Workbook} (and the derived
 * header row) *before* any data reaches the grid, so problems are surfaced as
 * friendly, actionable messages instead of being silently swallowed or blowing
 * up mid-render.
 *
 * Validation is split into two phases so the pipeline can fail fast:
 * - {@link ImportValidator.validateWorkbook} — structural checks on the raw
 *   workbook (empty workbook, no data rows, ragged rows).
 * - {@link ImportValidator.validateHeaders} — header-level checks once the
 *   header row is known (blank headers, duplicate headers).
 *
 * Formula-level validation (malformed expressions, circular references) is
 * intentionally **not** re-implemented here: those are detected authoritatively
 * by the Formula Engine when the rows are registered (a bad formula stores as
 * `#ERROR!`, a cycle as `#CIRC!`). Duplicating that logic would violate the
 * single-source-of-truth rule.
 *
 * @packageDocumentation
 */

import {
  ImportValidationCode,
  ImportValidationSeverity,
  type ImportValidationIssue,
  type ImportValidationResult,
} from '../../../types/import.types';
import type { WorkbookSheet } from '../model/workbook';
import { ColumnMapper } from './column-mapper';

/** Stateless workbook / header validation. */
export class ImportValidator {
  /**
   * Combines a set of issues into a result, computing {@link ImportValidationResult.valid}.
   *
   * @param issues - All issues discovered across phases.
   * @returns The aggregated result.
   */
  static toResult(issues: readonly ImportValidationIssue[]): ImportValidationResult {
    const errors = issues.filter((i) => i.severity === ImportValidationSeverity.Error);
    const warnings = issues.filter((i) => i.severity === ImportValidationSeverity.Warning);
    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Structural validation of the chosen sheet.
   *
   * @param sheet          - The sheet to import, or `undefined` when the workbook was empty.
   * @param hasHeaderRow   - Whether the first row is a header row.
   * @returns The issues found (may be empty).
   */
  static validateWorkbook(sheet: WorkbookSheet | undefined, hasHeaderRow: boolean): ImportValidationIssue[] {
    const issues: ImportValidationIssue[] = [];

    if (!sheet) {
      issues.push({
        severity: ImportValidationSeverity.Error,
        code: ImportValidationCode.EmptyWorkbook,
        message: 'The file contains no sheets or is empty.',
      });
      return issues;
    }

    const rowCount = sheet.rows.length;
    const dataRowCount = hasHeaderRow ? rowCount - 1 : rowCount;
    if (rowCount === 0 || dataRowCount <= 0) {
      issues.push({
        severity: ImportValidationSeverity.Error,
        code: ImportValidationCode.NoDataRows,
        message: 'The file has no data rows to import.',
      });
      return issues;
    }

    // Ragged rows are tolerated (short rows are padded, long rows truncated to
    // the header width) but flagged so the user knows shape was irregular.
    const width = sheet.rows[0].cells.length;
    let ragged = false;
    for (let r = 1; r < sheet.rows.length; r++) {
      if (sheet.rows[r].cells.length !== width) {
        ragged = true;
        break;
      }
    }
    if (ragged) {
      issues.push({
        severity: ImportValidationSeverity.Warning,
        code: ImportValidationCode.RaggedRows,
        message: 'Some rows have a different number of columns; they were padded/truncated to match the header.',
      });
    }

    return issues;
  }

  /**
   * Header-level validation once the header row has been resolved.
   *
   * @param headers - The resolved header strings, in column order.
   * @returns The issues found (may be empty).
   */
  static validateHeaders(headers: readonly string[]): ImportValidationIssue[] {
    const issues: ImportValidationIssue[] = [];

    // Blank headers → warning (they are auto-named `Column N` downstream).
    headers.forEach((h, column) => {
      if (h.trim() === '') {
        issues.push({
          severity: ImportValidationSeverity.Warning,
          code: ImportValidationCode.MissingHeader,
          message: `Column ${column + 1} has no header; it was auto-named.`,
          location: { column },
        });
      }
    });

    // Duplicate headers (by normalized key) → warning; fields are disambiguated
    // downstream, but the user should know two source columns collided.
    const seen = new Map<string, number>();
    headers.forEach((h, column) => {
      const key = ColumnMapper.normalizeKey(h);
      if (key === '') return;
      const first = seen.get(key);
      if (first === undefined) {
        seen.set(key, column);
      } else {
        issues.push({
          severity: ImportValidationSeverity.Warning,
          code: ImportValidationCode.DuplicateHeader,
          message: `Duplicate header "${h}" (columns ${first + 1} and ${column + 1}); the second was renamed.`,
          location: { column },
        });
      }
    });

    return issues;
  }
}
