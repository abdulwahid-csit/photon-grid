import type { ColumnDef } from '../types/column.types';
/**
 * Manages a single <style> tag with per-column width rules.
 * Updating one rule instantly syncs header + all body cells with no DOM iteration.
 */
export declare class ColumnStyleManager {
    private styleEl;
    private widths;
    private flexCols;
    private userResizedWidths;
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
    private scopePrefix;
    mount(): void;
    /** Scopes every subsequent generated rule to `[data-photon-grid-id="id"]`. Call once, right after the grid wrapper element receives that attribute. */
    setScopeId(id: string): void;
    initFromColumns(columns: ColumnDef[]): void;
    /**
     * Distribute `containerWidth` among the given flex columns proportionally.
     * Fixed columns in `visibleColIds` are accounted for — flex columns share the remainder.
     */
    resolveFlex(visibleColIds: string[], containerWidth: number): void;
    hasFlex(colIds: string[]): boolean;
    setWidth(colId: string, width: number): void;
    getWidth(colId: string): number;
    getTotalWidth(visibleColIds: string[]): number;
    private flush;
    destroy(): void;
}
//# sourceMappingURL=column-style-manager.d.ts.map