import type { ColumnDataType, ColumnPinPosition } from '../../types/column.types';

/**
 * The runtime contracts shared by every Photon AI generative provider. These
 * types are intentionally provider-agnostic: {@link PhotonAIService} builds a
 * {@link PhotonAIProviderRequest}, hands it to whichever {@link PhotonAIProvider}
 * is configured, and executes the returned {@link PhotonAIGeneration} through
 * the same command pipeline used by the deterministic interpreter — so a new
 * back-end (Gemini today, another model tomorrow) only ever implements
 * {@link PhotonAIProvider.generate}, never touches the grid.
 */

/**
 * One column, distilled to exactly what a language model needs to choose a
 * target and a valid value. Deliberately excludes render functions, widths,
 * and other presentation-only fields — sending them would waste tokens and
 * leak irrelevant internals into the prompt.
 *
 * The capability flags and `options` are all optional and emitted only when a
 * routed domain needs them: `sortable` goes out for sort requests, `pinned` for
 * pinning requests, `options` for filtering. Across a wide grid this is the
 * single largest saving in the whole context, since it multiplies per column.
 */
export interface PhotonAIColumnContext {
  /** Stable machine id — the value the model must echo back in a command's `colId`/`colIds`. */
  readonly colId: string;
  /** Human-facing column title (what the user is most likely to type). */
  readonly header: string;
  /** Underlying data field key. Omitted when identical to `colId` (the common case). */
  readonly field?: string;
  /** Data type — tells the model which filter operators and value formats make sense. */
  readonly type: ColumnDataType;
  readonly sortable?: boolean;
  readonly filterable?: boolean;
  readonly groupable?: boolean;
  /** Current pin side, or `null` when unpinned. */
  readonly pinned?: ColumnPinPosition;
  readonly visible?: boolean;
  /**
   * Allowed values for `dropdown`/`enum`-style columns, so the model filters
   * by a value that actually exists rather than guessing. Omitted for
   * free-form columns and for domains that never compare values.
   */
  readonly options?: readonly (string | number)[];
}

/**
 * A single grid action the model is allowed to emit, mirrored 1:1 from the
 * live intent registry so the catalog can never drift from what the grid can
 * actually execute. `type` is the intent key the model must reproduce in a
 * command; `description` is the human blurb registered with that intent.
 */
export interface PhotonAICapability {
  readonly type: string;
  readonly description: string;
}

/**
 * A concise, model-friendly snapshot of the grid's live state at prompt time.
 *
 * Every field beyond the row counts is optional: the context router omits the
 * slices no in-scope domain needs, so a "hide the id column" request carries no
 * sort array, no filter summaries, and no grouping list. Omitted (rather than
 * empty) is deliberate — an empty array still costs tokens and, worse, reads to
 * the model as a positive assertion that nothing is sorted/filtered.
 */
export interface PhotonAIGridState {
  readonly totalRowCount: number;
  readonly visibleRowCount: number;
  readonly sort?: readonly PhotonAISortState[];
  readonly filters?: readonly PhotonAIFilterState[];
  readonly groupedColumns?: readonly string[];
  readonly selectedRowCount?: number;
}

export interface PhotonAISortState {
  readonly colId: string;
  readonly order: 'asc' | 'desc';
}

export interface PhotonAIFilterState {
  readonly colId: string;
  /** Short human summary of the active condition, e.g. `greaterThan 5000`. */
  readonly summary: string;
}

/**
 * Everything about the grid the model receives alongside the user's command:
 * what columns exist, what actions are possible, and what state the grid is
 * currently in. Built fresh per request by {@link PhotonAIService} so the
 * model always reasons over the grid's *current* shape.
 *
 * Since context routing was introduced this is a *scoped* view: only the
 * capabilities, columns, and state slices relevant to the classified request
 * are populated (see {@link PhotonAIContextScope}). A sort request no longer
 * carries filter operators, pin state, or every column's flags.
 */
export interface PhotonGridContext {
  readonly columns: readonly PhotonAIColumnContext[];
  readonly capabilities: readonly PhotonAICapability[];
  readonly state: PhotonAIGridState;
}

/**
 * The functional areas a user request can touch. Each domain owns a slice of
 * the grid context and a slice of the system prompt, so classifying a prompt
 * into domains is what lets Photon AI send only what the model actually needs.
 *
 * Domains are deliberately coarse — one per user-visible grid concept — because
 * the goal is to exclude *most* of the context, not to hair-split which of two
 * neighbouring capabilities applies. Over-including within a domain is cheap;
 * under-including across domains breaks the request.
 */
export enum PhotonAIDomain {
  /** Sorting: ascending/descending/clear, plus current sort state. */
  Sort = 'sort',
  /** Filtering: operators, values, current filter state. The costliest domain. */
  Filter = 'filter',
  /** Column visibility: hide/show. */
  Visibility = 'visibility',
  /** Column pinning: left/right/unpin. */
  Pinning = 'pinning',
  /** Row grouping and group expand/collapse. */
  Grouping = 'grouping',
  /** Row/cell/column selection and clipboard. */
  Selection = 'selection',
  /** Column reordering (move to start/end). */
  Layout = 'layout',
  /** Questions about the grid's own state (counts, "what's sorted?", help). */
  Info = 'info',
}

