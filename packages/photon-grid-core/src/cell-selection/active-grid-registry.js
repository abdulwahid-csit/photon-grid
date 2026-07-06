class ActiveGridRegistry {
    constructor() {
        this.active = null;
    }
    /**
     * Marks `grid` as the active selection surface, deactivating whichever
     * grid held that role before (if different). Called on every user-driven
     * selection start (cell click, range extend, ctrl+click).
     */
    setActive(grid) {
        if (this.active === grid)
            return;
        const previous = this.active;
        this.active = grid;
        previous?.clearSelection();
    }
    /** Releases `grid`'s claim on activeness — call from `detach()`/`destroy()` so a torn-down grid is never left "active". */
    release(grid) {
        if (this.active === grid)
            this.active = null;
    }
}
/** Single shared instance — every `CellSelectionEngine` on the page coordinates through this one registry. */
export const activeGridRegistry = new ActiveGridRegistry();
//# sourceMappingURL=active-grid-registry.js.map