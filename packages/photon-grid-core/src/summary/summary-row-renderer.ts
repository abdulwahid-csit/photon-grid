/**
 * DOM renderer for one summary band.
 *
 * A *band* is one horizontal strip of summary rows anchored to an edge of the
 * grid body — there are up to four (top/bottom × sticky/in-content), each an
 * independent instance of this class.
 *
 * ### Layout
 * The band mirrors the grid's three-panel structure exactly, so a summary cell
 * lines up with its column with no measurement and no per-frame bookkeeping:
 *
 * ```text
 * .pg-summary
 *   .pg-summary__region--left     width: var(--pg-left-panel-width)
 *   .pg-summary__region--center   flex; overflow hidden
 *     .pg-summary__region-inner   translateX(var(--pg-scroll-x))
 *   .pg-summary__region--right    width: var(--pg-right-panel-width)
 *   .pg-summary__vscroll-spacer   width: var(--pg-scrollbar-v-live-width)
 * ```
 *
 * Four grid features therefore need no code here at all:
 * - **Column pinning** — the same `--pg-left/right-panel-width` variables the
 *   header and body panels use.
 * - **Horizontal scrolling** — the same `translateX(var(--pg-scroll-x))` the
 *   center header inner uses.
 * - **Column resizing** — cells carry `data-col-id`, so `ColumnStyleManager`'s
 *   generated width rules apply to them the instant a drag updates them.
 * - **Column visibility** — hidden columns are simply absent from the column
 *   lists the band is rendered with.
 *
 * ### Reconciliation
 * A full rebuild happens only when the band's *structure* changes — the row set,
 * the columns in a region, the virtual column window, the gutters. A plain value
 * change (the common case, once per data refresh) patches text content in place,
 * so scrolling a grid with summary rows allocates nothing and lays out nothing.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../types/column.types';
import { createDiv } from '../renderer/dom-utils';
import type { ResolvedSummaryRow } from './summary-model';
import {
  SummaryPosition,
  type SummaryCellDef,
  type SummaryCellSnapshot,
  type SummaryRowSnapshot,
} from './summary.types';

/** A row definition paired with its freshly computed values. */
export interface SummaryBandRow {
  /** The resolved definition — supplies per-cell renderers, classes and spans. */
  readonly def: ResolvedSummaryRow;
  /** The computed values for this refresh. */
  readonly snapshot: SummaryRowSnapshot;
}

/**
 * Everything about the current column layout the band needs in order to line up
 * with the header and body.
 *
 * Supplied by `GridRenderer` from values it has already computed for the header,
 * so the band never derives geometry of its own and can never disagree.
 */
export interface SummaryBandLayout {
  /** Left-pinned columns, in order. */
  readonly leftCols: readonly ColumnDef[];
  /** The center columns to render — the virtual window slice, or all of them when a `colSpan` is present. */
  readonly centerCols: readonly ColumnDef[];
  /** Right-pinned columns, in order. */
  readonly rightCols: readonly ColumnDef[];
  /** Width of the leading spacer standing in for center columns before the window. */
  readonly centerLeftSpacerW: number;
  /** Width of the trailing spacer standing in for center columns after the window. */
  readonly centerRightSpacerW: number;
  /** Whether the grid shows a leading checkbox gutter. */
  readonly showCheckboxes: boolean;
  /** Whether the grid shows a leading serial-number gutter. */
  readonly showSerialNumber: boolean;
  /** Whether interior vertical grid lines are on. */
  readonly showVerticalBorders: boolean;
  /** Whether an auto-group column occupies the start of the center region. */
  readonly hasGroupColumn: boolean;
  /** Width of that auto-group column, in px. */
  readonly groupColWidth: number;
  /** Whether the left pinned panel is displayed at all. */
  readonly hasLeftPanel: boolean;
  /** Whether the right pinned panel is displayed at all. */
  readonly hasRightPanel: boolean;
  /** Resolved width of a column, for sizing `colSpan` cells. */
  readonly getColumnWidth: (colId: string) => number;
}

/** The three horizontal regions a band is split into. */
type RegionName = 'left' | 'center' | 'right';

/** Per-cell state retained for in-place value patching. */
interface CellBinding {
  readonly el: HTMLElement;
  /** The `<span>` holding the text, or `null` when a custom renderer owns the cell. */
  readonly valueEl: HTMLElement | null;
  /** The cell definition, so a custom renderer can be re-invoked on value change. */
  readonly def: SummaryCellDef | undefined;
  /** Last painted display string, to skip no-op DOM writes. */
  lastFormattedValue: string;
  /** Last painted tooltip, same reason. */
  lastTooltip: string | null;
}

