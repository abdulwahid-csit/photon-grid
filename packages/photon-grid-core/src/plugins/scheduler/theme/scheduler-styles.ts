/**
 * Scheduler stylesheet, injected on demand.
 *
 * **Deliberately not joined into `styles/base-styles.ts`.** That module builds a
 * single string at import time from ~34 CSS modules, which no bundler can
 * tree-shake — anything added there ships to every consumer of the core package,
 * including ones that never construct a scheduler. This string is only reachable
 * from the scheduler's own module graph, and the plugin injects it from `init`,
 * so it costs nothing until a scheduler actually exists.
 *
 * Every colour resolves a `--pg-*` design token with a fallback. That is what
 * makes the scheduler follow mode (light/dark) and variant (ion/neon/photon/
 * quantum) changes with no code and no re-render — the same tokens the grid
 * itself is painted from. Scheduler-specific knobs are namespaced
 * `--pg-scheduler-*` and each falls back to a core token, so a host that never
 * themes the scheduler still gets something coherent.
 */

const STYLE_ID = 'photon-grid-scheduler-styles';

export const schedulerCss = `
.pg-scheduler {
  --pg-scheduler-grid-line: var(--pg-colors-border-strong, var(--pg-colors-border, #cbd5e1));
  --pg-scheduler-grid-line-strong: var(--pg-colors-border-strong, #cbd5e1);
  --pg-scheduler-nonworking: color-mix(in srgb, var(--pg-colors-text-primary, #0f172a) 4%, transparent);
  --pg-scheduler-today: color-mix(in srgb, var(--pg-colors-primary, #2563eb) 8%, transparent);
  --pg-scheduler-now: var(--pg-colors-danger, #dc2626);
  --pg-scheduler-bar-radius: var(--pg-borders-radius-sm, 4px);
  --pg-scheduler-bar-font-size: var(--pg-typography-font-size-xs, 11px);
  --pg-scheduler-selection: var(--pg-colors-primary, #2563eb);
  --pg-scheduler-drag-preview: color-mix(in srgb, var(--pg-colors-primary, #2563eb) 30%, transparent);
}

/* ── Timeline header ──────────────────────────────────────────────────────
   Sits in the grid's own header region, to the right of the pinned resource
   columns, and pans with --pg-scroll-x like the centre panel does. */
.pg-scheduler-header {
  position: absolute;
  top: 0;
  bottom: 0;
  overflow: hidden;
  background: var(--pg-colors-header-background, #f8fafc);
  border-bottom: 1px solid var(--pg-colors-header-border, #e2e8f0);
  pointer-events: auto;
}

.pg-scheduler-header__inner {
  position: relative;
  height: 100%;
  will-change: transform;
}

.pg-scheduler-header__band {
  position: relative;
  display: block;
  border-bottom: 1px solid var(--pg-scheduler-grid-line);
}

.pg-scheduler-header__cell {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border-right: 1px solid var(--pg-scheduler-grid-line);
  color: var(--pg-colors-header-text, #374151);
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-header-font-weight, 600);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
}

/* The slot row carries the finest granularity, so it gets the lighter rule. */
.pg-scheduler-header__cell--slot {
  font-weight: var(--pg-typography-font-weight-medium, 500);
  color: var(--pg-colors-text-secondary, #475569);
}

.pg-scheduler-header__cell--nonworking { background: var(--pg-scheduler-nonworking); }
.pg-scheduler-header__cell--today {
  background: var(--pg-scheduler-today);
  color: var(--pg-colors-primary, #2563eb);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
}

/* ── Timeline body ────────────────────────────────────────────────────────
   Two stacked layers inside the plugin layer: a static backdrop of column
   shading and gridlines, and the event bars above it. Separating them means a
   scroll repaints neither -- both are moved by the layer's transform. */
/* Intentionally sets no inset: the element already carries the plugin-layer
   class, whose geometry (including the scrollbar gutter on the right) must win. */
.pg-scheduler-body { overflow: hidden; }

.pg-scheduler-canvas {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  will-change: transform;
}

.pg-scheduler-col {
  position: absolute;
  box-sizing: border-box;
  border-right: 1px solid var(--pg-scheduler-grid-line);
  pointer-events: none;
}

.pg-scheduler-col--nonworking { background: var(--pg-scheduler-nonworking); }
.pg-scheduler-col--today { background: var(--pg-scheduler-today); }

/* Horizontal separators, one per rendered row.

   Drawn by the scheduler rather than inherited from the grid's own row borders:
   with every resource column pinned left the centre panel is empty, so there is
   no row element under the timeline to carry a line. Positioned from the same
   rows the bars use, which is what makes them align with the pinned section at
   any scroll offset and any row height. */
.pg-scheduler-row-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: var(--pg-scheduler-grid-line);
  pointer-events: none;
  will-change: transform;
}

/* Current-time marker. A 2px rule rather than a full column, so it reads as an
   instant rather than a span. */
.pg-scheduler-now {
  position: absolute;
  width: 2px;
  background: var(--pg-scheduler-now);
  pointer-events: none;
  z-index: 3;
}

/* ── Event bars ───────────────────────────────────────────────────────────
   Positioned entirely by transform: translate() -- a composited property, so
   moving 600 bars never invalidates layout. Width/height are the only
   layout-affecting properties written, and only when they actually change. */
.pg-scheduler-bar {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  box-sizing: border-box;
  padding: 0 6px;
  border-radius: var(--pg-scheduler-bar-radius);
  border: 1px solid transparent;
  font-size: var(--pg-scheduler-bar-font-size);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  cursor: default;
  pointer-events: auto;
  user-select: none;
  will-change: transform;
  transition: box-shadow var(--pg-transitions-duration-fast, 130ms) ease;
}

.pg-scheduler-bar__icon { flex: none; display: inline-flex; align-items: center; opacity: 0.85; }
.pg-scheduler-bar__label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: var(--pg-typography-font-weight-medium, 500);
}
.pg-scheduler-bar__badge {
  flex: none;
  padding: 0 4px;
  border-radius: var(--pg-borders-radius-pill, 999px);
  background: rgba(255, 255, 255, 0.25);
  font-size: 10px;
  font-weight: 600;
}
.pg-scheduler-bar__checkbox { flex: none; margin: 0 2px 0 0; }

.pg-scheduler-bar--selected {
  box-shadow: 0 0 0 2px var(--pg-scheduler-selection),
              0 0 0 4px color-mix(in srgb, var(--pg-scheduler-selection) 25%, transparent);
  z-index: 2;
}

.pg-scheduler-bar--locked { cursor: not-allowed; }
.pg-scheduler-bar--dragging { opacity: 0.4; }

/* Resize affordances. Zero-width until hover so they never steal a click from
   a narrow bar, and suppressed entirely on locked bars. */
.pg-scheduler-bar__handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: ew-resize;
  opacity: 0;
}
.pg-scheduler-bar__handle--start { left: 0; }
.pg-scheduler-bar__handle--end { right: 0; }
.pg-scheduler-bar:hover .pg-scheduler-bar__handle { opacity: 1; }
.pg-scheduler-bar--locked .pg-scheduler-bar__handle { display: none; }

.pg-scheduler-bar:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--pg-colors-surface, #fff),
              0 0 0 4px var(--pg-scheduler-selection);
  z-index: 3;
}

/* Ghost shown while dragging or resizing. Outline-only so the bar underneath
   stays readable and the user can see what they are covering. */
.pg-scheduler-preview {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  border: 2px dashed var(--pg-scheduler-selection);
  background: var(--pg-scheduler-drag-preview);
  border-radius: var(--pg-scheduler-bar-radius);
  pointer-events: none;
  z-index: 4;
  will-change: transform;
}

.pg-scheduler-preview--invalid {
  border-color: var(--pg-colors-danger, #dc2626);
  background: color-mix(in srgb, var(--pg-colors-danger, #dc2626) 20%, transparent);
}

/* Shown when a frame exceeds the bar budget: past a certain density the bars
   are narrower than their own text, so a count communicates more than the
   bars would. */
.pg-scheduler-overflow {
  position: absolute;
  right: 4px;
  padding: 0 6px;
  border-radius: var(--pg-borders-radius-pill, 999px);
  background: var(--pg-colors-badge-background, #eff6ff);
  color: var(--pg-colors-badge-text, #1d4ed8);
  font-size: 10px;
  font-weight: 600;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .pg-scheduler-bar { transition: none; }
}
`;

/**
 * Injects the scheduler stylesheet once per document.
 *
 * Idempotent via the element id, following `IconRenderer.injectSpinKeyframes` —
 * several scheduler instances on one page share the single sheet.
 */
export function injectSchedulerStyles(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = schedulerCss;
  document.head.appendChild(style);
}

/**
 * Removes the stylesheet.
 *
 * Not called on plugin destroy: a second scheduler on the page would still need
 * it, and the sheet is inert without matching elements. Exposed for hosts that
 * tear down the library entirely.
 */
export function removeSchedulerStyles(): void {
  if (typeof document === 'undefined') return;
  document.getElementById(STYLE_ID)?.remove();
}
