export interface ColorTokens {
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryText: string;

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

  filterBackground: string;
  filterBorder: string;
  filterActiveBackground: string;
  filterActiveBorder: string;

  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;

  resizeHandleColor: string;
  resizeHandleActiveColor: string;

  dragPreviewBackground: string;
  dragPreviewBorder: string;
  dragOverHighlight: string;

  checkboxBackground: string;
  checkboxCheckedBackground: string;
  checkboxBorder: string;

  badgeBackground: string;
  badgeText: string;

  groupRowBackground: string;
  groupRowBorder: string;

  tooltipBackground: string;
  tooltipText: string;

  success: string;
  warning: string;
  error: string;
  info: string;

  successLight: string;
  warningLight: string;
  errorLight: string;
  infoLight: string;
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
}

export interface TransitionTokens {
  durationFast: string;
  durationBase: string;
  durationSlow: string;
  easingBase: string;
  easingDecelerate: string;
  easingAccelerate: string;
}

export interface ThemeTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  sizing: SizingTokens;
  borders: BorderTokens;
  shadows: ShadowTokens;
  transitions: TransitionTokens;
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
 * `'none'` (the default) applies no skin: the grid uses the mode palette with
 * the base component styling.
 */
export type ThemeVariant = 'quartz' | 'alpine' | 'balham' | 'material';

/** CSS class applied to the grid container for a given variant. */
export const THEME_VARIANT_CLASS: Readonly<Record<ThemeVariant, string>> = {
  quartz: 'pg-quartz-theme',
  alpine: 'pg-alpine-theme',
  balham: 'pg-balham-theme',
  material: 'pg-material-theme',
} as const;
