/**
 * Public type surface for the Photon Grid **AI Theme Engine** — the subsystem
 * that turns natural-language requests ("create a GitHub dark theme", "make the
 * header emerald green", "improve accessibility") into valid Photon Grid themes.
 *
 * The engine never emits arbitrary CSS: it operates exclusively on Photon's real
 * design tokens (the `--pg-*` CSS variables produced by the theme system), which
 * are catalogued in a strongly-typed {@link ThemeVariable} registry and enforced
 * by a validator. These types are DOM- and framework-free so they can be shared
 * across every wrapper and unit-tested in isolation.
 *
 * @packageDocumentation
 */

/**
 * Functional grouping for theme variables, so the UI (and the LLM) reason about
 * a handful of meaningful categories instead of a flat list of ~100 variables.
 */
export enum ThemeCategory {
  Accent = 'accent',
  Surface = 'surface',
  Header = 'header',
  Rows = 'rows',
  Cells = 'cells',
  Borders = 'borders',
  Fonts = 'fonts',
  Selection = 'selection',
  Hover = 'hover',
  Focus = 'focus',
  Scrollbar = 'scrollbar',
  Footer = 'footer',
  Filters = 'filters',
  Checkbox = 'checkbox',
  Grouping = 'grouping',
  Tooltip = 'tooltip',
  Drag = 'drag',
  Status = 'status',
  Spacing = 'spacing',
  Motion = 'motion',
  Pinned = 'pinned',
}

/** The value grammar a theme variable accepts — drives validation and prompt hints. */
export enum ThemeVariableType {
  Color = 'color',
  Size = 'size',
  Number = 'number',
  Opacity = 'opacity',
  Shadow = 'shadow',
  FontFamily = 'fontFamily',
  FontWeight = 'fontWeight',
  Duration = 'duration',
  Easing = 'easing',
  LineHeight = 'lineHeight',
  LetterSpacing = 'letterSpacing',
  BorderStyle = 'borderStyle',
}

/**
 * Metadata for a single themeable design token. The `cssVar` is the exact real
 * variable name (e.g. `--pg-colors-header-background`) so a generated value
 * always resolves. Registered in the {@link ThemeVariableRegistryReader}.
 */
export interface ThemeVariable {
  /** Full CSS custom-property name, e.g. `--pg-colors-header-background`. */
  readonly cssVar: string;
  /** Human-readable label, e.g. "Header background". */
  readonly name: string;
  /** Functional category for grouping. */
  readonly category: ThemeCategory;
  /** Accepted value grammar. */
  readonly type: ThemeVariableType;
  /** Default value from the base (light) theme. */
  readonly defaultValue: string;
  /** Short description shown to users / included selectively in prompts. */
  readonly description: string;
  /** Optional closed set of allowed values (for enum-like tokens). */
  readonly allowedValues?: readonly string[];
}

/** Read surface of the theme-variable registry (the engine exposes this via `getRegistry()`). */
export interface ThemeVariableRegistryReader {
  /** Every registered variable. */
  getAll(): readonly ThemeVariable[];
  /** Variables in a category. */
  getByCategory(category: ThemeCategory): readonly ThemeVariable[];
  /** Look up a variable by its `--pg-*` name. */
  getByName(cssVar: string): ThemeVariable | undefined;
  /** Whether a `--pg-*` variable is a known, themeable token. */
  has(cssVar: string): boolean;
  /** All categories that have at least one variable. */
  getCategories(): readonly ThemeCategory[];
}

/**
 * A complete, validated theme. `variables` is keyed by real `--pg-*` names and
 * holds only values that passed validation.
 */
export interface GeneratedTheme {
  /** Display name, e.g. "GitHub Dark". */
  readonly themeName: string;
  /** One-line description. */
  readonly description: string;
  /** Real `--pg-*` variable → value. */
  readonly variables: Readonly<Record<string, string>>;
}

/** A single rejected variable/value and why (surfaced for transparency, never applied). */
export interface RejectedThemeVariable {
  readonly cssVar: string;
  readonly value: string;
  readonly reason: string;
}

/** Result of a validation pass over raw model output. */
export interface ThemeValidationResult {
  readonly valid: boolean;
  /** Accepted variables (safe to apply). */
  readonly variables: Readonly<Record<string, string>>;
  /** Rejected entries with reasons. */
  readonly rejected: readonly RejectedThemeVariable[];
}

/** The result of a generate/modify/optimize call. */
export interface ThemeGenerationResult {
  /** The validated theme (only accepted variables). */
  readonly theme: GeneratedTheme;
  /** Whether it was applied to the grid (true when `preview`/apply requested). */
  readonly applied: boolean;
  /** Variables the model returned that were rejected by validation. */
  readonly rejected: readonly RejectedThemeVariable[];
}