/** Per-row state, keyed by summary row id. */
interface RowBinding {
  /** One row element per region (absent when that region is not rendered). */
  readonly elements: Partial<Record<RegionName, HTMLElement>>;
  /** Cell bindings keyed by `colId`. */
  readonly cells: Map<string, CellBinding>;
}

/**
 * Renders and maintains one summary band.
 *
 * Owns no listeners and no timers — it is pure presentation driven by
 * `GridRenderer`'s frame, which is what makes {@link destroy} a plain DOM
 * detach with no leak surface.
 */
export class SummaryRowRenderer {
  private bandEl: HTMLElement | null = null;
  private readonly regionEls: Partial<Record<RegionName, HTMLElement>> = {};
  private bindings = new Map<string, RowBinding>();

  /**
   * Fingerprint of the structure currently painted. A mismatch forces a rebuild;
   * a match means only values can have changed. @see {@link buildStructureKey}
   */
  private structureKey = '';

  /** Total painted height in px, cached so `GridRenderer` need not measure the DOM. */
  private height = 0;

  /**
   * @param position - Which edge this band is anchored to.
   * @param sticky   - `true` for the docked band, `false` for the in-content one.
   */
  constructor(
    private readonly position: SummaryPosition.Top | SummaryPosition.Bottom,
    private readonly sticky: boolean,
  ) {}

  /**
   * Creates the band's scaffolding and inserts it into `hostEl`.
   *
   * @param hostEl   - Container the band lives in — `.pg-grid-main` for a sticky
   *                   band, the in-content overlay for a non-sticky one.
   * @param beforeEl - Insert before this child instead of appending. A sticky
   *                   band is a flex item whose *position among its siblings* is
   *                   its position on screen, so a top band must land ahead of
   *                   the body rather than after it.
   */
  mount(hostEl: HTMLElement, beforeEl?: HTMLElement | null): void {
    if (this.bandEl) return;

    const band = createDiv(
      `pg-summary pg-summary--${this.position} pg-summary--${this.sticky ? 'sticky' : 'inline'}`,
    );
    // `rowgroup` is the correct container role for rows inside `role="grid"`,
    // and keeps the summary out of the data rows' index sequence.
    band.setAttribute('role', 'rowgroup');
    band.setAttribute(
      'aria-label',
      this.position === SummaryPosition.Top ? 'Column summary, top' : 'Column summary, bottom',
    );

    const left = createDiv('pg-summary__region pg-summary__region--left');
    const center = createDiv('pg-summary__region pg-summary__region--center');
    const centerInner = createDiv('pg-summary__region-inner');
    center.appendChild(centerInner);
    const right = createDiv('pg-summary__region pg-summary__region--right');
    // Mirrors the vertical scrollbar's flex item in the body row, exactly as
    // `.pg-header-vscroll-spacer` does — without it the band's center region is
    // one scrollbar wider than the body's and the right-pinned cells shift.
    const vScrollSpacer = createDiv('pg-summary__vscroll-spacer');

    band.appendChild(left);
    band.appendChild(center);
    band.appendChild(right);
    band.appendChild(vScrollSpacer);

    this.regionEls.left = left;
    this.regionEls.center = centerInner;
    this.regionEls.right = right;
    this.bandEl = band;
    if (beforeEl && beforeEl.parentNode === hostEl) hostEl.insertBefore(band, beforeEl);
    else hostEl.appendChild(band);
  }

  /**
   * Paints the band.
   *
   * @param rows   - Rows belonging to this band, in paint order.
   * @param layout - The current column layout.
   */
  render(rows: readonly SummaryBandRow[], layout: SummaryBandLayout): void {
    const band = this.bandEl;
    if (!band) return;

    if (rows.length === 0) {
      this.clear();
      band.classList.add('pg-summary--empty');
      this.height = 0;
      return;
    }
    band.classList.remove('pg-summary--empty');

    const key = buildStructureKey(rows, layout);
    if (key !== this.structureKey) {
      // Assigned *after* the rebuild, not before: `rebuild` clears the band, and
      // `clear` resets `structureKey` so the empty-band path cannot leave a
      // stale key behind. Assigning first would therefore be undone here, the
      // key would never match on the next frame, and the band would rebuild on
      // every single render — discarding custom renderers and re-laying out the
      // whole band once per data tick.
      this.rebuild(rows, layout);
      this.structureKey = key;
    } else {
      this.patch(rows);
    }

    let total = 0;
    for (const row of rows) total += row.snapshot.height;
    this.height = total;
  }

