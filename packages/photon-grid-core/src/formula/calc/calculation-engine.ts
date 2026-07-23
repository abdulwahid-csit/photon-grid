/**
 * The calculation engine: the orchestrator that turns a formula edit or a cell
 * change into a minimal, correctly-ordered recomputation and writes results back
 * to the grid.
 *
 * ### Pipeline
 * ```
 * setFormula / onCellsChanged
 *        │  compile → extract references → resolve precedents
 *        ▼
 *   DependencyGraph  ──▶  dirty subgraph (only affected cells)
 *        │                         │  Kahn topological order + cycle detection
 *        ▼                         ▼
 *   Evaluator over EvalContext ─▶ write changed values via the adapter
 * ```
 *
 * It never recomputes the whole grid: a change dirties only its transitive
 * dependents (plus volatile cells), and those are evaluated precedents-first.
 * Circular references are detected and flagged `#CIRC!` instead of looping.
 *
 * @packageDocumentation
 */

import type { FormulaGridAdapter } from '../formula-grid-adapter';
import type { ConfigurationManager } from '../config/formula-config';
import type { FunctionRegistry } from '../functions/function-registry';
import type { Evaluator } from '../evaluator/evaluator';
import type { EvalContext } from '../types/eval-context';
import type { FormulaStore } from '../store/formula-store';
import { DependencyGraph } from '../graph/dependency-graph';
import { computeCalculationOrder } from '../graph/cycle-detector';
import { ReferenceResolver } from '../reference/reference-resolver';
import type { NamedRangeManager } from '../named-range-manager';
import { compileFormula } from '../compile';
import { ExpressionCache } from '../cache/expression-cache';
import { extractReferences, containsVolatileFunction } from '../reference-extractor';
import { FormulaError, isFormulaError } from '../error/formula-error';
import type { CellId, FormulaValue } from '../types/formula.types';
import { makeCellId, splitCellId } from '../types/formula.types';

/** A source of "now" and randomness, injected so volatile functions are testable. */
export interface FormulaClock {
  /** Current time as epoch milliseconds. */
  now(): number;
  /** A uniform random number in `[0, 1)`. */
  random(): number;
}

/** The default clock (wall clock + `Math.random`). */
export const SYSTEM_CLOCK: FormulaClock = {
  now: () => Date.now(),
  random: () => Math.random(),
};

/** The set of cells whose displayed value changed as a result of a recompute. */
export interface RecalculationResult {
  /** Stable row ids of every cell whose value changed. */
  readonly changedNodeIds: ReadonlySet<string>;
}

const EMPTY_RESULT: RecalculationResult = { changedNodeIds: new Set() };

/** Positional coordinates of a cell, or `-1` when it is not in the grid. */
interface CellPosition {
  readonly colIndex: number;
  readonly rowIndex: number;
}

export class CalculationEngine {
  private readonly resolver: ReferenceResolver;
  private readonly graph = new DependencyGraph();
  private readonly cache = new ExpressionCache();
  /**
   * Live set of volatile formula cells, maintained incrementally so gathering
   * them is O(volatile count) rather than an O(store size) scan on every edit.
   */
  private readonly volatileCells = new Set<CellId>();

  /**
   * @param adapter       - Port to grid cell values and coordinate spaces.
   * @param store         - The formula-cell store (shared with the facade).
   * @param configManager - Resolved-config provider.
   * @param registry      - Function registry for the evaluation context.
   * @param evaluator     - The shared AST evaluator.
   * @param namedRanges   - Runtime named-range registry.
   * @param clock         - Time/random source for volatile functions.
   */
  constructor(
    private readonly adapter: FormulaGridAdapter,
    private readonly store: FormulaStore,
    private readonly configManager: ConfigurationManager,
    private readonly registry: FunctionRegistry,
    private readonly evaluator: Evaluator,
    private readonly namedRanges: NamedRangeManager,
    private readonly clock: FormulaClock = SYSTEM_CLOCK,
  ) {
    this.resolver = new ReferenceResolver(adapter);
  }

  // ── Public operations ────────────────────────────────────────────────────

