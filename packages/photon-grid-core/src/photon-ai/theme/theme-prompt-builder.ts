/**
 * The **Theme Prompt Builder** — assembles the compact, deterministic prompts
 * the LLM receives. It keeps the token budget small by sending the variable
 * *catalog* (names + types, grouped by category) rather than 200 raw CSS
 * variables or any application context, and it pins the exact JSON output
 * contract so responses are machine-parseable.
 *
 * The output contract intentionally reuses the Photon AI provider's existing
 * `{ actions, reply }` envelope so no provider change is needed: the theme is
 * returned as a single `photonTheme` action's params.
 *
 * @packageDocumentation
 */

import { ThemeCategory } from '../../types/theme-ai.types';
import type {
  GeneratedTheme,
  ThemeOptimizeOptions,
  ThemeVariableRegistryReader,
} from '../../types/theme-ai.types';
import { THEME_ACTION_TYPE, EXPLAIN_ACTION_TYPE } from './theme-llm-client';

/** Builds system + user prompts for the theme-generation flows. */
export class ThemePromptBuilder {
  constructor(private readonly registry: ThemeVariableRegistryReader) {}

  /**
   * The stable system instruction: role, hard rules, the JSON output contract,
   * and the full allowed-variable catalog. Sent once per request as the system
   * turn; the catalog is what makes "never invent variables / never emit CSS"
   * enforceable.
   */
  buildSystemPrompt(): string {
    return [
      'You are the Photon Grid Theme Designer. You translate a natural-language request into a Photon Grid theme.',
      '',
      'HARD RULES:',
      '- Respond with ONLY a single JSON object. No markdown, no prose, no code fences.',
      '- Never output CSS, SCSS, LESS, or HTML.',
      '- Never invent variable names or categories. Use ONLY variables from the ALLOWED VARIABLES list below.',
      '- Every value must be valid for that variable\'s type (color / size / opacity / shadow / font / duration / easing / number).',
      '- Colors: hex, rgb()/rgba()/hsl()/hsla(), or a CSS color keyword. Sizes: number + px/rem/em/%. Never include ";" or "{" or "}".',
      '- Choose accessible, harmonious values with sufficient text/background contrast.',
      '',
      'OUTPUT CONTRACT — return exactly this shape:',
      '{"actions":[{"type":"' + THEME_ACTION_TYPE + '","params":{"themeName":"<name>","description":"<one line>","variables":{"--pg-...":"<value>"}}}],"reply":"<one short sentence>"}',
      '',
      'ALLOWED VARIABLES — the complete themeable token set with each token\'s',
      'purpose (name), value type, and its CURRENT BASE VALUE. Analyze these to',
      'decide which variables control which colours/sizes and to keep a cohesive,',
      'accessible palette. You may only output variables from this list:',
      this.buildCatalog(),
    ].join('\n');
  }

  /** User turn for a fresh theme. */
  buildGeneratePrompt(prompt: string): string {
    return `Create a complete Photon Grid theme for this request:\n"${sanitize(prompt)}"\nSet every relevant variable across all categories for a cohesive look.`;
  }

  /**
   * User turn for a modification. Includes the current values so the model
   * changes only what the request implies and leaves the rest alone.
   */
  buildModifyPrompt(prompt: string, current: GeneratedTheme | null): string {
    const lines = [
      `Modify the current theme to satisfy this request:\n"${sanitize(prompt)}"\nReturn ONLY the variables that should change; do not restate unchanged variables.`,
    ];
    if (current && Object.keys(current.variables).length > 0) {
      lines.push('', 'CURRENT THEME VALUES:', JSON.stringify(current.variables));
    }
    return lines.join('\n');
  }

  /** User turn for an optimization pass over the current theme. */
  buildOptimizePrompt(options: ThemeOptimizeOptions, current: GeneratedTheme | null): string {
    const goals: string[] = [];
    if (options.accessibility) goals.push('improve accessibility (WCAG AA contrast)');
    if (options.contrast) goals.push('increase contrast');
    if (options.readability) goals.push('improve readability');
    if (options.spacing) goals.push('increase spacing / row height for breathing room');
    if (options.reduceNoise) goals.push('reduce visual noise (softer borders, calmer surfaces)');
    if (options.darkenBorders) goals.push('darken borders for clearer structure');
    if (goals.length === 0) goals.push('improve overall polish and accessibility');

    const lines = [
      `Optimize the current theme to: ${goals.join('; ')}.`,
      'Return ONLY the variables that should change.',
    ];
    if (current && Object.keys(current.variables).length > 0) {
      lines.push('', 'CURRENT THEME VALUES:', JSON.stringify(current.variables));
    }
    return lines.join('\n');
  }

  /**
   * System + user prompts for an explanation. The explainer wants prose, not a
   * theme, so it overrides the output contract to a small JSON explanation.
   */
  buildExplainSystemPrompt(): string {
    return [
      'You are the Photon Grid Theme Designer. Explain an existing theme\'s design choices concisely.',
      'Respond with ONLY this JSON object (no markdown, no code fences):',
      '{"actions":[{"type":"' + EXPLAIN_ACTION_TYPE + '","params":{"summary":"...","colors":"...","accessibility":"...","spacing":"...","typography":"..."}}],"reply":"ok"}',
      'Each params field is 1-2 sentences. Be specific about contrast and readability.',
    ].join('\n');
  }

  /** User turn for an explanation of the given theme. */
  buildExplainPrompt(theme: GeneratedTheme): string {
    return `Explain this Photon Grid theme "${sanitize(theme.themeName)}":\n${JSON.stringify(theme.variables)}`;
  }

  /**
   * Full per-category catalog: every variable with its human name, value type
   * and current base value, so the model can reason about what each token does
   * and which to change (`--pg-colors-header-background = #f8fafc  (Header
   * background, color)`).
   */
  private buildCatalog(): string {
    const lines: string[] = [];
    for (const category of Object.values(ThemeCategory)) {
      const vars = this.registry.getByCategory(category);
      if (vars.length === 0) continue;
      lines.push(`\n## ${category}`);
      for (const v of vars) {
        lines.push(`${v.cssVar} = ${v.defaultValue}  (${v.name}, ${v.type})`);
      }
    }
    return lines.join('\n');
  }
}

/** Strips quotes/braces from user text so it can't break the prompt's JSON framing. */
function sanitize(text: string): string {
  return text.replace(/["{}]/g, '').slice(0, 500);
}
