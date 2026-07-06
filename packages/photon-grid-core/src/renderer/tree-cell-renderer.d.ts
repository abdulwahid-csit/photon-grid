import type { RowNode } from '../types/row.types';
import type { ColumnDef } from '../types/column.types';
import type { EventBus } from '../event-bus/event-bus';
import type { IconRenderer } from '../icons/icon-renderer';
/** The subset of `TreeDataConfig` `BodyRenderer` needs — passed as plain data so this module never imports the tree engine types (rendering never builds hierarchy, per the feature's own design contract). */
export interface TreeToggleRenderConfig {
    toggleColumnId: string;
    isExpandedFn: (nodeId: string) => boolean;
}
/**
 * Inserts Tree Data's expand/collapse toggle as a sibling of `.pg-cell__inner`
 * (never inside it — same reasoning as `BodyRenderer.applyMasterDetailToggle`:
 * `.pg-cell__inner` is wiped and rebuilt wholesale when a cell starts/stops
 * editing, which would silently destroy a toggle placed inside it).
 *
 * A pure function, not a method on `BodyRenderer` — kept in its own module so
 * Tree Data's rendering concern stays a separate, focused unit even though it
 * executes inline in `BodyRenderer`'s existing per-cell build loop for
 * performance (no parallel DOM pass, no extra pooling).
 *
 * No-ops for anything but a `'data'` row in the configured toggle column.
 * A leaf row (no children) still reserves the toggle's own width as an
 * invisible spacer rather than omitting it — without that, a leaf's content
 * starts right at the level's base indent while its parent's content is
 * pushed further right by the real toggle button + gap, so children render
 * *less* indented than the parent they belong to. Reserving the same slot
 * on every row keeps each level's content start strictly increasing.
 */
export declare function applyTreeToggle(cellEl: HTMLElement, row: RowNode, colDef: ColumnDef, treeData: TreeToggleRenderConfig | undefined, iconRenderer: IconRenderer, eventBus: EventBus): void;
/**
 * Re-applies the toggle icon/label after expansion state changes without a
 * full row rebuild — mirrors `BodyRenderer.updatePanelRow`'s master-detail
 * sync block. A no-op when the row has no toggle button (leaf rows, or
 * Tree Data not enabled).
 */
export declare function syncTreeToggle(rowEl: HTMLElement, row: RowNode, treeData: TreeToggleRenderConfig | undefined, iconRenderer: IconRenderer): void;
//# sourceMappingURL=tree-cell-renderer.d.ts.map