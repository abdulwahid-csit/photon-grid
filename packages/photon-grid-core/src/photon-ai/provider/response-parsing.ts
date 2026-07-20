import { serializeGridContext } from './system-prompt';
import {
  PhotonAIErrorKind,
  PhotonAIProviderError,
  type PhotonAIAction,
  type PhotonAIRequest,
  type PhotonAIResponse,
} from './ai-provider.types';

/**
 * Provider-agnostic helpers for turning a model's raw text/JSON into a
 * validated {@link PhotonAIResponse}, and for composing the user turn. Shared
 * by every built-in provider preset so the JSON-recovery and validation logic
 * lives in exactly one place regardless of which API produced the text.
 */

/** The prompt text for the user turn: serialized grid context followed by the command. Reused by every preset. */
export function buildUserPromptText(request: PhotonAIRequest): string {
  return `${serializeGridContext(request.gridContext)}\n\nUSER COMMAND:\n${request.userCommand}`;
}

/**
 * Parses the model's JSON *text* into a {@link PhotonAIResponse}. Tolerant of
 * stray characters around the JSON object (some models wrap it), and validates
 * that the result carries at least an action or a reply.
 */
export function parseGenerationText(text: string): PhotonAIResponse {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new PhotonAIProviderError(PhotonAIErrorKind.InvalidResponse, 'The model returned an empty response.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    parsed = tryRecoverJsonObject(trimmed);
    if (parsed === undefined) {
      throw new PhotonAIProviderError(
        PhotonAIErrorKind.InvalidResponse,
        'The model returned malformed JSON that could not be parsed.',
      );
    }
  }

  return coerceGeneration(parsed);
}

/** Validates and normalizes an already-parsed JSON value into a {@link PhotonAIResponse}. Used by response transformers that receive an object. */
export function coerceGeneration(parsed: unknown): PhotonAIResponse {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new PhotonAIProviderError(PhotonAIErrorKind.InvalidResponse, 'The model response was not a JSON object.');
  }

  const record = parsed as Record<string, unknown>;
  const actions = normalizeActions(record.actions);
  const reply = typeof record.reply === 'string' ? record.reply.trim() : '';

  if (actions.length === 0 && !reply) {
    throw new PhotonAIProviderError(
      PhotonAIErrorKind.InvalidResponse,
      'The model response contained neither an action nor a reply.',
    );
  }

  return { actions, reply };
}

/** Coerces the raw `actions` field into a validated, well-typed array — dropping any malformed entries. */
export function normalizeActions(raw: unknown): readonly PhotonAIAction[] {
  if (!Array.isArray(raw)) return [];
  const actions: PhotonAIAction[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.type !== 'string' || !record.type) continue;
    const params =
      typeof record.params === 'object' && record.params !== null
        ? (record.params as Record<string, unknown>)
        : {};
    actions.push({ type: record.type, params });
  }
  return actions;
}

/** Last-ditch recovery: extract the first balanced `{...}` object from noisy model text. Returns `undefined` when none parses. */
export function tryRecoverJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}