  /**
   * Total painted height in px.
   *
   * `GridRenderer` uses this for two things: reserving the flex band's own
   * height, and — for a non-sticky band — extending the scrollable content
   * height so the band occupies real scroll space rather than overlaying rows.
   */
  getHeight(): number {
    return this.height;
  }

  /** The band's root element, or `null` before {@link mount}. */
  getElement(): HTMLElement | null {
    return this.bandEl;
  }

  /**
   * Vertically offsets a non-sticky band so it tracks the scrolling content.
   *
   * Computed by `GridRenderer` in JS doubles and always within a viewport of
   * zero, so it never hits the float32 rasterisation limit that forces the data
   * rows through origin rebasing (see `panels.css.ts`). Written only on change:
   * `setProperty` invalidates style for the whole subtree, and this runs every
   * scroll frame.
   *
   * @param offsetY - Screen-space Y of the band's top edge, relative to the body viewport.
   * @param visible - `false` when the band has scrolled fully out of view.
   */
  setInlineOffset(offsetY: number, visible: boolean): void {
    const band = this.bandEl;
    if (!band) return;
    if (band.style.display !== (visible ? '' : 'none')) {
      band.style.display = visible ? '' : 'none';
    }
    if (!visible) return;
    const next = `${offsetY}px`;
    if (band.style.getPropertyValue('--pg-summary-offset-y') !== next) {
      band.style.setProperty('--pg-summary-offset-y', next);
    }
  }

  /** Detaches the band and releases every retained element. */
  destroy(): void {
    this.clear();
    this.bandEl?.remove();
    this.bandEl = null;
    this.regionEls.left = undefined;
    this.regionEls.center = undefined;
    this.regionEls.right = undefined;
    this.structureKey = '';
    this.height = 0;
  }

  // ─── Build ─────────────────────────────────────────────────────────────────

  /** Drops every rendered row and its retained bindings. */
  private clear(): void {
    for (const region of ['left', 'center', 'right'] as const) {
      const el = this.regionEls[region];
      if (el) while (el.firstChild) el.removeChild(el.firstChild);
    }
    this.bindings.clear();
    this.structureKey = '';
  }

  /**
   * Rebuilds every row in every region.
   *
   * Each region is assembled into a `DocumentFragment` and attached once, so a
   * band with three rows across three regions costs three DOM insertions rather
   * than one per cell.
   */
  private rebuild(rows: readonly SummaryBandRow[], layout: SummaryBandLayout): void {
    this.clear();

    const fragments: Record<RegionName, DocumentFragment> = {
      left: document.createDocumentFragment(),
      center: document.createDocumentFragment(),
      right: document.createDocumentFragment(),
    };

    for (const row of rows) {
      const binding: RowBinding = { elements: {}, cells: new Map() };

      if (layout.hasLeftPanel) {
        const el = this.buildRowElement(row, 'left', layout, binding);
        binding.elements.left = el;
        fragments.left.appendChild(el);
      }

      const centerEl = this.buildRowElement(row, 'center', layout, binding);
      binding.elements.center = centerEl;
      fragments.center.appendChild(centerEl);

      if (layout.hasRightPanel) {
        const el = this.buildRowElement(row, 'right', layout, binding);
        binding.elements.right = el;
        fragments.right.appendChild(el);
      }

      this.bindings.set(row.snapshot.id, binding);
    }

    this.regionEls.left?.appendChild(fragments.left);
    this.regionEls.center?.appendChild(fragments.center);
    this.regionEls.right?.appendChild(fragments.right);
  }

