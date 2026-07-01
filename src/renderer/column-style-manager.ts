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

  mount(): void {
    if (this.styleEl) return;
    this.styleEl = document.createElement('style');
    this.styleEl.setAttribute('data-pg-col-widths', '');
    document.head.appendChild(this.styleEl);
  }

  initFromColumns(columns: ColumnDef[]): void {
    this.widths.clear();
    this.flexCols.clear();
    for (const col of columns) {
      if (this.userResizedWidths.has(col.colId)) {
        // User manually resized — treat as fixed, ignore col.flex
        this.widths.set(col.colId, this.userResizedWidths.get(col.colId)!);
      } else if (col.flex != null) {
        const minW = col.minWidth ?? 80;
        this.flexCols.set(col.colId, { flex: col.flex, minWidth: minW });
        this.widths.set(col.colId, minW); // placeholder until resolveFlex
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
        `[data-col-id="${colId}"] { width: ${width}px; min-width: ${width}px; max-width: ${width}px; flex-shrink: 0; }`,
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
