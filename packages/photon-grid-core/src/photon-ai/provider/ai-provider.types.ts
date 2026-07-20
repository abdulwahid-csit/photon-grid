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
 */
export interface PhotonAIColumnContext {
  /** Stable machine id — the value the model must echo back in a command's `colId`/`colIds`. */
  readonly colId: string;
  /** Human-facing column title (what the user is most likely to type). */
  readonly header: string;
  /** Underlying data field key. */
  readonly field: string;
  /** Data type — tells the model which filter operators and value formats make sense. */
  readonly type: ColumnDataType;
  readonly sortable: boolean;
  readonly filterable: boolean;
  readonly groupable: boolean;
  /** Current pin side, or `null` when unpinned. */
  readonly pinned: ColumnPinPosition;
  readonly visible: boolean;
  /**
   * Allowed values for `dropdown`/`enum`-style columns, so the model filters
   * by a value that actually exists rather than guessing. Omitted for
   * free-form columns.
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

/** A concise, model-friendly snapshot of the grid's live state at prompt time. */
export interface PhotonAIGridState {
  readonly totalRowCount: number;
  readonly visibleRowCount: number;
  readonly sort: readonly PhotonAISortState[];
  readonly filters: readonly PhotonAIFilterState[];
  readonly groupedColumns: readonly string[];
  readonly selectedRowCount: number;
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
 */
export interface PhotonGridContext {
  readonly columns: readonly PhotonAIColumnContext[];
  readonly capabilities: readonly PhotonAICapability[];
  readonly state: PhotonAIGridState;
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