  /** Builds one row's slice for one region, registering each cell's binding. */
  private buildRowElement(
    row: SummaryBandRow,
    region: RegionName,
    layout: SummaryBandLayout,
    binding: RowBinding,
  ): HTMLElement {
    const el = createDiv('pg-summary__row');
    el.setAttribute('role', 'row');
    el.setAttribute('data-summary-row-id', row.snapshot.id);
    // A layout value, not a theme value: each summary row may set its own
    // height, so it cannot come from a static rule.
    el.style.height = `${row.snapshot.height}px`;
    if (row.snapshot.className) el.classList.add(...row.snapshot.className.split(/\s+/).filter(Boolean));

    // ── Leading gutters (left region only) ──────────────────────────────────
    // Serial BEFORE checkbox — the order `HeaderRenderer.buildHeaderRow` and
    // `BodyRenderer` use. The two are different widths (52px vs 44px), so
    // emitting them the other way round shifts every left-panel column by 8px.
    if (region === 'left') {
      if (layout.showSerialNumber) el.appendChild(createDiv('pg-summary__cell pg-summary__cell--serial'));
      if (layout.showCheckboxes) el.appendChild(createDiv('pg-summary__cell pg-summary__cell--checkbox'));
    }

    // ── Leading spacer / auto-group gutter (center region only) ─────────────
    if (region === 'center') {
      if (layout.hasGroupColumn) {
        const gutter = createDiv('pg-summary__cell pg-summary__cell--group');
        applyWidth(gutter, layout.groupColWidth);
        el.appendChild(gutter);
      }
      if (layout.centerLeftSpacerW > 0) {
        el.appendChild(buildSpacer(layout.centerLeftSpacerW));
      }
    }

    // ── Column cells ────────────────────────────────────────────────────────
    const cols = columnsFor(region, layout);
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const cellSnapshot = row.snapshot.cells.get(col.colId);
      const def = row.def.def.cells?.[col.colId];

      // A span is clamped to the end of its own region: the three regions are
      // separate DOM subtrees, so a cell physically cannot stretch from the left
      // pinned panel into the center.
      const span = cellSnapshot?.colSpan ?? 1;
      const effectiveSpan = Math.min(span, cols.length - i);

      const cellEl = this.buildCell(row, col, cellSnapshot, def, layout, effectiveSpan, cols, i);
      el.appendChild(cellEl.el);
      binding.cells.set(col.colId, cellEl);

      // Skip the columns this cell covers — they have no cell of their own.
      i += effectiveSpan - 1;
    }

    // ── Trailing spacer (center region only) ────────────────────────────────
    if (region === 'center' && layout.centerRightSpacerW > 0) {
      el.appendChild(buildSpacer(layout.centerRightSpacerW));
    }

