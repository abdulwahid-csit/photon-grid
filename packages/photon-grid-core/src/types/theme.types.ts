export interface ColorTokens {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryText: string;
  /**
   * Accent ramp used for tints and state layers.
   *
   * `subtle` < `soft` < `light` in intensity; `contrast` / `onPrimary` are the
   * foreground colours guaranteed legible on a `primary` fill. Variants re-skin
   * these to change how the accent reads across the whole grid without touching
   * every component rule.
   */
  primarySubtle: string;
  primarySubtleHover: string;
  primarySoft: string;
  primaryLight: string;
  primaryContrast: string;
  onPrimary: string;

  secondary: string;
  secondaryHover: string;

  surface: string;
  surfaceRaised: string;
  surfaceOverlay: string;
  surfaceSunken: string;

  background: string;
  backgroundAlt: string;

  border: string;
  borderStrong: string;
  borderFocus: string;

  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;

  headerBackground: string;
  headerText: string;
  headerBorder: string;
  headerHover: string;

  rowBackground: string;
  rowBackgroundAlt: string;
  rowHover: string;
  rowSelected: string;
  rowSelectedBorder: string;

  cellEditBackground: string;
  cellEditBorder: string;

  selectionBackground: string;
  selectionBorder: string;
  selectionCorner: string;

  footerBackground: string;
  footerText: string;
  footerBorder: string;

  pinnedBackground: string;
  pinnedShadow: string;
  /** Divider between a frozen column region and the scrolling centre. */
  pinnedBorder: string;

  filterBackground: string;
  filterBorder: string;
  filterActiveBackground: string;
  filterActiveBorder: string;

  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  /** Gutter behind the scrollbar track — part of the grid's chrome surface. */
  scrollbarBg: string;

  resizeHandleColor: string;
  resizeHandleActiveColor: string;

  dragPreviewBackground: string;
  dragPreviewBorder: string;
  dragOverHighlight: string;
  /** Column-drag ghost chip. */
  dragGhostBackground: string;
  dragGhostBorderColor: string;
  /** Row-drag ghost chip. */
  rowDragGhost: string;

  checkboxBackground: string;
  checkboxCheckedBackground: string;
  checkboxBorder: string;

  badgeBackground: string;
  badgeText: string;
  /** Grouping-bar chips and any pill built from the chip tokens. */
  chipBackground: string;
  chipText: string;

  groupRowBackground: string;
  groupRowBorder: string;
  groupRowHover: string;
  groupRowText: string;
  groupToggleHover: string;
  groupFooterBackground: string;
  groupFooterHover: string;
  /** Grouping bar while a column is dragged over it. */
  groupZoneOver: string;
  /** Aggregated (group summary) cell text. */
  aggText: string;

  tooltipBackground: string;
  tooltipText: string;
  /** Border on portaled menus, which sit on `surface` rather than the grid body. */
  borderCtxtMenu: string;

  /** Scrim behind modal surfaces, and the loading-overlay wash. */
  overlay: string;
  overlayLoading: string;

  /** Placeholder rows while an infinite/server page is in flight. */
  skeleton: string;
  skeletonHighlight: string;

  success: string;
  warning: string;
  error: string;
  info: string;
  /** Destructive intent. Distinct from `error`, which reports a failure. */
  danger: string;

  successLight: string;
  warningLight: string;
  errorLight: string;
  infoLight: string;
  /** Low-intensity fills for destructive/error surfaces. */
  dangerSoft: string;
  errorSubtle: string;
}

export interface TypographyTokens {
  fontFamily: string;
  fontFamilyMono: string;

  fontSizeXs: string;
  fontSizeSm: string;
  fontSizeMd: string;
  fontSizeLg: string;
  fontSizeXl: string;

  fontWeightRegular: string;
  fontWeightMedium: string;
  fontWeightSemiBold: string;
  fontWeightBold: string;
  /** Weight for header cells specifically, so density and emphasis stay separable. */
  headerFontWeight: string;

  lineHeightTight: string;
  lineHeightBase: string;
  lineHeightRelaxed: string;

  letterSpacingTight: string;
  letterSpacingBase: string;
  letterSpacingWide: string;
}

export interface SpacingTokens {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface SizingTokens {
  rowHeightSm: string;
  rowHeightMd: string;
  rowHeightLg: string;
  headerRowHeight: string;
  footerRowHeight: string;
  filterRowHeight: string;
  scrollbarWidth: string;
  resizeHandleWidth: string;
  columnMinWidth: string;
  checkboxSize: string;
  iconSizeSm: string;
  iconSizeMd: string;
  iconSizeLg: string;
}

export interface BorderTokens {
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusPill: string;
  widthThin: string;
  widthBase: string;
  widthThick: string;
  styleBase: string;
  /** Focus-ring thickness. A variant that wants a heavier ring raises this once. */
  widthFocus: string;
}

export interface ShadowTokens {
  none: string;
  xs: string;
  sm: string;
  md: string;
  lg: string;
  pinnedLeft: string;
  pinnedRight: string;
  dropdown: string;
  tooltip: string;
  dragPreview: string;
  /** Modal surfaces (confirm dialog, chart config), which sit above a scrim. */
  dialog: string;
}

export interface TransitionTokens {
  durationFast: string;
  durationBase: string;
  durationSlow: string;
  easingBase: string;
  easingDecelerate: string;
  easingAccelerate: string;
}

/** Opacity scale. Small on purpose — only values reused across components. */
export interface OpacityTokens {
  /** Applied to disabled menu items and controls. */
  disabled: string;
}

export interface ThemeTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  sizing: SizingTokens;
  borders: BorderTokens;
  shadows: ShadowTokens;
  transitions: TransitionTokens;
  opacity: OpacityTokens;
}

