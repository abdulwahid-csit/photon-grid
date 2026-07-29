/**
 * The **Theme Generator** — turns a natural-language prompt into a complete,
 * validated theme. Single responsibility: prompt → LLM → validate → theme.
 *
 * @packageDocumentation
 */

import type { ThemeGenerationResult } from '../../types/theme-ai.types';
import { ThemeLlmClient, THEME_ACTION_TYPE, assembleTheme } from './theme-llm-client';
import type { ThemePromptBuilder } from './theme-prompt-builder';
import type { ThemeValidator } from './theme-validator';

/** Generates brand-new themes from a description. */
export class ThemeGenerator {
  constructor(
    private readonly client: ThemeLlmClient,
    private readonly prompts: ThemePromptBuilder,
    private readonly validator: ThemeValidator,
  ) {}

  /** Generate a fresh theme. Rejects (via {@link PhotonThemeError}) when no provider is configured. */
  async generate(prompt: string, signal?: AbortSignal): Promise<ThemeGenerationResult> {
    const params = await this.client.requestActionParams(
      this.prompts.buildSystemPrompt(),
      this.prompts.buildGeneratePrompt(prompt),
      THEME_ACTION_TYPE,
      signal,
    );
    const validation = this.validator.validate(params.variables);
    return {
      theme: assembleTheme(params, validation.variables, 'Generated theme'),
      applied: false,
      rejected: validation.rejected,
    };
  }
}
