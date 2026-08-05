/**
 * Photon Grid — loading state configuration.
 *
 * The grid keeps a single boolean `loading` flag in its store. While that flag
 * is set, {@link import('../renderer/overlay-renderer').OverlayRenderer} paints
 * a loading indicator over the body — the header stays visible and interactive,
 * exactly as it does for the "no rows" overlay.
 *
 * Two indicators ship in the box:
 *
 * - {@link LoadingIndicator.Spinner} (the default) — a centred, themed spinner
 *   resolved through the icon registry, so a host that swapped its icon pack
 *   gets its own glyph without touching this module.
 * - {@link LoadingIndicator.Skeleton} — shimmering placeholder rows laid out
 *   against the *real* column widths, so the grid appears to fill in rather
 *   than to be blocked.
 *
 * Everything here is pure data plus one resolver; no DOM, no framework, no
 * grid internals. Hosts drive the flag through `GridOptions.loading`,
 * `GridApi.setLoading()`, or a row model that fetches remotely.
 *
 * @see {@link LoadingOverlayConfig}
 * @see {@link resolveLoadingOverlayConfig}
 */

/**
 * Which visual the loading overlay paints.
 *
 * @see {@link LoadingOverlayConfig.indicator}
 */
export enum LoadingIndicator {
  /**
   * A centred spinner (plus optional caption). Cheap, indicator-only, and the
   * right choice when the grid already holds data that is merely refreshing.
   */
  Spinner = 'spinner',

  /**
   * Shimmering placeholder rows aligned to the current column widths. Reads as
   * "content is arriving" rather than "the grid is blocked", so it suits an
   * initial load better than a spinner does.
   */
  Skeleton = 'skeleton',
}

/**
 * How much of the body underneath the indicator stays visible.
 *
 * @see {@link LoadingOverlayConfig.backdrop}
 */
export enum LoadingBackdrop {
  /**
   * A translucent wash — rows already rendered stay legible but dimmed. The
   * default, and the natural fit for a refresh over existing data.
   */
  Translucent = 'translucent',

  /**
   * A solid surface fill that hides whatever is underneath. Applied
   * automatically for {@link LoadingIndicator.Skeleton} (unless the host asks
   * for something else), because placeholders read as noise when stale rows
   * show through them.
   */
  Opaque = 'opaque',

  /**
   * No wash at all — the indicator floats over untouched rows. Useful for a
   * background poll that should not visually interrupt the user.
   */
  None = 'none',
}

/**
 * Appearance of the loading overlay, supplied as `GridOptions.loadingOverlay`
 * and updatable at runtime through `GridApi.updateLoadingOverlay()`.
 *
 * Every field is optional; {@link resolveLoadingOverlayConfig} fills the
 * defaults once at construction so no render frame ever pays for the merge.
 *
 * @example Default spinner with a custom caption
 * ```ts
 * new GridCore(el, {
 *   columns,
 *   data,
 *   loading: true,
 *   loadingOverlay: { text: 'Fetching accounts…' },
 * });
 * ```
 *
 * @example Skeleton placeholders, with a short anti-flicker delay
 * ```ts
 * loadingOverlay: {
 *   indicator: LoadingIndicator.Skeleton,
 *   delay: 150,
 * }
 * ```
 *
 * @see {@link LoadingIndicator}
 * @see {@link LoadingBackdrop}
 */
export interface LoadingOverlayConfig {
  /**
   * Which indicator to paint.
   * @default LoadingIndicator.Spinner
   */
  readonly indicator?: LoadingIndicator;

  /**
   * Caption rendered under the spinner. Ignored when {@link showText} is
   * `false`, and by {@link LoadingIndicator.Skeleton}, which is captionless by
   * design. Also used as the overlay's accessible name.
   * @default 'Loading…'
   */
  readonly text?: string;

  /**
   * Render {@link text} beneath the spinner. Turn off for a bare spinner; the
   * text is still announced to assistive technology via `aria-label`.
   * @default true
   */
  readonly showText?: boolean;

  /**
   * Icon-registry name for the spinner glyph. Resolved through the grid's
   * {@link import('../icons/icon-registry').IconRegistry}, so a custom icon
   * pack replaces it without any markup here — never pass raw SVG.
   * @default 'loading'
   */
  readonly icon?: string;

