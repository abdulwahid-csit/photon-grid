/**
 * The **Theme Modifier** — applies a conversational change to the current theme,
 * touching only the variables the request implies and merging the validated
 * delta onto the existing theme so everything else is preserved.
 *
 * @packageDocumentation
 */

import type { GeneratedTheme, ThemeGenerationResult } from '../../types/theme-ai.types';
import { ThemeLlmClient, THEME_ACTION_TYPE, readString } from './theme-llm-client';
import type { ThemePromptBuilder } from './theme-prompt-builder';
import type { ThemeValidator } from './theme-validator';

/** Applies incremental, natural-language edits to the current theme. */
export class ThemeModifier {
  constructor(
    private readonly client: ThemeLlmClient,
    private readonly prompts: ThemePromptBuilder,
    private readonly validator: ThemeValidator,
  ) {}

  /** Modify `current` per `prompt`; only implied variables change. */
  async modify(
    prompt: string,
    current: GeneratedTheme | null,
    signal?: AbortSignal,
  ): Promise<ThemeGenerationResult> {
    const params = await this.client.requestActionParams(
      this.prompts.buildSystemPrompt(),
      this.prompts.buildModifyPrompt(prompt, current),
      THEME_ACTION_TYPE,
      signal,
    );
    const validation = this.validator.validate(params.variables);
    return {
      theme: {
        themeName: readString(params.themeName, current?.themeName ?? 'Modified theme'),
        description: readString(params.description, current?.description ?? ''),
        // Merge the validated delta on top of the current theme.
        variables: { ...(current?.variables ?? {}), ...validation.variables },
      },
      applied: false,
      rejected: validation.rejected,
    };
  }
}
