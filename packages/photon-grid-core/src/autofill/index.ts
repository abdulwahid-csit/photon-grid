/**
 * Public barrel for the Photon Grid AutoFill (drag-to-fill intelligence) engine.
 *
 * Re-exported from the package root (`src/index.ts`) so consumers get the engine
 * facade, its detector extension contracts, the registry and configuration
 * surface without reaching into internal module paths.
 *
 * @packageDocumentation
 */

// ── Facade ───────────────────────────────────────────────────────────────────
export { AutoFillEngine } from './autofill-engine';

// ── Value & option types ─────────────────────────────────────────────────────
export type { AutoFillValue, AutoFillOptions, DetectContext } from './types/autofill.types';

// ── Detector extension contract ──────────────────────────────────────────────
export { AutoFillDetectorName } from './detectors/pattern-detector';
export type { AutoFillPatternDetector, AutoFillSeries } from './detectors/pattern-detector';

// ── Registry ─────────────────────────────────────────────────────────────────
export { AutoFillDetectorRegistry, createDefaultDetectors } from './autofill-registry';

// ── Built-in detectors ───────────────────────────────────────────────────────
export { NumericSequenceDetector } from './detectors/numeric-sequence-detector';
export { DateSequenceDetector } from './detectors/date-sequence-detector';
export { MonthDetector } from './detectors/month-detector';
export { WeekdayDetector } from './detectors/weekday-detector';
export { BooleanDetector } from './detectors/boolean-detector';
export { TextNumberDetector } from './detectors/text-number-detector';
export { AlphabetDetector } from './detectors/alphabet-detector';
export { CopyDetector } from './detectors/copy-detector';

// ── Configuration ────────────────────────────────────────────────────────────
export {
  AutoFillConfigurationManager,
  DEFAULT_AUTOFILL_CONFIG,
  ALL_DETECTOR_NAMES,
} from './config/autofill-config';
export type { ResolvedAutoFillConfig } from './config/autofill-config';
