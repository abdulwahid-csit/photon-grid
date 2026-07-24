import { describe, it, expect } from 'vitest';
import { ImportValidator } from '../../src/engines/import/services/import-validator';
import { ImportValidationCode, ImportValidationSeverity } from '../../src/types/import.types';
import { matrixToWorkbook } from '../../src/engines/import/model/workbook';

describe('ImportValidator.validateWorkbook', () => {
  it('errors on a missing sheet', () => {
    const issues = ImportValidator.validateWorkbook(undefined, true);
    expect(issues[0].code).toBe(ImportValidationCode.EmptyWorkbook);
    expect(issues[0].severity).toBe(ImportValidationSeverity.Error);
  });

  it('errors when there are no data rows (header only)', () => {
    const wb = matrixToWorkbook([['a', 'b']], 'S');
    const issues = ImportValidator.validateWorkbook(wb.sheets[0], true);
    expect(issues.some((i) => i.code === ImportValidationCode.NoDataRows)).toBe(true);
  });

  it('warns on ragged rows', () => {
    const wb = matrixToWorkbook(
      [
        ['a', 'b'],
        ['1', '2'],
        ['3'],
      ],
      'S',
    );
    const issues = ImportValidator.validateWorkbook(wb.sheets[0], true);
    const ragged = issues.find((i) => i.code === ImportValidationCode.RaggedRows);
    expect(ragged?.severity).toBe(ImportValidationSeverity.Warning);
  });
});

describe('ImportValidator.validateHeaders', () => {
  it('warns on blank headers', () => {
    const issues = ImportValidator.validateHeaders(['a', '', 'c']);
    expect(issues.some((i) => i.code === ImportValidationCode.MissingHeader)).toBe(true);
  });

  it('warns on duplicate headers', () => {
    const issues = ImportValidator.validateHeaders(['Name', 'name']);
    const dup = issues.find((i) => i.code === ImportValidationCode.DuplicateHeader);
    expect(dup).toBeDefined();
    expect(dup?.severity).toBe(ImportValidationSeverity.Warning);
  });
});

describe('ImportValidator.toResult', () => {
  it('is valid only when there are no errors', () => {
    const err = {
      severity: ImportValidationSeverity.Error,
      code: ImportValidationCode.EmptyWorkbook,
      message: 'x',
    };
    const warn = {
      severity: ImportValidationSeverity.Warning,
      code: ImportValidationCode.MissingHeader,
      message: 'y',
    };
    expect(ImportValidator.toResult([warn]).valid).toBe(true);
    expect(ImportValidator.toResult([err, warn]).valid).toBe(false);
    expect(ImportValidator.toResult([err, warn]).warnings).toHaveLength(1);
  });
});
