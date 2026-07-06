import type { ColumnDropdownOption } from '../../types/column.types';
import type { RendererOutput } from '../../types/renderer.types';
export interface CustomDropdownCallbacks {
    /**
     * Called when the user highlights and commits an option.
     * Update the cell's pending value here before calling `onStop(true)`.
     */
    onSelect: (option: ColumnDropdownOption) => void;
    /**
     * Called when editing should end.
     * @param commit `true`  → apply the selected value (Enter / option click)
     *               `false` → discard (Escape / outside click)
     */
    onStop: (commit: boolean) => void;
    /**
     * Optional. Called when the user presses Tab (or Shift+Tab) to commit the
     * current selection and move editing focus to the adjacent cell.
     * @param shiftKey `true` → move backwards (Shift+Tab)
     */
    onTab?: (shiftKey: boolean) => void;
    /**
     * Optional. When supplied, replaces this option's inner content (icon +
     * label + check mark) with custom markup. The surrounding option row keeps
     * its own id/role/data-index/mousedown/mouseenter wiring untouched, so
     * keyboard navigation and selection keep working regardless of content.
     */
    renderOption?: (option: ColumnDropdownOption, index: number, selected: boolean, highlighted: boolean) => RendererOutput;
}
/**
 * Accessible, virtually-scrolled custom dropdown editor for `dropdown` and
 * `object` column types.
 *
 * The list panel is appended to `document.body` with `position: fixed` so it
 * escapes the grid's `overflow: hidden` without requiring a portal container.
 *
 * Keyboard shortcuts:
 * - ArrowDown / ArrowUp  — move highlight one row
 * - PageDown / PageUp    — move highlight one page
 * - Home / End           — jump to first / last option
 * - Enter                — commit the highlighted option
 * - Escape / Tab         — cancel (close without change)
 */
export declare class CustomDropdownEditor {
    /** The cell's `.pg-cell__inner` element — the trigger is mounted here. */
    private readonly container;
    /** The `.pg-cell` element — used to compute the panel's viewport position. */
    private readonly cellEl;
    private readonly options;
    private readonly currentValue;
    private readonly callbacks;
    /** Height of each option row in pixels. Keep in sync with CSS. */
    static readonly ITEM_HEIGHT = 34;
    /** Maximum number of rows shown before the list scrolls. */
    static readonly MAX_VISIBLE = 8;
    /** Extra rows rendered above/below the visible window for smooth scrolling. */
    static readonly SCROLL_BUFFER = 3;
    private static instanceCounter;
    private readonly instanceId;
    private triggerEl;
    private panelEl;
    private scrollEl;
    private itemsEl;
    private highlightedIndex;
    private readonly selectedIndex;
    private destroyed;
    constructor(
    /** The cell's `.pg-cell__inner` element — the trigger is mounted here. */
    container: HTMLElement, 
    /** The `.pg-cell` element — used to compute the panel's viewport position. */
    cellEl: HTMLElement, options: ColumnDropdownOption[], currentValue: unknown, callbacks: CustomDropdownCallbacks);
    /**
     * Tear down the editor: remove the panel from the DOM and detach all event
     * listeners.  Safe to call multiple times.
     */
    destroy(): void;
    private mount;
    private buildTrigger;
    private syncTrigger;
    private buildPanel;
    private renderVisibleItems;
    private positionPanel;
    private handleKeyDown;
    private handleScroll;
    private handleOutsideClick;
    private handleResize;
    /**
     * Closes the dropdown immediately when any element outside the panel scrolls.
     * Catches both vertical and horizontal grid body scroll via capture-phase listener.
     * Scroll events originating inside the virtual-scroll list are excluded.
     */
    private handleBodyScroll;
    private navigate;
    private setHighlight;
    private scrollToIndex;
    private selectIndex;
    private buildIcon;
    private optId;
}
//# sourceMappingURL=custom-dropdown-editor.d.ts.map