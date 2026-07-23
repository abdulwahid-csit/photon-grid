/**
 * `FormulaEngine` — the facade that owns and coordinates every formula
 * subsystem (configuration, function registry, formula store, and — wired in
 * later phases — the tokenizer, parser, evaluator, dependency graph and
 * calculation engine). It is the single object the grid injects and calls.
 *
 * It is a thin coordinator: each responsibility lives in its own module, so this
 * class never becomes a God object. It depends only on the {@link
 * FormulaGridAdapter} port, never on concrete grid/DOM types, keeping the engine
 * framework-independent and unit-testable.
 *
 * @packageDocumentation
 */

import type { FormulaConfig } from '../types/formula.types';
import type { FormulaState } from './types/formula.types';
import { makeCellId } from './types/formula.types';
import type { ResolvedFormulaConfig } from './config/formula-config';
import { ConfigurationManager } from './config/formula-config';
import { FunctionRegistry } from './functions/function-registry';
import type { FormulaFunction } from './functions/formula-function';
import { registerBuiltinFunctions } from './functions/builtins';
import { FormulaStore } from './store/formula-store';
import type { FormulaGridAdapter } from './formula-grid-adapter';
import { CalculationEngine, SYSTEM_CLOCK } from './calc/calculation-engine';
import type { FormulaClock } from './calc/calculation-engine';
import { sharedEvaluator } from './evaluator/evaluator';
import { NamedRangeManager } from './named-range-manager';
import type { NamedRangeEntry } from './named-range-manager';
import { transposeFormula } from './formula-transposer';
import type { Offset } from './formula-transposer';

/**
 * A cell whose stored value changed, identified by the engine's native stable
 * identities. The grid integration layer translates its `{nodeId, field}`
 * changes into these before notifying the engine.
 */
export interface FormulaCellChange {
  /** Stable row identity. */
  readonly nodeId: string;
  /** Immutable column identity. */
  readonly colId: string;
}

/**
 * Outcome of a {@link FormulaEngine.setFormula} call — the set of cells whose
 * displayed value changed as a result (so the caller can repaint precisely).
 */
export interface RecalculationResult {
  /** Stable row ids of every cell whose value changed. */
  readonly changedNodeIds: ReadonlySet<string>;
}

/** Empty result singleton (no cells changed). */
const EMPTY_RESULT: RecalculationResult = { changedNodeIds: new Set() };

export class FormulaEngine {
  private readonly configManager: ConfigurationManager;
  private registry: FunctionRegistry;
  private readonly store: FormulaStore;
  private readonly calc: CalculationEngine;
  private readonly namedRanges: NamedRangeManager;

  /**
   * @param adapter - Port giving the engine access to grid cell values and
   *                  coordinate spaces without a framework dependency.
   * @param config  - Optional initial configuration.
   * @param clock   - Optional time/random source for volatile functions
   *                  (defaults to the system clock; injected in tests).
   */
  constructor(
    private readonly adapter: FormulaGridAdapter,
    config?: FormulaConfig,
    clock: FormulaClock = SYSTEM_CLOCK,
  ) {
    this.configManager = new ConfigurationManager(config);
    const cfg = this.configManager.get();
    this.registry = new FunctionRegistry(cfg.caseSensitiveFunctions);
    this.store = new FormulaStore();
    this.namedRanges = new NamedRangeManager(cfg.namedRanges);
    registerBuiltinFunctions(this.registry);
    this.registerConfiguredFunctions(cfg);
    this.calc = new CalculationEngine(
      adapter,
      this.store,
      this.configManager,
      this.registry,
      sharedEvaluator,
      this.namedRanges,
      clock,
    );
  }

  // ── Configuration ──────────────────────────────────────────────────────────

  /**
   * Applies a configuration patch (merged over the current config) and returns
   * the resolved result. Newly-supplied custom functions are registered.
   *
   * @param patch - Partial public configuration.
   */
  configure(patch: FormulaConfig | undefined): ResolvedFormulaConfig {
    if (!patch) return this.configManager.get();
    const cfg = this.configManager.update(patch);
    this.registerConfiguredFunctions(cfg);
    return cfg;
  }

  /** @returns The current fully-resolved configuration. */
  getConfig(): ResolvedFormulaConfig {
    return this.configManager.get();
  }

  /** @returns `true` when the engine is enabled (`formula.enabled`). */
  isEnabled(): boolean {
    return this.configManager.get().enabled;
  }

  // ── Function registry ────────────────────────────────────────────────────

  /** @returns The function registry (for advanced/plugin use). */
  getRegistry(): FunctionRegistry {
    return this.registry;
  }

  /**
   * Registers (or overrides) a formula function.
   *
   * @param fn - The function implementation.
   */
  registerFunction(fn: FormulaFunction): void {
    this.registry.register(fn);
  }

  private registerConfiguredFunctions(cfg: ResolvedFormulaConfig): void {
    if (cfg.customFunctions.length > 0) this.registry.registerAll(cfg.customFunctions);
  }

  // ── Formula cell access ────────────────────────────────────────────────────

