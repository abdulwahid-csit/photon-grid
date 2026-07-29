/**
 * The **Theme Explainer** — asks the LLM to describe a theme's colour, contrast,
 * spacing and typography choices, returning a structured {@link ThemeExplanation}.
 *
 * @packageDocumentation
 */

import type { GeneratedTheme, ThemeExplanation } from '../../types/theme-ai.types';
import { ThemeLlmClient, EXPLAIN_ACTION_TYPE, readString } from './theme-llm-client';
import type { ThemePromptBuilder } from './theme-prompt-builder';

/** Produces human-readable explanations of a theme. */
export class ThemeExplainer {
  constructor(
    private readonly client: ThemeLlmClient,
    private readonly prompts: ThemePromptBuilder,
  ) {}

  /** Explain the given theme's design decisions. */
  async explain(theme: GeneratedTheme, signal?: AbortSignal): Promise<ThemeExplanation> {
    const params = await this.client.requestActionParams(
      this.prompts.buildExplainSystemPrompt(),
      this.prompts.buildExplainPrompt(theme),
      EXPLAIN_ACTION_TYPE,
      signal,
    );
    return {
      summary: readString(params.summary),
      colors: readString(params.colors),
      accessibility: readString(params.accessibility),
      spacing: readString(params.spacing),
      typography: readString(params.typography),
    };
  }
}
