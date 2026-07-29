/**
 * The **Photon Theme Engine** — the facade that composes every theme service and
 * implements the public {@link PhotonThemeApi} exposed as `gridApi.photonAI`. It
 * owns the current theme, history, and live-preview wiring; each capability is
 * delegated to a focused single-responsibility service.
 *
 * LLM-backed methods (generate/modify/optimize/explain) require a configured
 * provider and reject with a {@link PhotonThemeError} otherwise; preview, apply,
 * export, import, history and registry access all work fully offline.
 *
 * @packageDocumentation
 */

import type { EventBus } from '../../event-bus/event-bus';
import { GridEventType } from '../../types/event.types';
import type { ThemeManager } from '../../theme/theme-manager';
import type { PhotonAIProvider } from '../provider/ai-provider.types';
import type {
  GeneratedTheme,
  PhotonThemeApi,
  ThemeExplanation,
  ThemeExportFormat,
  ThemeGenerateParams,
  ThemeGenerationResult,
  ThemeHistoryEntry,
  ThemeModifyParams,
  ThemeOptimizeOptions,
  ThemeVariableRegistryReader,
} from '../../types/theme-ai.types';

import { ThemeVariableRegistry } from './theme-variable-registry';
import { ThemeValidator } from './theme-validator';
import { ThemePromptBuilder } from './theme-prompt-builder';
import { ThemeLlmClient, PhotonThemeError } from './theme-llm-client';
import { ThemeGenerator } from './theme-generator';
import { ThemeModifier } from './theme-modifier';
import { ThemeOptimizer } from './theme-optimizer';
import { ThemeExplainer } from './theme-explainer';
import { ThemeHistoryService } from './theme-history-service';
import { ThemeExporter } from './theme-exporter';
import { ThemeImporter } from './theme-importer';
import { ThemePreviewService } from './theme-preview-service';

export { PhotonThemeError } from './theme-llm-client';

/** Composition root + public facade for the AI Theme Engine. */
export class PhotonThemeEngine implements PhotonThemeApi {
  private readonly registry: ThemeVariableRegistry;
  private readonly client: ThemeLlmClient;
  private readonly generator: ThemeGenerator;
  private readonly modifier: ThemeModifier;
  private readonly optimizer: ThemeOptimizer;
  private readonly explainer: ThemeExplainer;
  private readonly history = new ThemeHistoryService();
  private readonly exporter = new ThemeExporter();
  private readonly importer: ThemeImporter;
  private readonly preview: ThemePreviewService;

  private currentTheme: GeneratedTheme | null = null;

  constructor(
    provider: PhotonAIProvider | null,
    themeManager: ThemeManager,
    containerEl: HTMLElement,
    private readonly eventBus: EventBus,
    registry: ThemeVariableRegistry = new ThemeVariableRegistry(),
  ) {
    this.registry = registry;
    const validator = new ThemeValidator(registry);
    const prompts = new ThemePromptBuilder(registry);
    this.client = new ThemeLlmClient(provider);
    this.generator = new ThemeGenerator(this.client, prompts, validator);
    this.modifier = new ThemeModifier(this.client, prompts, validator);
    this.optimizer = new ThemeOptimizer(this.client, prompts, validator);
    this.explainer = new ThemeExplainer(this.client, prompts);
    this.importer = new ThemeImporter(validator);
    this.preview = new ThemePreviewService(themeManager, containerEl);
  }

  // ── LLM-backed ──────────────────────────────────────────────────────────────

  async generateTheme(params: ThemeGenerateParams): Promise<ThemeGenerationResult> {
    return this.runGeneration(() => this.generator.generate(params.prompt, params.signal), params.preview);
  }

  async modifyTheme(params: ThemeModifyParams): Promise<ThemeGenerationResult> {
    return this.runGeneration(
      () => this.modifier.modify(params.prompt, this.currentTheme, params.signal),
      params.preview,
    );
  }

  async optimizeTheme(options: ThemeOptimizeOptions): Promise<ThemeGenerationResult> {
    return this.runGeneration(
      () => this.optimizer.optimize(options, this.currentTheme, options.signal),
      options.preview,
    );
  }

  async explainTheme(theme?: GeneratedTheme, signal?: AbortSignal): Promise<ThemeExplanation> {
    const target = theme ?? this.currentTheme;
    if (!target) throw new PhotonThemeError('No theme to explain — generate or apply a theme first.');
    return this.explainer.explain(target, signal);
  }

  // ── Preview / apply ──────────────────────────────────────────────────────────

  previewTheme(theme: GeneratedTheme): void {
    this.preview.apply(theme.variables);
  }

  applyTheme(theme: GeneratedTheme): void {
    this.currentTheme = theme;
    this.history.push(theme);
    this.preview.apply(theme.variables);
    this.eventBus.emit(GridEventType.THEME_AI_APPLIED, { theme });
  }

  clearPreview(): void {
    this.preview.clear();
    // Revert to the last applied theme (not all the way to base) if there is one.
    if (this.currentTheme) this.preview.apply(this.currentTheme.variables);
  }

  // ── Export / import ────────────────────────────────────────────────────────────

