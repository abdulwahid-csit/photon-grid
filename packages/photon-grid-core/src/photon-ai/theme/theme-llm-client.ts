/**
 * Thin client over the Photon AI provider for the theme flows. It reuses the
 * existing `PhotonAIProvider.generate()` seam unchanged — so JSON mode, timeout,
 * abort and JSON-recovery all come for free — and reads the theme (or
 * explanation) out of the provider's `{actions, reply}` envelope. All theme
 * services go through this one client, so provider concerns live in a single
 * place.
 *
 * @packageDocumentation
 */

import type { PhotonAIProvider, PhotonGridContext } from '../provider/ai-provider.types';
import type { GeneratedTheme } from '../../types/theme-ai.types';

/** The theme is transported as this action type (see ThemePromptBuilder). */
export const THEME_ACTION_TYPE = 'photonTheme';
/** The explanation is transported as this action type. */
export const EXPLAIN_ACTION_TYPE = 'photonThemeExplanation';

/** Minimal, empty grid context — the theme prompts need no grid data (keeps tokens low). */
const EMPTY_CONTEXT: PhotonGridContext = {
  columns: [],
  capabilities: [],
  state: {} as PhotonGridContext['state'],
};

/** Error thrown by the AI Theme Engine (e.g. no provider, or the model returned nothing usable). */
export class PhotonThemeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotonThemeError';
  }
}

/** Calls the LLM provider and extracts a named action's params. */
export class ThemeLlmClient {
  constructor(private readonly provider: PhotonAIProvider | null) {}

  /** Whether an LLM provider is configured. */
  hasProvider(): boolean {
    return this.provider !== null;
  }

  /**
   * Runs one provider call and returns the params of the first matching action.
   * @throws {@link PhotonThemeError} when no provider is configured or the model
   *   returned no usable action.
   */
  async requestActionParams(
    systemInstruction: string,
    userCommand: string,
    actionType: string,
    signal?: AbortSignal,
  ): Promise<Record<string, unknown>> {
    if (!this.provider) {
      throw new PhotonThemeError(
        'AI provider not configured. Set GridOptions.photonAI.provider to use AI theme generation.',
      );
    }

    const response = await this.provider.generate({
      systemInstruction,
      gridContext: EMPTY_CONTEXT,
      userCommand,
      signal,
    });

    const action =
      response.actions.find((a) => a.type === actionType) ?? response.actions[0];
    if (!action) {
      throw new PhotonThemeError('The AI response did not contain a theme.');
    }
    return action.params as Record<string, unknown>;
  }
}

/** Reads a string field from raw params with a fallback. */
export function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

/** Assembles a {@link GeneratedTheme} from raw action params + already-validated variables. */
export function assembleTheme(
  params: Record<string, unknown>,
  variables: Readonly<Record<string, string>>,
  fallbackName = 'Untitled theme',
): GeneratedTheme {
  return {
    themeName: readString(params.themeName, fallbackName),
    description: readString(params.description),
    variables,
  };
}
