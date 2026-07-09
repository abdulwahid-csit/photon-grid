/**
 * Resolves the visual styling of a chart from the grid's active CSS theme
 * tokens, so hand-drawn canvas charts honor light / dark / custom themes
 * without hardcoding colors.
 *
 * The resolver reads computed CSS custom properties from the chart's own DOM
 * node. It must be called **once per render** (never inside an animation frame
 * or hover redraw) because `getComputedStyle` forces layout; the result is
 * cached by the renderer for the duration of a render pass.
 */

/** Fallback series palette used when no `--pg-chart-series-*` tokens are defined. */
const FALLBACK_PALETTE: readonly string[] = [
  '#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0',
  '#3F51B5', '#03A9F4', '#4CAF50', '#F9CE1D', '#FF9800',
];

/** Number of `--pg-chart-series-N` slots probed from the theme. */
const PALETTE_SLOTS = 10;

/**
 * The fully-resolved set of colors and fonts a {@link ChartRenderer} draws with.
 * Every value is a concrete, ready-to-use CSS color / font string.
 */
export interface ResolvedChartTheme {
  /** Primary text: titles, axis labels, values. */
  readonly textColor: string;
  /** Secondary / muted text: subtitles, axis ticks. */
  readonly mutedColor: string;
  /** Grid lines and axis lines. */
  readonly gridColor: string;
  /** Panel/plot background; `'transparent'` when the theme has no surface token. */
  readonly background: string;
  /** Font family for all chart text. */
  readonly fontFamily: string;
  /** Ordered series color palette. */
  readonly palette: readonly string[];
}

/**
 * Reads the active theme tokens from `el` and returns a concrete
 * {@link ResolvedChartTheme}. Missing tokens fall back to neutral defaults so
 * charts still render legibly in an unstyled or server-rendered context.
 *
 * @param el - A DOM node inside the themed grid (typically the chart canvas).
 * @returns The resolved colors, font and series palette.
 */
export function resolveChartTheme(el: HTMLElement): ResolvedChartTheme {
  const cs = getComputedStyle(el);
  const read = (token: string, fallback: string): string => {
    const value = cs.getPropertyValue(token).trim();
    return value.length > 0 ? value : fallback;
  };

  const palette: string[] = [];
  for (let i = 1; i <= PALETTE_SLOTS; i++) {
    const token = cs.getPropertyValue(`--pg-chart-series-${i}`).trim();
    if (token.length > 0) palette.push(token);
  }

  return {
    textColor: read('--pg-colors-text-primary', '#374151'),
    mutedColor: read('--pg-colors-text-secondary', '#6b7280'),
    gridColor: read('--pg-colors-border', '#e5e7eb'),
    background: read('--pg-colors-surface', 'transparent'),
    fontFamily: read('--pg-typography-font-family', 'system-ui, sans-serif'),
    palette: palette.length > 0 ? palette : FALLBACK_PALETTE,
  };
}
