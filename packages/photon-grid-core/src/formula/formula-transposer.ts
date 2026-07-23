/**
 * Adjusts the relative references in a formula when it is copied or filled from
 * one cell to another — the behavior that makes `=A1+B1` become `=A2+B2` when
 * dragged down one row.
 *
 * Only **relative** components shift; `$`-anchored (absolute) rows/columns stay
 * put, exactly like Excel/Sheets. A reference pushed off the top/left edge
 * (negative index) collapses to a `#REF!` error literal, so the transposed
 * formula stays well-formed.
 *
 * Works on the AST (compile → transpose → serialize), so it reuses the same
 * parser/serializer as the rest of the engine and never manipulates source text
 * with fragile regexes.
 *
 * @packageDocumentation
 */

import { AstNode, AstNodeType } from './parser/ast.types';
import type { CellRef, RangeRef } from './reference/reference.types';
import { FormulaError } from './error/formula-error';
import { compileFormula } from './compile';
import { serializeFormulaWithEquals } from './formula-serializer';
import type { ResolvedFormulaConfig } from './config/formula-config';

/** A copy/fill displacement in grid cells. */
export interface Offset {
  /** Rows to shift relative references by (positive = downward). */
  readonly deltaRow: number;
  /** Columns to shift relative references by (positive = rightward). */
  readonly deltaCol: number;
}

/**
 * Returns a new AST with every relative reference shifted by `offset`.
 * Absolute components are preserved; out-of-bounds shifts become `#REF!`.
 *
 * @param node   - The AST to transpose.
 * @param offset - The row/column displacement.
 * @returns A new, shifted AST (the input is not mutated).
 */
export function transposeAst(node: AstNode, offset: Offset): AstNode {
  switch (node.type) {
    case AstNodeType.CellRef: {
      const shifted = shiftCell(node.ref, offset);
      return shifted === null
        ? { type: AstNodeType.ErrorLiteral, error: FormulaError.ref('reference shifted off-grid') }
        : { type: AstNodeType.CellRef, ref: shifted };
    }
    case AstNodeType.RangeRef: {
      const shifted = shiftRange(node.ref, offset);
      return shifted === null
        ? { type: AstNodeType.ErrorLiteral, error: FormulaError.ref('range shifted off-grid') }
        : { type: AstNodeType.RangeRef, ref: shifted };
    }
    case AstNodeType.Unary:
      return { type: AstNodeType.Unary, op: node.op, operand: transposeAst(node.operand, offset) };
    case AstNodeType.Binary:
      return {
        type: AstNodeType.Binary,
        op: node.op,
        left: transposeAst(node.left, offset),
        right: transposeAst(node.right, offset),
      };
    case AstNodeType.Function:
      return { type: AstNodeType.Function, name: node.name, args: node.args.map((a) => transposeAst(a, offset)) };
    // Literals and bare names are position-independent.
    default:
      return node;
  }
}

/**
 * Transposes a formula source string by `offset`, returning new source
 * (including the leading `=`). If the source fails to compile it is returned
 * unchanged — a copy should never corrupt an already-broken formula.
 *
 * @param source - The original formula source (with `=`).
 * @param offset - The row/column displacement.
 * @param config - Resolved engine configuration (for separators).
 * @returns The transposed source, or the original on compile failure.
 */
export function transposeFormula(source: string, offset: Offset, config: ResolvedFormulaConfig): string {
  if (offset.deltaRow === 0 && offset.deltaCol === 0) return source;
  const { ast } = compileFormula(source, config);
  if (!ast) return source;
  return serializeFormulaWithEquals(transposeAst(ast, offset));
}

/** Shifts a single cell ref; returns `null` if it lands off the top/left edge. */
function shiftCell(ref: CellRef, offset: Offset): CellRef | null {
  const colIndex = ref.colAbsolute ? ref.colIndex : ref.colIndex + offset.deltaCol;
  const rowIndex = ref.rowAbsolute ? ref.rowIndex : ref.rowIndex + offset.deltaRow;
  if (colIndex < 0 || rowIndex < 0) return null;
  return { ...ref, colIndex, rowIndex };
}

/** Shifts a range ref; honours whole-column/row open axes. */
function shiftRange(ref: RangeRef, offset: Offset): RangeRef | null {
  // Whole-column ranges have open rows: only the column axis shifts.
  const rowOffset: Offset = ref.wholeColumn ? { deltaRow: 0, deltaCol: offset.deltaCol } : offset;
  // Whole-row ranges have open columns: only the row axis shifts.
  const effective: Offset = ref.wholeRow ? { deltaRow: offset.deltaRow, deltaCol: 0 } : rowOffset;

  const start = shiftEndpoint(ref.start, effective, ref);
  const end = shiftEndpoint(ref.end, effective, ref);
  if (start === null || end === null) return null;
  return { ...ref, start, end };
}

/**
 * Shifts a range endpoint. For whole-column/row ranges the open axis index
 * (`-1`) is preserved rather than shifted.
 */
function shiftEndpoint(ref: CellRef, offset: Offset, range: RangeRef): CellRef | null {
  let colIndex = ref.colIndex;
  let rowIndex = ref.rowIndex;

  if (!range.wholeRow) {
    colIndex = ref.colAbsolute ? ref.colIndex : ref.colIndex + offset.deltaCol;
    if (colIndex < 0) return null;
  }
  if (!range.wholeColumn) {
    rowIndex = ref.rowAbsolute ? ref.rowIndex : ref.rowIndex + offset.deltaRow;
    if (rowIndex < 0) return null;
  }
  return { ...ref, colIndex, rowIndex };
}
