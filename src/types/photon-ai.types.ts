/**
 * Configuration for Photon AI — a deterministic natural-language command bar
 * for the grid. Photon AI is **not** an LLM: it is a rule-based interpreter
 * that normalizes text, matches it against a registry of known intents, and
 * translates the result into calls against the existing {@link GridApi} — no
 * network calls, no external AI services.
 *
 * @see {@link PhotonAIService} in `src/photon-ai/photon-ai-service.ts` for the
 * runtime pipeline this config drives.
 */
export interface PhotonAIConfig {
  /** Photon AI is otherwise fully inert — every consumer must opt in explicitly. */
  enabled: boolean;

  /** Placeholder text shown in the empty command input. @default "Ask Photon AI..." */
  placeholder?: string;

  /** Whether the panel starts open on grid mount. @default false */
  defaultOpen?: boolean;
}
