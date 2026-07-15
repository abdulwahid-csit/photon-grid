import type { ColumnDef } from '../types/column.types';

/**
 * Manages a single <style> tag with per-column width rules.
 * Updating one rule instantly syncs header + all body cells with no DOM iteration.
 */
export class ColumnStyleManager {
  private styleEl: HTMLStyleElement | null = null;
  private widths = new Map<string, number>();
  private flexCols = new Map<string, { flex: number; minWidth: number }>();
  // Persists across initFromColumns calls so user-resized widths survive re-renders
  private userResizedWidths = new Map<string, number>();
  /**
   * Selector prefix scoping every generated rule to this grid instance's
   * `[data-photon-grid-id]`. Without it, `[data-col-id="year"]` is a global
   * selector — with Master/Detail, two independent `GridCore` instances on
   * the same page can legitimately reuse the same user-provided `colId`
   * (e.g. both configuring a "year" column), and resizing one would silently
   * resize the other via this shared, unscoped `<style>` rule. Empty until
   * `setScopeId` is called (mirrors the scoping already used for column-drag
   * transforms in `header-renderer.ts` / `display-group-drag-handler.ts`).
   */
  private scopePrefix = '';

  mount(): void {
    if (this.styleEl) return;
    this.styleEl = document.createElement('style');
    this.styleEl.setAttribute('data-pg-col-widths', '');
    document.head.appendChild(this.styleEl);
  }

  /** Scopes every subsequent generated rule to `[data-photon-grid-id="id"]`. Call once, right after the grid wrapper element receives that attribute. */
  setScopeId(id: string): void {
    this.scopePrefix = id ? `[data-photon-grid-id="${id}"] ` : '';
    this.flush();
  }

  initFromColumns(columns: ColumnDef[]): void {
    // Keep the previous resolved widths so a flex column that stops
    // participating in flex distribution (e.g. it just got pinned — pinned
    // panels are content-sized and have no container to flex against) retains
    // the width it last resolved to, instead of collapsing back to `minWidth`.
    // resolveFlex overwrites this placeholder for columns still in the center.
    const prevWidths = this.widths;
    this.widths = new Map<string, number>();
    this.flexCols.clear();
    for (const col of columns) {
      if (this.userResizedWidths.has(col.colId)) {
        // User manually resized — treat as fixed, ignore col.flex
        this.widths.set(col.colId, this.userResizedWidths.get(col.colId)!);
      } else if (col.flex != null) {
        const minW = col.minWidth ?? 80;
        this.flexCols.set(col.colId, { flex: col.flex, minWidth: minW });
        // Carry the last resolved width forward as the placeholder (never below
        // minWidth); falls back to minWidth on first render before any resolve.
        const prev = prevWidths.get(col.colId);
        this.widths.set(col.colId, prev != null ? Math.max(minW, prev) : minW);
      } else {
        this.widths.set(col.colId, col.width ?? col.minWidth ?? 150);
      }
    }
    this.flush();
  }

  /**
   * Distribute `containerWidth` among the given flex columns proportionally.
   * Fixed columns in `visibleColIds` are accounted for — flex columns share the remainder.
   */
  resolveFlex(visibleColIds: string[], containerWidth: number): void {
    if (containerWidth <= 0) return;
    const flexIds = visibleColIds.filter((id) => this.flexCols.has(id));
    if (flexIds.length === 0) return;

    const fixedTotal = visibleColIds
      .filter((id) => !this.flexCols.has(id))
      .reduce((sum, id) => sum + (this.widths.get(id) ?? 150), 0);

    const available = Math.max(0, containerWidth - fixedTotal);
    const totalFlex = flexIds.reduce((sum, id) => sum + (this.flexCols.get(id)?.flex ?? 1), 0);

    for (const id of flexIds) {
      const fc = this.flexCols.get(id)!;
      const resolved = Math.max(fc.minWidth, Math.floor((fc.flex / totalFlex) * available));
      this.widths.set(id, resolved);
    }
    this.flush();
  }

  hasFlex(colIds: string[]): boolean {
    return colIds.some((id) => this.flexCols.has(id));
  }

  setWidth(colId: string, width: number): void {
    // Persist so initFromColumns doesn't reset it on the next render
    this.userResizedWidths.set(colId, width);
    this.flexCols.delete(colId); // convert from flex to fixed
    this.widths.set(colId, width);
    this.flush();
  }

  /**
   * Batch counterpart to {@link setWidth}: applies several column widths as
   * user-fixed values and rewrites the `<style>` tag once. Use for Auto Size
   * All / Fit to Grid so N columns cost a single flush instead of N.
   *
   * @param entries - `[colId, width]` pairs to apply.
   */
  setWidths(entries: ReadonlyArray<readonly [string, number]>): void {
    if (entries.length === 0) return;
    for (const [colId, width] of entries) {
      this.userResizedWidths.set(colId, width);
      this.flexCols.delete(colId);
      this.widths.set(colId, width);
    }
    this.flush();
  }

  /**
   * Drops the user-fixed width override for a column so the next
   * `initFromColumns` re-derives its width from the `ColumnDef` (flex or fixed).
   * The counterpart to {@link setWidth}, used by "Reset Width". No flush here —
   * the resulting re-render re-initialises and flushes.
   *
   * @param colId - Column whose manual width should be forgotten.
   */
  clearUserWidth(colId: string): void {
    this.userResizedWidths.delete(colId);
  }

  /**
   * Converts every currently-flex column into a fixed column pinned at its
   * present resolved width. Called when a manual column resize begins so the
   * drag changes only the dragged column: without this, `resolveFlex` would
   * redistribute the container width on the next render and shrink the other
   * flex columns (down to `minWidth`) to compensate for the one that grew.
   * A manual resize therefore overrides flex, and total width can now exceed
   * the viewport (a horizontal scrollbar appears) instead of columns collapsing.
   */
  freezeFlexWidths(): void {
    if (this.flexCols.size === 0) return;
    for (const [colId, fc] of this.flexCols) {
      const resolved = this.widths.get(colId) ?? fc.minWidth;
      this.userResizedWidths.set(colId, resolved);
    }
    this.flexCols.clear();
    this.flush();
  }

  getWidth(colId: string): number {
    return this.widths.get(colId) ?? 150;
  }

  getTotalWidth(visibleColIds: string[]): number {
    return visibleColIds.reduce((sum, id) => sum + (this.widths.get(id) ?? 150), 0);
  }

  private flush(): void {
    if (!this.styleEl) return;
    const rules: string[] = [];
    for (const [colId, width] of this.widths) {
      rules.push(
        `${this.scopePrefix}[data-col-id="${colId}"] { width: ${width}px; min-width: ${width}px; max-width: ${width}px; flex-shrink: 0; }`,
      );
    }
    this.styleEl.textContent = rules.join('\n');
  }

  destroy(): void {
    this.styleEl?.remove();
    this.styleEl = null;
    this.widths.clear();
    this.flexCols.clear();
    this.userResizedWidths.clear();
  }
}
