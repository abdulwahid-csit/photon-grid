/**
 * The **Import Pipeline** — the single, source-agnostic sequence every import
 * flows through once its data has been normalized into a {@link Workbook}.
 * Whether the bytes came from Excel, CSV, TSV or the clipboard, they converge
 * here so validation, mapping, type detection and formula discovery happen in
 * exactly one place (no importer may bypass it).
 *
 * The pipeline is **pure**: it turns a {@link Workbook} into an
 * {@link ImportResult} and reports progress through an injected emitter, but it
 * never touches the grid. Applying the result to the grid (choosing
 * replace/append/insert and calling the public seams) is the
 * {@link import('./import-engine').ImportEngine}'s job — keeping this stage
 * trivially unit-testable with no DOM.
 *
 * @packageDocumentation
 */

import {
  ImportStage,
  ImportValidationSeverity,
  type ImportMode,
  type ImportResult,
  type ImportSourceType,
  type ImportValidationIssue,
} from '../../../types/import.types';
import type { Workbook } from '../model/workbook';
import { selectSheet } from '../model/workbook';
import { ImportValidator } from '../services/import-validator';
import { WorkbookMapper } from '../services/workbook-mapper';

/** Signature of the progress emitter the pipeline calls at each stage. */
export type ProgressEmitter = (stage: ImportStage, message: string, processed?: number, total?: number) => void;

/** Inputs to a single pipeline run. */
export interface ImportPipelineInput {
  readonly workbook: Workbook;
  readonly source: ImportSourceType;
  readonly mode: ImportMode;
  readonly hasHeaderRow: boolean;
  readonly sheetName?: string;
  readonly sampleSize?: number;
}

/** Human-readable status text per stage (kept here so UI copy is centralized). */
const STAGE_MESSAGE: Record<ImportStage, string> = {
  [ImportStage.Reading]: 'Reading…',
  [ImportStage.Parsing]: 'Parsing…',
  [ImportStage.Validating]: 'Validating…',
  [ImportStage.Mapping]: 'Mapping columns…',
  [ImportStage.DetectingTypes]: 'Detecting types…',
  [ImportStage.BuildingFormulas]: 'Building formulas…',
  [ImportStage.Applying]: 'Applying…',
  [ImportStage.Rendering]: 'Rendering…',
  [ImportStage.Complete]: 'Done',
};

/** The pure Workbook → ImportResult transformation. */
export class ImportPipeline {
  /**
   * @param emit - Called once per stage so hosts can render progress.
   */
  constructor(private readonly emit: ProgressEmitter) {}

  /** Emits a stage using its canonical message. */
  private stage(stage: ImportStage, processed?: number, total?: number): void {
    this.emit(stage, STAGE_MESSAGE[stage], processed, total);
  }

  /**
   * Runs validation → mapping → type detection → formula discovery and returns
   * the grid-ready {@link ImportResult}. Never throws for data problems — those
   * are captured in {@link ImportResult.validation}; callers decide whether to
   * apply based on {@link import('../../../types/import.types').ImportValidationResult.valid}.
   *
   * @param input - The normalized workbook and options.
   * @returns The import result (possibly invalid).
   */
  run(input: ImportPipelineInput): ImportResult {
    const { workbook, source, mode, hasHeaderRow, sheetName, sampleSize } = input;

    this.stage(ImportStage.Validating);
    const sheet = selectSheet(workbook, sheetName);
    const structural = ImportValidator.validateWorkbook(sheet, hasHeaderRow);

    // Blocking structural failure — return an empty, invalid result.
    if (!sheet || structural.some((i) => i.severity === ImportValidationSeverity.Error)) {
      return this.emptyResult(source, mode, sheet?.name ?? '', structural);
    }

    this.stage(ImportStage.Mapping);
    this.stage(ImportStage.DetectingTypes);
    const mapped = WorkbookMapper.mapSheet(sheet, { hasHeaderRow, sampleSize });

    const headerIssues = ImportValidator.validateHeaders(mapped.headers);
    const validation = ImportValidator.toResult([...structural, ...headerIssues]);

    if (mapped.formulaCount > 0) this.stage(ImportStage.BuildingFormulas, mapped.formulaCount);

    return {
      source,
      sheetName: sheet.name,
      columns: mapped.columns,
      rows: mapped.rows,
      headers: mapped.headers,
      fields: mapped.fields,
      rowCount: mapped.rows.length,
      columnCount: mapped.columns.length,
      formulaCount: mapped.formulaCount,
      mode,
      validation,
    };
  }

  /** Builds an empty, invalid result for a structural failure. */
  private emptyResult(
    source: ImportSourceType,
    mode: ImportMode,
    sheetName: string,
    issues: readonly ImportValidationIssue[],
  ): ImportResult {
    return {
      source,
      sheetName,
      columns: [],
      rows: [],
      headers: [],
      fields: [],
      rowCount: 0,
      columnCount: 0,
      formulaCount: 0,
      mode,
      validation: ImportValidator.toResult(issues),
    };
  }
}