  exportTheme(format: ThemeExportFormat = 'json', theme?: GeneratedTheme): string {
    const target = theme ?? this.currentTheme;
    if (!target) throw new PhotonThemeError('No theme to export.');
    return this.exporter.export(target, format);
  }

  importTheme(source: string | GeneratedTheme): GeneratedTheme {
    const theme = this.importer.import(source);
    this.applyTheme(theme);
    return theme;
  }

  // ── History ────────────────────────────────────────────────────────────────────

  undo(): GeneratedTheme | null {
    return this.applyHistoryState(this.history.undo());
  }

  redo(): GeneratedTheme | null {
    return this.applyHistoryState(this.history.redo());
  }

  reset(): void {
    this.history.reset();
    this.currentTheme = null;
    this.preview.clear();
    this.eventBus.emit(GridEventType.THEME_AI_APPLIED, { theme: null });
  }

  restore(index: number): GeneratedTheme | null {
    return this.applyHistoryState(this.history.restore(index));
  }

  getHistory(): readonly ThemeHistoryEntry[] {
    return this.history.getAll();
  }

  // ── Introspection ────────────────────────────────────────────────────────────

  getRegistry(): ThemeVariableRegistryReader {
    return this.registry;
  }

  getCurrentTheme(): GeneratedTheme | null {
    return this.currentTheme;
  }

  hasProvider(): boolean {
    return this.client.hasProvider();
  }

  /**
   * Routes a Photon AI panel message to the theme engine when it is a theming
   * request, generating or modifying the theme and applying it live. Returns
   * `{ handled: false }` for non-theme messages so the caller falls back to the
   * grid-command AI. Classification is a lightweight lexical gate — the actual
   * theme design is fully LLM-driven, never keyword-derived.
   */
  async handlePanelCommand(
    text: string,
    signal?: AbortSignal,
  ): Promise<{ handled: boolean; message: string }> {
    if (!isThemeRequest(text)) return { handled: false, message: '' };
    if (!this.hasProvider()) {
      return { handled: true, message: 'Theme generation needs a configured AI provider.' };
    }
    const result =
      this.currentTheme && isModifyRequest(text)
        ? await this.modifier.modify(text, this.currentTheme, signal)
        : await this.generator.generate(text, signal);
    this.applyTheme(result.theme);
    const dropped = result.rejected.length ? ` (${result.rejected.length} value(s) ignored)` : '';
    return {
      handled: true,
      message: `Applied "${result.theme.themeName}". ${result.theme.description}${dropped}`,
    };
  }

  // ── internals ──────────────────────────────────────────────────────────────────

  /** Runs a generation, optionally applies it, and reports errors as an event. */
  private async runGeneration(
    run: () => Promise<ThemeGenerationResult>,
    preview?: boolean,
  ): Promise<ThemeGenerationResult> {
    try {
      const result = await run();
      if (preview) {
        this.applyTheme(result.theme);
        return { ...result, applied: true };
      }
      return result;
    } catch (error) {
      this.eventBus.emit(GridEventType.THEME_AI_ERROR, {
        message: error instanceof Error ? error.message : 'AI theme request failed.',
        error,
      });
      throw error;
    }
  }

  /** Applies a history navigation result (theme or `null` = base) to the grid. */
  private applyHistoryState(theme: GeneratedTheme | null): GeneratedTheme | null {
    this.currentTheme = theme;
    if (theme) this.preview.apply(theme.variables);
    else this.preview.clear();
    this.eventBus.emit(GridEventType.THEME_AI_APPLIED, { theme });
    return theme;
  }
}

/** Named design systems / vibes that should always route to the theme engine. */
const NAMED_THEME_RE =
  /\b(github|vs ?code|excel|material|fluent|glassmorphism|neon|cyberpunk|spotify|discord|notion|jira|tableau|power ?bi|banking|healthcare|crm|erp|enterprise)\b/i;
const STYLE_VERB_RE =
  /\b(make|change|set|increase|decrease|reduce|darken|lighten|round|recolou?r|use|design|generate|apply|give|turn|adjust)\b/i;
const STYLE_TARGET_RE =
  /\b(header|rows?|border|selection|hover|colou?r|contrast|spacing|font|shadow|corner|background|scrollbar|accent|grid)\b/i;
const STYLE_ADJ_RE =
  /\b(green|blue|red|purple|emerald|teal|dark|light|modern|minimal|thinner|thicker|rounded|bigger|larger|smaller|vibrant|muted|clean)\b/i;

/** Lexical gate: is this panel message a theming request (vs a grid command)? */
function isThemeRequest(text: string): boolean {
  const t = text.toLowerCase();
  if (/\btheme\b/.test(t) || NAMED_THEME_RE.test(t)) return true;
  return STYLE_VERB_RE.test(t) && (STYLE_TARGET_RE.test(t) || STYLE_ADJ_RE.test(t));
}

/** Whether the request is an incremental change to the current theme (vs a fresh one). */
function isModifyRequest(text: string): boolean {
  return (
    /\b(make|change|set|increase|decrease|reduce|darken|lighten|round|recolou?r|adjust|more|less|thinner|thicker|bigger|smaller)\b/i.test(text) &&
    !/\b(create|generate|design|build|new theme)\b/i.test(text)
  );
}
