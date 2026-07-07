import type { ColumnDef } from '../types/column.types';
import type { FilterOperator } from '../types/filter.types';
import type { GridApi } from '../core/grid-api';
import type { EntityResolver } from './entity-resolver';

/**
 * A resolved, ready-to-execute grid instruction produced by the
 * {@link CommandBuilder}. `type` is the stable machine key of the
 * {@link IntentDefinition} that produced it (by convention, identical to
 * `IntentDefinition.key`); `params` carries whatever that intent's
 * `buildCommand` decided the {@link CommandExecutor} needs.
 *
 * Commands are plain data — never executable code — so they can be logged,
 * previewed, replayed, or handed to a different executor without any
 * knowledge of how they were produced.
 */
export interface PhotonCommand {
  readonly type: string;
  readonly params: Readonly<Record<string, unknown>>;
}

/** Outcome of {@link PhotonAIService.submit} — always resolves, never throws. */
export interface PhotonCommandResult {
  readonly success: boolean;
  /** Short, human-readable summary shown in the command bar (e.g. "Sorted Salary descending."). */
  readonly message: string;
  /** The command that was executed, when parsing/resolution/execution succeeded. */
  readonly command?: PhotonCommand;
}

/**
 * Entities extracted from the user's tokens for one matched intent —
 * resolved dynamically against the grid's *current* columns, never
 * hardcoded. Every field is optional: which ones are populated depends on
 * what the owning {@link IntentDefinition.resolveEntities} looked for.
 */
export interface ResolvedEntities {
  column?: ColumnDef;
  columns?: ColumnDef[];
  direction?: 'asc' | 'desc';
  side?: 'left' | 'right' | null;
  visible?: boolean;
  /** Free-text value left over after intent keywords and the column name were consumed (e.g. a filter value). */
  value?: string;
  /** A bare integer found in the input (e.g. "select row 5"). */
  index?: number;
  /** Comparison operator detected from phrases like "greater than", "before", "contains" — defaults to a type-appropriate operator when absent. */
  operator?: FilterOperator;
  /** The coerced (typed) filter value — a `number`, `boolean`, `Date`, or `string` depending on the resolved column's data type. */
  coercedValue?: unknown;
  /** The upper bound for a `between`/`inRange` filter. */
  coercedValueTo?: unknown;
  /** `true` when the user referred to "all"/"every" columns rather than a single named one (e.g. "hide all columns"). */
  allColumns?: boolean;
  /** Every pin side mentioned in the sentence — e.g. `["left", "right"]` for "pin half to the left and half to the right". */
  sides?: readonly ('left' | 'right')[];
}

/**
 * A single grid feature's contribution to the Photon AI registry — the unit
 * `PhotonAICommandRegistry.register` accepts. Each feature module owns its
 * own intent definitions end to end (matching phrases, entity extraction,
 * validation, command shape, and execution), so the engine classes
 * (`IntentParser`, `EntityResolver`, `CommandBuilder`, `CommandExecutor`)
 * never need to know about any specific feature.
 */
export interface IntentDefinition {
  /** Stable machine key, e.g. `"sortAscending"`. Becomes `PhotonCommand.type`. */
  readonly key: string;
  /**
   * Sets of keywords that indicate this intent. Each inner array is one
   * *phrase*: every word in it must appear somewhere in the input's token
   * set (order-independent — other words, like a column name, may sit
   * between them) for that phrase to count as matched. An intent matches
   * when any one of its phrases is fully covered; ties are broken by
   * preferring the phrase with the most words (the more specific match).
   *
   * @example `[['sort', 'ascending'], ['sort', 'asc'], ['ascending']]`
   */
  readonly aliases: readonly (readonly string[])[];
  /** Optional short human description — surfaced later by help/autocomplete UI. */
  readonly description?: string;
  /**
   * Extracts whatever entities this intent needs from the matched input's
   * tokens (with the matched alias words removed, see `IntentParser`).
   * Delegates all column/value lookup to the shared {@link EntityResolver}
   * rather than inspecting `columns` directly, so resolution logic (fuzzy
   * matching, etc.) lives in exactly one place.
   */
  resolveEntities(tokens: string[], resolver: EntityResolver, columns: ColumnDef[], api: GridApi): ResolvedEntities;
  /** Rejects entities that don't make sense for this intent (e.g. no column found). Return an error message to reject, `null` to proceed. */
  validate?(entities: ResolvedEntities): string | null;
  /** Builds the final command from validated entities. */
  buildCommand(entities: ResolvedEntities): PhotonCommand;
  /** Executes the command against the live `GridApi`, returning a short human-readable result message. */
  execute(command: PhotonCommand, api: GridApi): string;
}

/** What {@link IntentParser.parse} returns for the best-matching intent. */
export interface ParsedIntentMatch {
  readonly intent: IntentDefinition;
  /** The input tokens with the matched alias's words removed — what's left to resolve entities from. */
  readonly remainingTokens: string[];
}
