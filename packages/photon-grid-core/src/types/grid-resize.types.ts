/**
 * Public contracts for grid container resizing.
 *
 * Lets the user drag the grid's own edges and corners to resize the whole
 * component, and lets the host drive the same size imperatively through the
 * `GridApi` size methods.
 *
 * @packageDocumentation
 */

/**
 * One draggable edge or corner of the grid container.
 *
 * Edge handles resize a single axis; corner handles resize both at once.
 */
export enum GridResizeHandle {
  /** Top edge — resizes height, anchored at the bottom. */
  Top = 'top',
  /** Right edge — resizes width, anchored at the left. */
  Right = 'right',
  /** Bottom edge — resizes height, anchored at the top. */
  Bottom = 'bottom',
  /** Left edge — resizes width, anchored at the right. */
  Left = 'left',
  TopLeft = 'topLeft',
  TopRight = 'topRight',
  BottomLeft = 'bottomLeft',
  BottomRight = 'bottomRight',
}

/**
 * The safe default handle set: the bottom-right L, exactly like a native
 * `<textarea>`.
 *
 * These three grow the grid away from its own origin, so they never need the
 * position compensation the top/left handles do — see
 * {@link GridResizeConfig.handles}.
 */
export const DEFAULT_GRID_RESIZE_HANDLES: readonly GridResizeHandle[] = [
  GridResizeHandle.Right,
  GridResizeHandle.Bottom,
  GridResizeHandle.BottomRight,
];

/** A grid container's outer size in CSS pixels. */
export interface GridSize {
  readonly width: number;
  readonly height: number;
}

/**
 * `GridOptions.resize` — configuration for dragging the grid's own edges.
 *
 * @example Bottom-right corner only, between 400×200 and 1600×900
 * ```ts
 * resize: {
 *   handles: [GridResizeHandle.BottomRight],
 *   minWidth: 400, minHeight: 200,
 *   maxWidth: 1600, maxHeight: 900,
 * }
 * ```
 */
export interface GridResizeConfig {
  /**
   * Master switch. Defaults to `true` whenever a `resize` object is supplied,
   * so `resize: {}` is enough to turn dragging on with the default handles.
   * @default true
   */
  enabled?: boolean;

  /**
   * Which edges and corners expose a drag handle.
   *
   * Defaults to {@link DEFAULT_GRID_RESIZE_HANDLES} — the bottom-right L.
   *
   * The `Top` / `Left` handles (and the corners containing them) must keep the
   * *opposite* edge visually fixed while the size changes, which a width or
   * height change alone does not do. They compensate by also shifting the
   * container's `margin-top` / `margin-left`. That composes correctly with
   * normal flow, flex and absolute positioning, but it does mean the grid owns
   * those two margins once such a handle is dragged — so they are opt-in rather
   * than on by default.
   */
  handles?: readonly GridResizeHandle[];

  /** Smallest permitted width in px. @default 240 */
  minWidth?: number;
  /** Largest permitted width in px. Omit for unbounded. */
  maxWidth?: number;
  /** Smallest permitted height in px. @default 120 */
  minHeight?: number;
  /** Largest permitted height in px. Omit for unbounded. */
  maxHeight?: number;

  /**
   * Snap increment in px. The dragged size is rounded to the nearest multiple.
   * `1` (the default) is free resizing.
   * @default 1
   */
  step?: number;

  /**
   * Hit area of each handle in px — how close the pointer must be to an edge
   * for the drag to start. The visible affordance is themed separately, so this
   * can be widened for touch without changing how the grid looks.
   * @default 6
   */
  handleSize?: number;

  /**
   * When `true`, the grid keeps its width and only the height is draggable
   * (and vice-versa for {@link lockHeight}). Simpler than removing handles when
   * the intent is "one axis only".
   * @default false
   */
  lockWidth?: boolean;
  /** @default false @see {@link lockWidth} */
  lockHeight?: boolean;
}

/** What triggered a size change. */
export enum GridResizeSource {
  /** The user dragged a handle. */
  Drag = 'drag',
  /** A `GridApi` size method was called. */
  Api = 'api',
}

/** Payload of `GRID_RESIZE_START` — a handle drag began. */
export interface GridResizeStartEvent {
  /** The handle being dragged. */
  readonly handle: GridResizeHandle;
  /** Size at the moment the drag started. */
  readonly size: GridSize;
}

/** Payload of `GRID_RESIZED` — the container's size changed. */
export interface GridResizedEvent {
  /** The new size. */
  readonly size: GridSize;
  /** The size before this change. */
  readonly previousSize: GridSize;
  /** What caused it. */
  readonly source: GridResizeSource;
  /** The handle responsible, or `null` for an API-driven change. */
  readonly handle: GridResizeHandle | null;
}

/** Payload of `GRID_RESIZE_END` — a handle drag finished. */
export interface GridResizeEndEvent {
  /** The handle that was dragged. */
  readonly handle: GridResizeHandle;
  /** Final size. */
  readonly size: GridSize;
  /** Size before the drag began, so the whole gesture can be undone as one step. */
  readonly initialSize: GridSize;
}

/**
 * The container-sizing methods on `GridApi`.
 *
 * Declared separately so the framework wrappers can re-export the surface
 * without restating each signature.
 */
export interface GridSizeApi {
  /**
   * Sets the grid container's width.
   *
   * @param width - A pixel number, any CSS length (`'60%'`, `'40rem'`), or
   *                `null` to drop the override and return to the stylesheet's width.
   */
  setGridWidth(width: number | string | null): void;

  /**
   * Sets the grid container's height.
   *
   * @param height - A pixel number, any CSS length, or `null` to drop the override.
   */
  setGridHeight(height: number | string | null): void;

  /**
   * Sets both dimensions in a single layout write.
   *
   * Preferred over calling {@link setGridWidth} and {@link setGridHeight} back
   * to back: those are two style mutations and two `GRID_RESIZED` events, this
   * is one of each.
   *
   * @param size - Omitted properties are left unchanged; `null` clears that override.
   */
  setGridSize(size: { width?: number | string | null; height?: number | string | null }): void;

  /** @returns The container's current outer size, measured from the DOM. */
  getGridSize(): GridSize;

  /**
   * Drops both overrides, returning the grid to whatever size its stylesheet
   * and layout give it.
   */
  resetGridSize(): void;

  /**
   * Turns handle dragging on or off at runtime, without rebuilding the grid.
   *
   * @param enabled - `false` removes the handles; `true` restores them.
   */
  setGridResizeEnabled(enabled: boolean): void;

  /**
   * Replaces the active resize configuration (handles, bounds, snapping).
   *
   * @param config - Merged over the current configuration.
   */
  updateGridResizeConfig(config: GridResizeConfig): void;
}
