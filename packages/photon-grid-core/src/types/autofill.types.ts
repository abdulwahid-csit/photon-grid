/**
 * Public configuration surface for the Photon Grid AutoFill engine.
 *
 * Lives in `src/types` (alongside `formula.types.ts` and the other subsystem
 * configs) so it can be referenced by {@link GridOptions} without pulling the
 * AutoFill engine into the grid's type graph. Every field is optional; the engine
 * applies sensible defaults via its configuration manager.
 *
 * @packageDocumentation
 */

import type { AutoFillDetectorName } from '../autofill/detectors/pattern-detector';

/**
 * Grid-level options controlling the AutoFill (drag-to-fill) engine. Supplied as
 * `GridOptions.autofill`.
 */
export interface AutoFillConfig {
  /**
   * Master switch for intelligent pattern detection. When `false`, the fill
   * handle reverts to a plain copy/cycle of the source values (no series
   * inference). The fill handle itself remains available.
   * @defaultValue true
   */
  enabled?: boolean;

  /**
   * Restricts which pattern detectors run, by name. Omitted enables every
   * built-in detector. The copy fallback is always active regardless, so a fill
   * never fails to produce values.
   */
  detectors?: AutoFillDetectorName[];

  /**
   * BCP-47 locale used to recognize and emit month / weekday names (e.g. a
   * `fr-FR` grid continues `janvier, février → mars`).
   * @defaultValue 'en-US'
   */
  locale?: string;
}
