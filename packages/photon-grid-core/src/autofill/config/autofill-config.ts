/**
 * Configuration resolution for the AutoFill engine.
 *
 * Turns the sparse, all-optional public {@link AutoFillConfig} into a dense
 * {@link ResolvedAutoFillConfig} with every field populated, so the rest of the
 * engine never reasons about `undefined`. Centralizing defaults here keeps
 * behavior consistent and runtime-configurable via
 * {@link AutoFillConfigurationManager.update}.
 *
 * @packageDocumentation
 */

import type { AutoFillConfig } from '../../types/autofill.types';
import { AutoFillDetectorName } from '../detectors/pattern-detector';

/**
 * Fully-populated configuration — the internal, `undefined`-free counterpart of
 * {@link AutoFillConfig}. Read-only; produce a new one via
 * {@link AutoFillConfigurationManager.update}.
 */
export interface ResolvedAutoFillConfig {
  readonly enabled: boolean;
  /** Enabled detector names (the copy fallback is always active regardless). */
  readonly detectors: ReadonlySet<AutoFillDetectorName>;
  readonly locale: string;
}

/** Every built-in detector name, used as the default enabled set. */
export const ALL_DETECTOR_NAMES: readonly AutoFillDetectorName[] = [
  AutoFillDetectorName.Date,
  AutoFillDetectorName.Month,
  AutoFillDetectorName.Weekday,
  AutoFillDetectorName.Numeric,
  AutoFillDetectorName.TextNumber,
  AutoFillDetectorName.Boolean,
  AutoFillDetectorName.Alphabet,
  AutoFillDetectorName.Copy,
];

/** The immutable default configuration used as the base for every merge. */
export const DEFAULT_AUTOFILL_CONFIG: ResolvedAutoFillConfig = Object.freeze({
  enabled: true,
  detectors: new Set(ALL_DETECTOR_NAMES),
  locale: 'en-US',
});

/**
 * Owns the engine's resolved configuration and applies partial updates against
 * the defaults. A single instance is held by the {@link
 * import('../autofill-engine').AutoFillEngine}.
 */
export class AutoFillConfigurationManager {
  private config: ResolvedAutoFillConfig = DEFAULT_AUTOFILL_CONFIG;

  /**
   * @param initial - Optional initial public config; merged over defaults.
   */
  constructor(initial?: AutoFillConfig) {
    if (initial) this.update(initial);
  }

  /** @returns The current fully-resolved configuration. */
  get(): ResolvedAutoFillConfig {
    return this.config;
  }

  /**
   * Merges `patch` over the current configuration and returns the new resolved
   * config. A provided `detectors` array replaces the enabled set (the copy
   * fallback is always retained by the registry); all other fields overwrite
   * when present.
   *
   * @param patch - Partial public config to apply.
   */
  update(patch: AutoFillConfig): ResolvedAutoFillConfig {
    const prev = this.config;
    this.config = {
      enabled: patch.enabled ?? prev.enabled,
      detectors: patch.detectors ? new Set(patch.detectors) : prev.detectors,
      locale: patch.locale ?? prev.locale,
    };
    return this.config;
  }
}