  /**
   * Spinner size in pixels.
   * @default 32
   */
  readonly iconSize?: number;

  /**
   * How much of the body shows through behind the indicator.
   * @default LoadingBackdrop.Translucent — except for
   * {@link LoadingIndicator.Skeleton}, which defaults to
   * {@link LoadingBackdrop.Opaque}.
   */
  readonly backdrop?: LoadingBackdrop;

  /**
   * Number of placeholder rows in {@link LoadingIndicator.Skeleton} mode.
   * `0` fills the visible viewport height, which is almost always what you
   * want — a fixed count either leaves a gap or overdraws.
   * @default 0
   */
  readonly skeletonRows?: number;

  /**
   * Milliseconds to wait before painting the overlay. A request that resolves
   * faster than this never flashes an indicator at all, which reads as
   * instantaneous rather than as a flicker. `0` paints immediately.
   * @default 0
   */
  readonly delay?: number;

  /**
   * Extra class applied to the overlay root, for host-authored theming on top
   * of the built-in tokens.
   */
  readonly className?: string;
}

/**
 * {@link LoadingOverlayConfig} with every default applied. Produced once per
 * grid by {@link resolveLoadingOverlayConfig} and read directly by the
 * renderer, so the hot path never re-merges defaults.
 */
export interface ResolvedLoadingOverlayConfig {
  readonly indicator: LoadingIndicator;
  readonly text: string;
  readonly showText: boolean;
  readonly icon: string;
  readonly iconSize: number;
  readonly backdrop: LoadingBackdrop;
  readonly skeletonRows: number;
  readonly delay: number;
  readonly className: string;
}

/** Payload for `GridEventType.LOADING_STARTED` and `LOADING_STOPPED`. */
export interface LoadingChangedEvent {
  /** `true` on `LOADING_STARTED`, `false` on `LOADING_STOPPED`. */
  readonly loading: boolean;
  /** The indicator configured at the time of the transition. */
  readonly indicator: LoadingIndicator;
}

/** Caption used when the host supplies none. */
const DEFAULT_LOADING_TEXT = 'Loading…';

/** Icon-registry name of the built-in spinner glyph. */
const DEFAULT_LOADING_ICON = 'loading';

/** Spinner edge length in pixels. */
const DEFAULT_LOADING_ICON_SIZE = 32;

/**
 * Applies every default to a host-supplied {@link LoadingOverlayConfig}.
 *
 * Pure and allocation-light: called once per grid (and again only when
 * `GridApi.updateLoadingOverlay()` runs), never per frame.
 *
 * @param config     - Host configuration, if any.
 * @param legacyText - Value of the deprecated `GridOptions.loadingOverlayText`.
 *                     Used only when {@link LoadingOverlayConfig.text} is
 *                     absent, so the newer option always wins. Folding it in
 *                     here keeps the back-compat branch at exactly one site.
 * @returns A fully populated configuration, safe to read on the render path.
 */
export function resolveLoadingOverlayConfig(
  config?: LoadingOverlayConfig,
  legacyText?: string,
): ResolvedLoadingOverlayConfig {
  const indicator = config?.indicator ?? LoadingIndicator.Spinner;

  // Skeleton placeholders read as noise when stale rows show through them, so
  // that indicator flips the backdrop default to opaque. An explicit host
  // value still wins — this only changes what "unspecified" means.
  const defaultBackdrop =
    indicator === LoadingIndicator.Skeleton ? LoadingBackdrop.Opaque : LoadingBackdrop.Translucent;

  return {
    indicator,
    text: config?.text ?? legacyText ?? DEFAULT_LOADING_TEXT,
    showText: config?.showText !== false,
    icon: config?.icon ?? DEFAULT_LOADING_ICON,
    // `> 0` rather than `??`: a zero or negative size would render an invisible
    // spinner, which is indistinguishable from the feature being broken.
    iconSize: config?.iconSize && config.iconSize > 0 ? config.iconSize : DEFAULT_LOADING_ICON_SIZE,
    backdrop: config?.backdrop ?? defaultBackdrop,
    skeletonRows: config?.skeletonRows && config.skeletonRows > 0 ? Math.floor(config.skeletonRows) : 0,
    delay: config?.delay && config.delay > 0 ? config.delay : 0,
    className: config?.className ?? '',
  };
}
