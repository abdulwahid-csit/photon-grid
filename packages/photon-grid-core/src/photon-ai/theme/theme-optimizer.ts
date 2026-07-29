/**
 * The **Theme Optimizer** — intelligently adjusts the current theme toward goals
 * like accessibility, contrast, spacing or reduced visual noise. Like the
 * modifier, it merges a validated delta onto the current theme.
 *
 * @packageDocumentation
 */

import type {
  GeneratedTheme,
  ThemeGenerationResult,
  ThemeOptimizeOptions,
} from '../../types/theme-ai.types';
import { ThemeLlmClient, THEME_ACTION_TYPE, readString } from './theme-llm-client';
import type { ThemePromptBuilder } from './theme-prompt-builder';
import type { ThemeValidator } from './theme-validator';

/** Optimizes the current theme toward the requested goals. */
export class ThemeOptimizer {
  constructor(
    private readonly client: ThemeLlmClient,
    private readonly prompts: ThemePromptBuilder,
    private readonly validator: ThemeValidator,
  ) {}

  /** Optimize `current` per `options` (accessibility/contrast/spacing/…). */
  async optimize(
    options: ThemeOptimizeOptions,
    current: GeneratedTheme | null,
    signal?: AbortSignal,
  ): Promise<ThemeGenerationResult> {
    const params = await this.client.requestActionParams(
      this.prompts.buildSystemPrompt(),
      this.prompts.buildOptimizePrompt(options, current),
      THEME_ACTION_TYPE,
      signal,
    );
    const validation = this.validator.validate(params.variables);
    return {
      theme: {
        themeName: readString(params.themeName, current?.themeName ?? 'Optimized theme'),
        description: readString(params.description, current?.description ?? ''),
        variables: { ...(current?.variables ?? {}), ...validation.variables },
      },
      applied: false,
      rejected: validation.rejected,
    };
  }
}