    return el;
  }

  /** Builds one cell and returns its binding. */
  private buildCell(
    row: SummaryBandRow,
    col: ColumnDef,
    snapshot: SummaryCellSnapshot | undefined,
    def: SummaryCellDef | undefined,
    layout: SummaryBandLayout,
    span: number,
    cols: readonly ColumnDef[],
    index: number,
  ): CellBinding {
    const el = createDiv('pg-summary__cell');
    el.setAttribute('role', 'gridcell');
    el.setAttribute('data-col-id', col.colId);

    if (layout.showVerticalBorders) el.classList.add('pg-summary__cell--v-border');

    // Alignment follows the column, so a currency total sits under its values.
    const align = col.textAlign ?? defaultAlignFor(col);
    if (align !== 'left') el.classList.add(`pg-summary__cell--align-${align}`);

    if (span > 1) {
      el.classList.add('pg-summary__cell--span');
      el.setAttribute('aria-colspan', String(span));
      // A spanned cell cannot use the `[data-col-id]` width rule (that rule
      // sizes it to one column), so its width is summed here instead.
      let width = 0;
      for (let i = index; i < index + span; i++) width += layout.getColumnWidth(cols[i].colId);
      applyWidth(el, width);
    }

    if (def?.className) el.classList.add(...def.className.split(/\s+/).filter(Boolean));
    if (def?.style) {
      for (const property of Object.keys(def.style)) {
        el.style.setProperty(property, def.style[property]);
      }
    }

    const formattedValue = snapshot?.formattedValue ?? '';
    const tooltip = snapshot?.tooltip ?? null;
    if (tooltip !== null) el.setAttribute('title', tooltip);

    let valueEl: HTMLElement | null = null;
    if (def?.renderer && snapshot) {
      renderCustom(el, def, snapshot);
    } else {
      const inner = createDiv('pg-summary__value');
      inner.textContent = formattedValue;
      el.appendChild(inner);
      valueEl = inner;
    }

    return { el, valueEl, def, lastFormattedValue: formattedValue, lastTooltip: tooltip };
  }

  // ─── Patch ─────────────────────────────────────────────────────────────────

  /**
   * Updates values in place, touching only the cells whose display string or
   * tooltip actually changed.
   *
   * This is the path every ordinary data refresh takes, so it does no
   * allocation, no element creation, and — because `textContent` on an existing
   * text node does not change the box tree — no layout beyond the text itself.
   */
  private patch(rows: readonly SummaryBandRow[]): void {
    for (const row of rows) {
      const binding = this.bindings.get(row.snapshot.id);
      if (!binding) continue;

      for (const [colId, cell] of binding.cells) {
        const snapshot = row.snapshot.cells.get(colId);
        const formattedValue = snapshot?.formattedValue ?? '';
        const tooltip = snapshot?.tooltip ?? null;

        if (formattedValue !== cell.lastFormattedValue) {
          cell.lastFormattedValue = formattedValue;
          if (cell.valueEl) {
            cell.valueEl.textContent = formattedValue;
          } else if (cell.def?.renderer && snapshot) {
            // A custom renderer owns the cell's content, so its output has to be
            // regenerated rather than patched — the grid cannot know which part
            // of it encoded the value.
            renderCustom(cell.el, cell.def, snapshot);
          }
        }

        if (tooltip !== cell.lastTooltip) {
          cell.lastTooltip = tooltip;
          if (tooltip === null) cell.el.removeAttribute('title');
          else cell.el.setAttribute('title', tooltip);
        }
      }
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** The columns one region renders. */
function columnsFor(region: RegionName, layout: SummaryBandLayout): readonly ColumnDef[] {
  if (region === 'left') return layout.leftCols;
  if (region === 'right') return layout.rightCols;
  return layout.centerCols;
}

/**
 * Fingerprint of everything that changes the band's DOM *shape*.
 *
 * Values are deliberately excluded — that is the whole point: a refresh that
 * only moves numbers produces the same key and takes the cheap patch path.
 */
function buildStructureKey(
  rows: readonly SummaryBandRow[],
  layout: SummaryBandLayout,
): string {
  let key = '';
  for (const row of rows) {
    key += `${row.snapshot.id}~${row.snapshot.height}~${row.snapshot.className ?? ''}~`;
    // Spans move column boundaries, so they belong to the structure, and a cell
    // appearing or disappearing changes which columns get one at all.
    for (const [colId, cell] of row.snapshot.cells) {
      if (cell.colSpan > 1) key += `${colId}:${cell.colSpan},`;
    }
    key += `#${row.snapshot.cells.size};`;
  }
  key += '|';
  for (const col of layout.leftCols) key += `${col.colId},`;
  key += '|';
  for (const col of layout.centerCols) key += `${col.colId},`;
  key += '|';
  for (const col of layout.rightCols) key += `${col.colId},`;
  key += `|${layout.centerLeftSpacerW}|${layout.centerRightSpacerW}`;
  key += `|${layout.showCheckboxes ? 1 : 0}${layout.showSerialNumber ? 1 : 0}`;
  key += `${layout.showVerticalBorders ? 1 : 0}${layout.hasGroupColumn ? 1 : 0}`;
  key += `${layout.hasLeftPanel ? 1 : 0}${layout.hasRightPanel ? 1 : 0}`;
  key += `|${layout.groupColWidth}`;
  return key;
}

/** A fixed-width filler standing in for columns outside the virtual window. */
function buildSpacer(width: number): HTMLElement {
  const spacer = createDiv('pg-summary__spacer');
  spacer.setAttribute('role', 'presentation');
  applyWidth(spacer, width);
  return spacer;
}

/**
 * Pins an element to an exact pixel width.
 *
 * Inline rather than themed because these are computed layout values — a
 * virtual-window spacer or a summed `colSpan` — that no stylesheet can know.
 * The same approach the header uses for its own spacers.
 */
function applyWidth(el: HTMLElement, width: number): void {
  const px = `${width}px`;
  el.style.width = px;
  el.style.minWidth = px;
  el.style.maxWidth = px;
}

/**
 * Default horizontal alignment for a summary cell whose column does not specify
 * one: numeric aggregates read better right-aligned, everything else stays left.
 */
function defaultAlignFor(col: ColumnDef): 'left' | 'right' | 'center' {
  return col.type === 'number' || col.type === 'currency' ? 'right' : 'left';
}

/**
 * Replaces a cell's content with a custom renderer's output.
 *
 * Params come from the snapshot's own factory, so the renderer receives the real
 * scope rows, column definition and grid API — see
 * {@link SummaryCellSnapshot.createRendererParams}.
 */
function renderCustom(el: HTMLElement, def: SummaryCellDef, snapshot: SummaryCellSnapshot): void {
  const createParams = snapshot.createRendererParams;
  if (!createParams) return;

  const output = def.renderer!(createParams());

  while (el.firstChild) el.removeChild(el.firstChild);
  if (typeof output === 'string') el.innerHTML = output;
  else el.appendChild(output);
}