export interface Theme {
  name: string;
  displayName: string;
  mode: 'light' | 'dark';
  tokens: ThemeTokens;
  cssClass?: string;
}

export type BuiltInThemeName = 'light' | 'dark' | 'contrast' | 'material-light' | 'material-dark';

/**
 * Base color mode. Drives the full color palette (surfaces, text, borders,
 * rows, scrollbars) via design-token injection. This is the primary theming
 * axis — every grid resolves to exactly one mode.
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Cosmetic skin layered on top of a {@link ThemeMode}. A variant only overrides
 * structural / appearance concerns — density (row & header heights), border
 * radii, typography, checkbox shape, motion and the accent color — while base
 * surface and text colors continue to come from the active mode. This lets any
 * variant render correctly in both light and dark.
 *
 * `'classic'` is the **default**: a grid that names no variant and no legacy
 * `theme` gets it automatically, so it is the look Photon ships with. Pass
 * `variant: 'none'` for the bare, unskinned base styling.
 */
export type ThemeVariant = 'classic' | 'ion' | 'neon' | 'photon' | 'quantum';

/** CSS class applied to the grid container for a given variant. */
export const THEME_VARIANT_CLASS: Readonly<Record<ThemeVariant, string>> = {
  classic: 'pg-classic-theme',
  ion: 'pg-ion-theme',
  neon: 'pg-neon-theme',
  photon: 'pg-photon-theme',
  quantum: 'pg-quantum-theme',
} as const;

/** Row height used when neither the host nor a variant specifies one. */
export const DEFAULT_ROW_HEIGHT = 48;

/**
 * The variant applied when a grid names none.
 *
 * A constant rather than a literal at the call site because two places depend
 * on it — `GridCore.initialize` applies it, and `resolveVariantRowHeight` must
 * agree about the density that comes with it.
 */
export const DEFAULT_THEME_VARIANT: ThemeVariant = 'classic';

/**
 * Default body row height per variant, in pixels.
 *
 * Row heights are written as inline `top`/`height` by the row position sheet
 * rather than read from CSS, so — unlike header height, which a variant sets
 * through `--pg-header-row-height` — body density cannot be expressed in a
 * stylesheet. This map is the variant's half of that contract: it supplies the
 * *default* only, and an explicit `GridOptions.rowHeight` always wins.
 *
 * @see resolveVariantRowHeight
 */
export const THEME_VARIANT_ROW_HEIGHT: Readonly<Record<ThemeVariant, number>> = {
  /**
   * AG Grid Quartz's own body density: `font-size + grid-size * 3.5`, i.e.
   * `14 + 8 * 3.5`. Classic is pitched to match Quartz, and density is as much
   * a part of that match as colour — a Quartz palette at 48px rhythm reads as a
   * near-miss rather than a match.
   *
   * This is the one place classic departs from {@link DEFAULT_ROW_HEIGHT}, so a
   * grid that wants the old spacing back sets `GridOptions.rowHeight: 48`,
   * which always wins.
   */
  classic: 42,
  /** Crisp enterprise: compact but not cramped. */
  ion: 44,
  /** High-contrast glow: tight, terminal-like rhythm. */
  neon: 40,
  /** Airy editorial: generous whitespace is the whole point. */
  photon: 56,
  /** Tonal elevated: Material's comfortable density. */
  quantum: 52,
} as const;

/**
 * Resolves the effective body row height.
 *
 * @param rowHeight - Explicit `GridOptions.rowHeight`, if the host set one.
 * @param variant   - Active variant. `undefined` resolves through
 *                    {@link DEFAULT_THEME_VARIANT}, matching what `GridCore`
 *                    actually applies to a grid that names none; `'none'` takes
 *                    the base default, since an unskinned grid has no variant
 *                    density to inherit.
 * @returns The host value when given, else the variant default, else
 *          {@link DEFAULT_ROW_HEIGHT}.
 */
export function resolveVariantRowHeight(
  rowHeight: number | undefined,
  variant: ThemeVariant | 'none' | undefined,
): number {
  if (typeof rowHeight === 'number') return rowHeight;
  if (variant === 'none') return DEFAULT_ROW_HEIGHT;
  const effective = variant ?? DEFAULT_THEME_VARIANT;
  if (effective in THEME_VARIANT_ROW_HEIGHT) return THEME_VARIANT_ROW_HEIGHT[effective];
  return DEFAULT_ROW_HEIGHT;
}
