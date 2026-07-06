/**
 * Manages a single <style> tag with per-column width rules.
 * Updating one rule instantly syncs header + all body cells with no DOM iteration.
 */
export class ColumnStyleManager {
    constructor() {
        this.styleEl = null;
        this.widths = new Map();
        this.flexCols = new Map();
        // Persists across initFromColumns calls so user-resized widths survive re-renders
        this.userResizedWidths = new Map();
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
        this.scopePrefix = '';
    }
    mount() {
        if (this.styleEl)
            return;
        this.styleEl = document.createElement('style');
        this.styleEl.setAttribute('data-pg-col-widths', '');
        document.head.appendChild(this.styleEl);
    }
    /** Scopes every subsequent generated rule to `[data-photon-grid-id="id"]`. Call once, right after the grid wrapper element receives that attribute. */
    setScopeId(id) {
        this.scopePrefix = id ? `[data-photon-grid-id="${id}"] ` : '';
        this.flush();
    }
    initFromColumns(columns) {
        this.widths.clear();
        this.flexCols.clear();
        for (const col of columns) {
            if (this.userResizedWidths.has(col.colId)) {
                // User manually resized — treat as fixed, ignore col.flex
                this.widths.set(col.colId, this.userResizedWidths.get(col.colId));
            }
            else if (col.flex != null) {
                const minW = col.minWidth ?? 80;
                this.flexCols.set(col.colId, { flex: col.flex, minWidth: minW });
                this.widths.set(col.colId, minW); // placeholder until resolveFlex
            }
            else {
                this.widths.set(col.colId, col.width ?? col.minWidth ?? 150);
            }
        }
        this.flush();
    }
    /**
     * Distribute `containerWidth` among the given flex columns proportionally.
     * Fixed columns in `visibleColIds` are accounted for — flex columns share the remainder.
     */
    resolveFlex(visibleColIds, containerWidth) {
        if (containerWidth <= 0)
            return;
        const flexIds = visibleColIds.filter((id) => this.flexCols.has(id));
        if (flexIds.length === 0)
            return;
        const fixedTotal = visibleColIds
            .filter((id) => !this.flexCols.has(id))
            .reduce((sum, id) => sum + (this.widths.get(id) ?? 150), 0);
        const available = Math.max(0, containerWidth - fixedTotal);
        const totalFlex = flexIds.reduce((sum, id) => sum + (this.flexCols.get(id)?.flex ?? 1), 0);
        for (const id of flexIds) {
            const fc = this.flexCols.get(id);
            const resolved = Math.max(fc.minWidth, Math.floor((fc.flex / totalFlex) * available));
            this.widths.set(id, resolved);
        }
        this.flush();
    }
    hasFlex(colIds) {
        return colIds.some((id) => this.flexCols.has(id));
    }
    setWidth(colId, width) {
        // Persist so initFromColumns doesn't reset it on the next render
        this.userResizedWidths.set(colId, width);
        this.flexCols.delete(colId); // convert from flex to fixed
        this.widths.set(colId, width);
        this.flush();
    }
    getWidth(colId) {
        return this.widths.get(colId) ?? 150;
    }
    getTotalWidth(visibleColIds) {
        return visibleColIds.reduce((sum, id) => sum + (this.widths.get(id) ?? 150), 0);
    }
    flush() {
        if (!this.styleEl)
            return;
        const rules = [];
        for (const [colId, width] of this.widths) {
            rules.push(`${this.scopePrefix}[data-col-id="${colId}"] { width: ${width}px; min-width: ${width}px; max-width: ${width}px; flex-shrink: 0; }`);
        }
        this.styleEl.textContent = rules.join('\n');
    }
    destroy() {
        this.styleEl?.remove();
        this.styleEl = null;
        this.widths.clear();
        this.flexCols.clear();
        this.userResizedWidths.clear();
    }
}
//# sourceMappingURL=column-style-manager.js.map