/**
 * The resolved plan for one prompt: which domains to include, and whether the
 * column list can be narrowed to specific columns the user named.
 */
export interface PhotonAIContextScope {
  /** Domains whose capabilities, state, and prompt sections must be sent. */
  readonly domains: ReadonlySet<PhotonAIDomain>;
  /**
   * `colId`s the request appears to reference. When non-empty the context
   * carries only these columns; when empty every column is sent (the request
   * is either grid-wide or too ambiguous to narrow safely).
   */
  readonly columnIds: readonly string[];
  /**
   * `true` when the classifier could not confidently attribute the prompt to
   * any domain and fell back to sending everything. Surfaced for telemetry and
   * tests — a rising rate here means the alias catalog needs widening.
   */
  readonly fellBack: boolean;
}

/**
 * One executable instruction returned by the model. Structurally identical to
 * a {@link import('../photon-ai.types').PhotonCommand} — `type` is an intent
 * key from the capability catalog and `params` carries that intent's inputs —
 * so a generated action flows straight into the existing `CommandExecutor`
 * after light normalization.
 */
export interface PhotonAIAction {
  readonly type: string;
  readonly params: Readonly<Record<string, unknown>>;
}

/** The parsed, validated result of one provider call. */
export interface PhotonAIGeneration {
  /** Zero or more grid actions to execute, in order. Empty for a pure conversational reply. */
  readonly actions: readonly PhotonAIAction[];
  /** Natural-language message to show the user (streamed into the panel). */
  readonly reply: string;
}

/**
 * The provider-neutral, transformer-facing view of one prompt. This is what a
 * consumer's {@link import('../../types/photon-ai.types').PhotonAIProviderConfig.requestTransformer}
 * receives — everything needed to build any provider's request body, with no
 * transport concern (URL, headers, auth) leaking in.
 */
export interface PhotonAIRequest {
  /** The assembled system instruction (role + output contract + any extra guidance). */
  readonly systemInstruction: string;
  /** The raw user command typed into the panel. */
  readonly userCommand: string;
  /** Structured grid context (columns, capabilities, live state). */
  readonly gridContext: PhotonGridContext;
  /** Resolved model id for this request. */
  readonly model: string;
  /** Resolved sampling temperature for this request. */
  readonly temperature: number;
}

/**
 * The provider-neutral, transformer-facing result. A consumer's
 * {@link import('../../types/photon-ai.types').PhotonAIProviderConfig.responseTransformer}
 * must return this shape from whatever the provider's raw JSON looked like.
 * Identical in structure to {@link PhotonAIGeneration}.
 */
export type PhotonAIResponse = PhotonAIGeneration;

/**
 * What a provider receives. The service assembles the {@link systemInstruction}
 * (role + output contract) and the structured {@link gridContext}; the provider
 * decides how to serialize them into its own wire format and how to call its
 * endpoint.
 */
export interface PhotonAIProviderRequest {
  readonly systemInstruction: string;
  readonly gridContext: PhotonGridContext;
  readonly userCommand: string;
  /** Optional cooperative cancellation (e.g. panel closed mid-flight). */
  readonly signal?: AbortSignal;
}

/**
 * The one method every generative back-end implements. Must resolve with a
 * validated {@link PhotonAIResponse} or reject with a
 * {@link PhotonAIProviderError} — never leak a raw transport error to the UI.
 */
export interface PhotonAIProvider {
  generate(request: PhotonAIProviderRequest): Promise<PhotonAIResponse>;
}

/** Categorized failure reason, so the panel can show an actionable message rather than a stack trace. */
export enum PhotonAIErrorKind {
  /** The request never reached the provider (offline, DNS, CORS). */
  Network = 'network',
  /** Provider returned a non-2xx status not covered by a more specific kind. */
  Http = 'http',
  /** HTTP 429 / quota exhausted. */
  RateLimit = 'rate-limit',
  /** HTTP 401/403 — missing, invalid, or unauthorized API key. */
  Auth = 'auth',
  /** The model refused or its output was safety-blocked. */
  Blocked = 'blocked',
  /** Response arrived but could not be parsed into a {@link PhotonAIGeneration}. */
  InvalidResponse = 'invalid-response',
  /** The request exceeded {@link import('../../types/photon-ai.types').PhotonAIProviderConfig.requestTimeoutMs}. */
  Timeout = 'timeout',
}

/**
 * The single error type providers throw. Carries a machine-readable
 * {@link PhotonAIErrorKind} (for retry/telemetry decisions) plus a
 * user-facing message the panel can display verbatim.
 */
export class PhotonAIProviderError extends Error {
  constructor(
    readonly kind: PhotonAIErrorKind,
    message: string,
    /** Upstream HTTP status, when the failure originated from an HTTP response. */
    readonly status?: number,
  ) {
    super(message);
    this.name = 'PhotonAIProviderError';
  }
}

/** A short, friendly one-liner for each failure kind, used when a provider throws to the panel. */
export function describeProviderError(error: unknown): string {
  if (error instanceof PhotonAIProviderError) return error.message;
  if (error instanceof Error) return `Photon AI request failed: ${error.message}`;
  return 'Photon AI request failed due to an unexpected error.';
}
