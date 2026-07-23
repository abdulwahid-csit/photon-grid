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

/**
 * Default series palette — an AG Grid-inspired, low-saturation categorical set
 * tuned to read well on light surfaces and stay distinct across many series /
 * pie slices. Used whenever a theme defines no `--pg-chart-series-N` overrides.
 */
const LIGHT_PALETTE: readonly string[] = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#48b3a5',
];

/**
 * Dark-mode variant of {@link LIGHT_PALETTE}. The same hues, lifted in
 * lightness/saturation so slices and bars keep enough contrast against a dark
 * surface (and against the white slice separators the pie renderer draws).
 */
const DARK_PALETTE: readonly string[] = [
  '#7a8fe0', '#a5d98d', '#ffd569', '#f47f7f', '#8dd1ec',
  '#5cbf95', '#ff9a6b', '#b47fce', '#f2a0da', '#63c9bb',
];

/** Number of `--pg-chart-series-N` slots probed from the theme. */
const PALETTE_SLOTS = 10;

/**
 * Relative luminance (0–1) of a CSS color, used to decide whether a surface is
 * dark. Handles `#rgb`, `#rrggbb`, and `rgb()/rgba()`; anything unparseable
 * resolves to a mid value so the light palette is chosen by default.
 */
function luminance(color: string): number {
  const c = color.trim();
  let r = 0, g = 0, b = 0;
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    const full = hex.length === 3 ? hex.split('').map((h) => h + h).join('') : hex;
    if (full.length >= 6) {
      r = parseInt(full.slice(0, 2), 16);
      g = parseInt(full.slice(2, 4), 16);
      b = parseInt(full.slice(4, 6), 16);
    } else {
      return 0.5;
    }
  } else {
    const m = c.match(/rgba?\(([^)]+)\)/i);
    if (!m) return 0.5;
    const parts = m[1].split(',').map((p) => parseFloat(p));
    [r, g, b] = parts;
  }
  // Perceptual luminance (sRGB-weighted), normalized to 0–1.
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

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

  // Explicit per-series overrides win over the built-in palettes.
  const overrides: string[] = [];
  for (let i = 1; i <= PALETTE_SLOTS; i++) {
    const token = cs.getPropertyValue(`--pg-chart-series-${i}`).trim();
    if (token.length > 0) overrides.push(token);
  }

  const textColor = read('--pg-colors-text-primary', '#374151');
  const background = read('--pg-colors-surface', 'transparent');

  // Choose the palette that best contrasts the surface. Prefer the surface
  // token; when it's transparent/unset, infer from the (inverted) text color.
  const isDark =
    background !== 'transparent'
      ? luminance(background) < 0.5
      : luminance(textColor) > 0.5;
  const basePalette = isDark ? DARK_PALETTE : LIGHT_PALETTE;

  return {
    textColor,
    mutedColor: read('--pg-colors-text-secondary', '#6b7280'),
    gridColor: read('--pg-colors-border', '#e5e7eb'),
    background,
    fontFamily: read('--pg-typography-font-family', 'system-ui, sans-serif'),
    palette: overrides.length > 0 ? overrides : basePalette,
  };
}