/** Options for {@link PhotonThemeApi.generateTheme}. */
export interface ThemeGenerateParams {
  /** Natural-language description of the desired theme. */
  readonly prompt: string;
  /** Apply the result to the grid immediately (live preview). @default false */
  readonly preview?: boolean;
  /** Cancels the in-flight LLM request. */
  readonly signal?: AbortSignal;
}

/** Options for {@link PhotonThemeApi.modifyTheme}. */
export interface ThemeModifyParams {
  /** Natural-language change, e.g. "make the header emerald green". */
  readonly prompt: string;
  /** Apply the merged result immediately. @default false */
  readonly preview?: boolean;
  /** Cancels the in-flight LLM request. */
  readonly signal?: AbortSignal;
}

/** Optimization goals for {@link PhotonThemeApi.optimizeTheme}. Any combination may be set. */
export interface ThemeOptimizeOptions {
  readonly accessibility?: boolean;
  readonly contrast?: boolean;
  readonly spacing?: boolean;
  readonly readability?: boolean;
  readonly reduceNoise?: boolean;
  readonly darkenBorders?: boolean;
  /** Apply the optimized result immediately. @default false */
  readonly preview?: boolean;
  /** Cancels the in-flight LLM request. */
  readonly signal?: AbortSignal;
}

/** Structured explanation of a theme's design choices. */
export interface ThemeExplanation {
  readonly summary: string;
  readonly colors: string;
  readonly accessibility: string;
  readonly spacing: string;
  readonly typography: string;
}

/** One entry in the theme history stack. */
export interface ThemeHistoryEntry {
  readonly theme: GeneratedTheme;
  /** Monotonic sequence index within the session. */
  readonly index: number;
}

/** Serialization target for {@link PhotonThemeApi.exportTheme}. */
export type ThemeExportFormat = 'json' | 'css' | 'ts' | 'js';

/**
 * The public AI Theme API, exposed as `gridApi.photonAI`. LLM-backed methods
 * (`generateTheme`/`modifyTheme`/`optimizeTheme`/`explainTheme`) require a
 * configured provider (`GridOptions.photonAI.provider`) and reject with a clear
 * error otherwise; all other methods work offline.
 */
export interface PhotonThemeApi {
  /** Generate a brand-new theme from a natural-language prompt. */
  generateTheme(params: ThemeGenerateParams): Promise<ThemeGenerationResult>;
  /** Modify the current theme; only the variables the request implies change. */
  modifyTheme(params: ThemeModifyParams): Promise<ThemeGenerationResult>;
  /** Intelligently adjust the current theme toward the given goals. */
  optimizeTheme(options: ThemeOptimizeOptions): Promise<ThemeGenerationResult>;
  /** Explain a theme's colour/contrast/spacing/typography choices. */
  explainTheme(theme?: GeneratedTheme, signal?: AbortSignal): Promise<ThemeExplanation>;

  /** Apply a theme's variables live (preview), without committing to history. */
  previewTheme(theme: GeneratedTheme): void;
  /** Commit a theme: apply it and push it onto the history stack. */
  applyTheme(theme: GeneratedTheme): void;
  /** Remove any live preview, reverting to the last applied (or base) theme. */
  clearPreview(): void;

  /** Serialize a theme (defaults to the current theme) to the given format. */
  exportTheme(format?: ThemeExportFormat, theme?: GeneratedTheme): string;
  /** Validate and return a theme from JSON text or an object (throws if invalid). */
  importTheme(source: string | GeneratedTheme): GeneratedTheme;

  /** Step back to the previous applied theme. Returns it, or `null` at the start. */
  undo(): GeneratedTheme | null;
  /** Step forward again after an undo. Returns it, or `null` at the end. */
  redo(): GeneratedTheme | null;
  /** Clear all overrides, reverting to the base mode/variant. */
  reset(): void;
  /** Restore a specific history entry by index. */
  restore(index: number): GeneratedTheme | null;
  /** The full history stack (oldest first). */
  getHistory(): readonly ThemeHistoryEntry[];

  /** The variable registry (read surface) — enumerate/inspect themeable tokens. */
  getRegistry(): ThemeVariableRegistryReader;
  /** The currently applied theme, or `null` when none has been applied. */
  getCurrentTheme(): GeneratedTheme | null;
  /** Whether an LLM provider is configured (LLM-backed methods usable). */
  hasProvider(): boolean;
}
