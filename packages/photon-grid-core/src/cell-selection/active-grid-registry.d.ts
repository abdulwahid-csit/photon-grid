/**
 * Tracks which grid instance's cell selection is currently "active" on the
 * page, so exactly one `CellSelectionEngine` ever has a live selection at a
 * time.
 *
 * Every `GridCore` — including nested Master/Detail instances — shares the
 * same `document`-level keydown listener pattern (see `CellSelectionEngine.
 * attach`). Without this registry, clicking a cell in one grid never clears
 * the previous grid's visual selection, and a global shortcut like Ctrl+A
 * would apply to every grid on the page simultaneously instead of just the
 * one the user is interacting with.
 *
 * The fix doesn't require any DOM containment checks: `CellSelectionEngine.
 * onKeydown` already no-ops when its own `activeCell` is `null` (nothing to
 * act on). This registry's only job is ensuring that whenever a NEW grid
 * becomes active, the PREVIOUSLY active one is deactivated — which clears
 * its `activeCell`, and that existing guard does the rest for free.
 */
export interface ActivatableSelection {
    /** Clears this grid's own selection/active-cell state and its visual classes. */
    clearSelection(): void;
}
declare class ActiveGridRegistry {
    private active;
    /**
     * Marks `grid` as the active selection surface, deactivating whichever
     * grid held that role before (if different). Called on every user-driven
     * selection start (cell click, range extend, ctrl+click).
     */
    setActive(grid: ActivatableSelection): void;
    /** Releases `grid`'s claim on activeness — call from `detach()`/`destroy()` so a torn-down grid is never left "active". */
    release(grid: ActivatableSelection): void;
}
/** Single shared instance — every `CellSelectionEngine` on the page coordinates through this one registry. */
export declare const activeGridRegistry: ActiveGridRegistry;
export {};
//# sourceMappingURL=active-grid-registry.d.ts.map