  /**
   * Compiles and stores a formula on a cell, updates the dependency graph, and
   * recomputes that cell plus everything downstream of it.
   *
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @param source - Raw formula source (including the leading `=`).
   * @returns The cells whose value changed.
   */
  setFormula(nodeId: string, colId: string, source: string): RecalculationResult {
    const cellId = makeCellId(nodeId, colId);
    const cfg = this.configManager.get();
    // Reuse a cached AST for identical sources (the dominant cost when filling a
    // formula down thousands of rows); bypass when caching is disabled.
    const compiled = cfg.enableCaching ? this.cache.compile(source, cfg) : compileFormula(source, cfg);
    const ast = compiled.ast;
    const references = ast ? extractReferences(ast) : [];
    const volatile = ast ? containsVolatileFunction(ast, cfg.volatileFunctions) : false;

    this.store.set({
      cellId,
      nodeId,
      colId,
      source,
      ast,
      value: null,
      error: ast ? null : FormulaError.syntax(compiled.error?.message),
      references,
      volatile,
    });

    if (ast) {
      const deps = this.resolver.resolveDependencies(cellId, references);
      this.graph.setDependencies(cellId, deps.cells, deps.ranges);
    } else {
      this.graph.clearDependencies(cellId);
    }
    if (volatile) this.volatileCells.add(cellId);
    else this.volatileCells.delete(cellId);

    const dirty = this.buildDirty([], this.formulaSeeds(cellId));
    return this.recompute(dirty);
  }

  /**
   * Removes a cell's formula (leaving its last computed value in the grid) and
   * recomputes anything that depended on it.
   *
   * @returns `{ removed, result }` — whether a formula existed, and the changes.
   */
  removeFormula(nodeId: string, colId: string): { removed: boolean; result: RecalculationResult } {
    const cellId = makeCellId(nodeId, colId);
    if (!this.store.has(cellId)) return { removed: false, result: EMPTY_RESULT };
    // Dependents recompute against this cell's retained value; then detach it.
    const dirty = this.buildDirty([cellId], this.volatileCellIds());
    this.graph.clearDependencies(cellId);
    this.volatileCells.delete(cellId);
    this.store.delete(cellId);
    dirty.delete(cellId);
    return { removed: true, result: this.recompute(dirty) };
  }

  /**
   * Reacts to one or more non-formula cell changes (edit/paste/fill/undo):
   * recomputes their dependents plus all volatile cells.
   *
   * @param changes - The changed cells.
   * @returns The cells whose value changed.
   */
  onCellsChanged(changes: readonly { nodeId: string; colId: string }[]): RecalculationResult {
    if (changes.length === 0 && this.volatileCellIds().length === 0) return EMPTY_RESULT;
    const literalSeeds = changes.map((c) => makeCellId(c.nodeId, c.colId));
    const dirty = this.buildDirty(literalSeeds, this.volatileCellIds());
    return this.recompute(dirty);
  }

  /**
   * Recomputes formula cells. When `force` is `true`, every formula cell is
   * recomputed; otherwise only volatile cells (and their dependents).
   *
   * @param force - Recompute all cells, not just volatile ones.
   * @returns The cells whose value changed.
   */
  recalculate(force: boolean): RecalculationResult {
    let seeds: CellId[];
    if (force) {
      seeds = [];
      for (const cell of this.store.values()) seeds.push(cell.cellId);
    } else {
      seeds = this.volatileCellIds();
    }
    const dirty = this.buildDirty([], seeds);
    return this.recompute(dirty);
  }

  /** Detaches all formulas and graph edges. */
  clear(): void {
    this.graph.clear();
    this.cache.clear();
    this.volatileCells.clear();
  }

  // ── Dirty-set construction ─────────────────────────────────────────────────

  /**
   * Builds the transitive dirty set. `formulaSeeds` are formula cells that must
   * themselves recompute (an edited formula, volatile cells); `literalSeeds` are
   * changed non-formula cells whose *dependents* must recompute.
   */
  private buildDirty(literalSeeds: Iterable<CellId>, formulaSeeds: Iterable<CellId>): Set<CellId> {
    const dirty = new Set<CellId>();
    const stack: CellId[] = [];

    for (const s of formulaSeeds) {
      if (this.store.has(s) && !dirty.has(s)) {
        dirty.add(s);
        stack.push(s);
      }
    }
    for (const s of literalSeeds) this.addDependents(s, dirty, stack);
    while (stack.length > 0) this.addDependents(stack.pop() as CellId, dirty, stack);

    return dirty;
  }