  /**
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @returns The formula source (including `=`), or `null` if the cell has none.
   */
  getFormula(nodeId: string, colId: string): string | null {
    return this.store.getAt(nodeId, colId)?.source ?? null;
  }

  /**
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @returns `true` when the cell holds a formula.
   */
  hasFormula(nodeId: string, colId: string): boolean {
    return this.store.has(makeCellId(nodeId, colId));
  }

  /**
   * Assigns (or replaces) the formula on a cell: compiles it, updates the
   * dependency graph, and recomputes the cell plus everything downstream.
   *
   * A disabled engine or a column that did not opt in (`colDef.allowFormula`)
   * is a no-op. Never throws — a malformed formula stores as `#ERROR!`.
   *
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @param source - The raw formula source (including the leading `=`).
   * @returns The cells whose value changed as a result.
   */
  setFormula(nodeId: string, colId: string, source: string): RecalculationResult {
    if (!this.isEnabled() || !this.adapter.allowsFormula(colId)) return EMPTY_RESULT;
    return this.calc.setFormula(nodeId, colId, source);
  }

  /**
   * Removes the formula from a cell (leaving its last computed value in place)
   * and recomputes anything that depended on it.
   *
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   * @returns `true` if a formula was removed.
   */
  clearFormula(nodeId: string, colId: string): boolean {
    return this.calc.removeFormula(nodeId, colId).removed;
  }

  /**
   * Like {@link clearFormula} but returns the cells whose value changed as a
   * result (dependents that recomputed). Used by the clipboard/fill integration.
   *
   * @param nodeId - Stable row identity.
   * @param colId  - Immutable column identity.
   */
  removeFormula(nodeId: string, colId: string): RecalculationResult {
    return this.calc.removeFormula(nodeId, colId).result;
  }

  // ── Recalculation entry points ─────────────────────────────────────────────

  /**
   * Notifies the engine that one or more non-formula cells changed (from an
   * edit, paste, fill, cut or undo), so cells depending on them — plus volatile
   * cells — are recomputed.
   *
   * @param changes - The changed cells.
   * @returns The cells whose value changed as a result.
   */
  onCellsChanged(changes: readonly FormulaCellChange[]): RecalculationResult {
    if (!this.isEnabled()) return EMPTY_RESULT;
    return this.calc.onCellsChanged(changes);
  }

  /**
   * Recomputes formula cells. Volatile cells are always recomputed; when
   * `force` is `true`, every formula cell is recomputed.
   *
   * @param force - Recompute all cells, not just dirty/volatile ones.
   * @returns The cells whose value changed as a result.
   */
  recalculate(force = false): RecalculationResult {
    if (!this.isEnabled()) return EMPTY_RESULT;
    return this.calc.recalculate(force);
  }

  // ── Copy / fill support ────────────────────────────────────────────────────

  /**
   * Adjusts a formula's relative references for a copy/fill displacement, so
   * `=A1+B1` filled down one row becomes `=A2+B2`. Absolute (`$`) parts are
   * preserved; references pushed off-grid become `#REF!`.
   *
   * @param source - The source formula (including `=`).
   * @param offset - The row/column displacement.
   * @returns The transposed source string.
   */
  transposeFormula(source: string, offset: Offset): string {
    return transposeFormula(source, offset, this.configManager.get());
  }

  // ── Named ranges ───────────────────────────────────────────────────────────

  /**
   * Defines (or replaces) a named range, then recalculates so formulas using the
   * name pick it up.
   *
   * @param name   - The name (case-insensitive).
   * @param target - Its A1-notation target (e.g. `"B1"`, `"A1:C3"`).
   * @returns The cells whose value changed.
   */
  setNamedRange(name: string, target: string): RecalculationResult {
    this.namedRanges.set(name, target);
    return this.recalculate(true);
  }

  /**
   * Removes a named range, then recalculates.
   *
   * @param name - The name (case-insensitive).
   * @returns The cells whose value changed.
   */
  removeNamedRange(name: string): RecalculationResult {
    const removed = this.namedRanges.delete(name);
    return removed ? this.recalculate(true) : EMPTY_RESULT;
  }

  /** @returns All defined named ranges. */
  getNamedRanges(): NamedRangeEntry[] {
    return this.namedRanges.list();
  }

  // ── State serialization ────────────────────────────────────────────────────

  /**
   * @returns A serializable snapshot of every formula cell (sources only).
   */
  getState(): FormulaState {
    return this.store.toState();
  }

  /**
   * Restores formula cells from a serialized {@link FormulaState}, replacing any
   * current formulas, then recalculates.
   *
   * @param state - A snapshot previously produced by {@link getState}.
   */
  setState(state: FormulaState): void {
    this.store.clear();
    for (const entry of state.cells) {
      this.setFormula(entry.nodeId, entry.colId, entry.source);
    }
    this.recalculate(true);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  /** Releases all engine state. Called from `GridApi.destroy`. */
  destroy(): void {
    this.calc.clear();
    this.store.clear();
  }
}
