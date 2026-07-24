/**
 * `AutoFillEngine` — the facade that owns AutoFill configuration and the detector
 * registry, and turns a source vector into extrapolated values.
 *
 * It is pure and framework-independent: it never touches `GridStore`, DOM,
 * `RowNode` or `ColumnModel`. The grid integration layer (the cell-selection
 * engine's fill handle) collects each fill vector's source values, calls
 * {@link AutoFillEngine.generateSeries}, and writes the results back — so all
 * pattern intelligence lives here, decoupled from the grid, exactly like the
 * Formula Engine sits behind its adapter port.
 *
 * @packageDocumentation
 */

import type { AutoFillConfig } from '../types/autofill.types';
import type { AutoFillValue, AutoFillOptions } from './types/autofill.types';
import type { ResolvedAutoFillConfig } from './config/autofill-config';
import { AutoFillConfigurationManager } from './config/autofill-config';
import { AutoFillDetectorRegistry } from './autofill-registry';
import { clearNameCaches } from './util/locale-names';

/** Registry with no configurable detectors — resolves purely to the copy fallback. */
const COPY_ONLY_REGISTRY = new AutoFillDetectorRegistry([]);

export class AutoFillEngine {
  private readonly configManager: AutoFillConfigurationManager;
  private readonly baseRegistry: AutoFillDetectorRegistry;
  /** Registry filtered to the currently-enabled detectors; rebuilt on configure. */
  private activeRegistry: AutoFillDetectorRegistry;

  /**
   * @param config - Optional initial configuration (`GridOptions.autofill`).
   */
  constructor(config?: AutoFillConfig) {
    this.configManager = new AutoFillConfigurationManager(config);
    this.baseRegistry = new AutoFillDetectorRegistry();
    this.activeRegistry = this.baseRegistry.withEnabled(this.configManager.get().detectors);
  }

  /**
   * Applies a partial configuration update at runtime.
   *
   * @param patch - Partial public config; `undefined` is a no-op.
   * @returns The updated resolved configuration.
   */
  configure(patch: AutoFillConfig | undefined): ResolvedAutoFillConfig {
    if (patch) {
      this.configManager.update(patch);
      this.activeRegistry = this.baseRegistry.withEnabled(this.configManager.get().detectors);
    }
    return this.configManager.get();
  }

  /** @returns The current fully-resolved configuration. */
  getConfig(): ResolvedAutoFillConfig {
    return this.configManager.get();
  }

  /** @returns `true` when intelligent pattern detection is enabled. */
  isEnabled(): boolean {
    return this.configManager.get().enabled;
  }

  /**
   * Generates `count` values that continue the pattern found in `source`.
   *
   * Pure and allocation-light: pattern detection runs once (O(source)), then each
   * value is produced in O(1). The result is ordered to match the grid's natural
   * iteration order over the fill target — for a `reverse` (up/left) fill the
   * furthest-from-source cell comes first — so the caller indexes it directly by
   * target offset without reasoning about direction.
   *
   * @param source  - Ordered source values of one vector (a column slice for a
   *                  vertical fill, a row slice for a horizontal fill).
   * @param count   - Number of values to produce (`<= 0` yields `[]`).
   * @param options - Column-type / reverse / locale hints.
   * @returns The generated values, length `count`.
   */
  generateSeries(
    source: readonly AutoFillValue[],
    count: number,
    options?: AutoFillOptions,
  ): AutoFillValue[] {
    if (count <= 0 || source.length === 0) return [];

    const cfg = this.configManager.get();
    const reverse = options?.reverse ?? false;
    const registry = cfg.enabled ? this.activeRegistry : COPY_ONLY_REGISTRY;
    const series = registry.resolve(source, {
      columnType: options?.columnType,
      locale: options?.locale ?? cfg.locale,
    });

    const n = source.length;
    const out = new Array<AutoFillValue>(count);
    // Forward fills occupy source positions n … n+count-1; reverse fills occupy
    // -count … -1 (grid order: furthest-from-source first).
    const start = reverse ? -count : n;
    for (let i = 0; i < count; i++) {
      out[i] = series.valueAt(start + i);
    }
    return out;
  }

  /** Clears the locale name caches. Useful after a locale/config hot-reload. */
  clearCaches(): void {
    clearNameCaches();
  }
}
