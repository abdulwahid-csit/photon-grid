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
import { extractReferences, containsVolatileFunction, extractNames } from '../reference-extractor';
import { FormulaError, isFormulaError } from '../error/formula-error';
import type { CellId, FormulaValue } from '../types/formula.types';
import { makeCellId, splitCellId } from '../types/formula.types';
import type { AstNode } from '../parser/ast.types';

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
    const cellId = this.registerFormula(nodeId, colId, source);
    const dirty = this.buildDirty([], this.formulaSeeds(cellId));
    return this.recompute(dirty);
  }

  /**
   * Bulk-registers many formulas and recomputes once. Each registration defers
   * its own recompute, so seeding N declarative formulas at load costs a single
   * ordered pass over the seeded cells plus their dependents (and volatiles) —
   * not N cascading recomputes. Forward references resolve correctly because the
   * final pass is topologically ordered.
   *
   * @param entries - The formulas to register.
   * @returns The cells whose value changed.
   */
  registerFormulas(entries: readonly { nodeId: string; colId: string; source: string }[]): RecalculationResult {
    const seeds: CellId[] = this.volatileCellIds();
    for (let i = 0; i < entries.length; i++) {
      seeds.push(this.registerFormula(entries[i].nodeId, entries[i].colId, entries[i].source));
    }
    if (seeds.length === 0) return EMPTY_RESULT;
    return this.recompute(this.buildDirty([], seeds));
  }

  /**
   * Removes every formula cell owned by any of `nodeIds` (e.g. deleted rows) and
   * recomputes the dependents that referenced them, so structural row changes
   * leave no orphaned store/graph entries.
   *
   * @param nodeIds - Stable ids of the removed rows.
   * @returns The cells whose value changed.
   */
  purgeNodes(nodeIds: ReadonlySet<string>): RecalculationResult {
    const toRemove: CellId[] = [];
    for (const cell of this.store.values()) {
      if (nodeIds.has(cell.nodeId)) toRemove.push(cell.cellId);
    }
    if (toRemove.length === 0) return EMPTY_RESULT;
    // Seed dependents against the still-present values, then detach the cells.
    const dirty = this.buildDirty(toRemove, this.volatileCellIds());
    for (let i = 0; i < toRemove.length; i++) {
      const cellId = toRemove[i];
      this.graph.clearDependencies(cellId);
      this.volatileCells.delete(cellId);
      this.store.delete(cellId);
      dirty.delete(cellId);
    }
    return this.recompute(dirty);
  }

  /**
   * Compiles a formula, stores the cell, and (re)wires its dependency-graph edges
   * — WITHOUT recomputing. The shared registration step behind {@link setFormula}
   * and {@link registerFormulas}.
   *
   * @returns The cell's stable {@link CellId}.
   */
  private registerFormula(nodeId: string, colId: string, source: string): CellId {
    const cellId = makeCellId(nodeId, colId);
    const cfg = this.configManager.get();
    // Reuse a cached AST for identical sources (the dominant cost when a column
    // formula is applied down thousands of rows); bypass when caching is disabled.
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
      this.addNameDependencies(nodeId, ast, deps.cells);
      this.graph.setDependencies(cellId, deps.cells, deps.ranges);
    } else {
      this.graph.clearDependencies(cellId);
    }
    if (volatile) this.volatileCells.add(cellId);
    else this.volatileCells.delete(cellId);

    return cellId;
  }

  /**
   * Adds per-row precedents for a formula's row-relative bare names (field-name
   * `quantity` or column-letter `B`). A row-relative reference always points at
   * the SAME row as the formula cell, so each precedent is `(nodeId, resolvedColId)`.
   * Named ranges are skipped (resolved at eval time, as today).
   *
   * @param nodeId - The formula cell's row (also its precedents' row).
   * @param ast    - The compiled formula AST.
   * @param out    - Precedent list to append to (mutated).
   */
  private addNameDependencies(nodeId: string, ast: AstNode, out: CellId[]): void {
    const names = extractNames(ast);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      if (this.namedRanges.getTarget(name) != null) continue;
      const depColId = this.resolver.resolveColumnId(name);
      if (depColId === null) continue;
      out.push(makeCellId(nodeId, depColId));
    }
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
      // Tell the evaluator which row this cell lives in so row-relative
      // references (field-name / column-letter) resolve against it. The AST is
      // shared across rows, so the row is supplied here, never baked into it.
      ctx.currentRowIndex = positions.get(order[i])?.rowIndex ?? this.adapter.getRowIndex(cell.nodeId);
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
      // Overwritten per cell in `recompute` before each evaluation.
      currentRowIndex: 0,
      resolveRowRelative: this.resolver.resolveRowRelative,
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