  /** Adds `cellId`'s not-yet-seen dependents to `dirty` and the work `stack`. */
  private addDependents(cellId: CellId, dirty: Set<CellId>, stack: CellId[]): void {
    const pos = this.position(cellId);
    const found = new Set<CellId>();
    this.graph.collectDependents(cellId, pos.colIndex, pos.rowIndex, found);
    for (const d of found) {
      if (!dirty.has(d)) {
        dirty.add(d);
        stack.push(d);
      }
    }
  }

  /** The formula seeds for a `setFormula`: the edited cell plus all volatiles. */
  private formulaSeeds(edited: CellId): CellId[] {
    const seeds = this.volatileCellIds();
    seeds.push(edited);
    return seeds;
  }

  /** Every currently-volatile formula cell id. */
  private volatileCellIds(): CellId[] {
    return this.volatileCells.size === 0 ? [] : [...this.volatileCells];
  }

  // ── Recomputation ──────────────────────────────────────────────────────────

  /** Orders `dirty` precedents-first and evaluates it, writing changed values back. */
  private recompute(dirty: Set<CellId>): RecalculationResult {
    if (dirty.size === 0) return EMPTY_RESULT;

    const positions = new Map<CellId, CellPosition>();
    for (const c of dirty) positions.set(c, this.position(c));

    const dependentsInDirty = (cell: CellId): CellId[] => {
      const pos = positions.get(cell) as CellPosition;
      const found = new Set<CellId>();
      this.graph.collectDependents(cell, pos.colIndex, pos.rowIndex, found);
      const res: CellId[] = [];
      for (const d of found) if (dirty.has(d)) res.push(d);
      return res;
    };

    const { order, cyclic } = computeCalculationOrder(dirty, dependentsInDirty);
    const ctx = this.buildContext();
    const changed = new Set<string>();

    // Cells in/under a cycle are flagged before the acyclic part evaluates, so
    // any acyclic dependents correctly observe #CIRC!.
    for (const c of cyclic) this.assign(c, FormulaError.circular(), changed);
    for (let i = 0; i < order.length; i++) {
      const cell = this.store.get(order[i]);
      if (!cell) continue;
      const result = cell.ast ? this.evaluator.evaluate(cell.ast, ctx) : cell.error ?? FormulaError.syntax();
      this.assign(order[i], result, changed);
    }
    return { changedNodeIds: changed };
  }

  /** Writes a cell's new value to the store + grid, tracking real changes. */
  private assign(cellId: CellId, value: FormulaValue, changed: Set<string>): void {
    const cell = this.store.get(cellId);
    if (!cell) return;
    const prev = cell.value;
    cell.value = value;
    cell.error = isFormulaError(value) ? value : null;
    this.adapter.writeCell(cell.nodeId, cell.colId, value);
    if (!valuesEqual(prev, value)) changed.add(cell.nodeId);
  }

  /** Builds the evaluation context for a recompute pass. */
  private buildContext(): EvalContext {
    const cfg = this.configManager.get();
    return {
      config: cfg,
      functions: this.registry,
      resolveCell: this.resolver.resolveCell,
      resolveRange: this.resolver.resolveRange,
      resolveName: (name: string) => {
        const target = this.namedRanges.getTarget(name);
        return target ? this.resolver.parseNamedTarget(target) : null;
      },
      now: this.clock.now,
      random: this.clock.random,
    };
  }

  /** Positional coordinates of a stored cell (`-1` when off-grid). */
  private position(cellId: CellId): CellPosition {
    const { nodeId, colId } = splitCellId(cellId);
    return {
      colIndex: this.adapter.getColIndex(colId),
      rowIndex: this.adapter.getRowIndex(nodeId),
    };
  }
}

/** Value equality with `FormulaError` compared by code. */
function valuesEqual(a: FormulaValue, b: FormulaValue): boolean {
  if (isFormulaError(a)) return isFormulaError(b) && a.code === b.code;
  if (isFormulaError(b)) return false;
  return a === b;
}
