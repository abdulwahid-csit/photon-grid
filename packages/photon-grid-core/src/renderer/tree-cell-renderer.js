import { GridEventType } from '../types/event.types';
import { createDiv } from './dom-utils';
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
export function applyTreeToggle(cellEl, row, colDef, treeData, iconRenderer, eventBus) {
    if (!treeData || row.type !== 'data' || colDef.colId !== treeData.toggleColumnId)
        return;
    // Marks the toggle column's cell for level-based indentation (see the
    // `.pg-row--tree[data-level="N"] .pg-cell--tree-toggle-col` rules in
    // base-styles.ts) — applied to every row in this column, leaves included,
    // since a leaf still needs to sit indented under its parent even with no
    // chevron of its own.
    cellEl.classList.add('pg-cell--tree-toggle-col');
    const inner = cellEl.querySelector('.pg-cell__inner');
    if (!row.hasChildren) {
        const spacer = createDiv('pg-tree-toggle-spacer');
        if (inner)
            cellEl.insertBefore(spacer, inner);
        else
            cellEl.insertBefore(spacer, cellEl.firstChild);
        return;
    }
    const isExpanded = treeData.isExpandedFn(row.nodeId);
    const toggleBtn = createDiv('pg-tree-toggle');
    toggleBtn.setAttribute('role', 'button');
    toggleBtn.setAttribute('data-tree-toggle', '');
    toggleBtn.setAttribute('aria-label', isExpanded ? 'Collapse' : 'Expand');
    toggleBtn.appendChild(iconRenderer.render(isExpanded ? 'chevronDown' : 'chevronRight', { size: 16 }));
    if (inner) {
        cellEl.insertBefore(toggleBtn, inner);
    }
    else {
        cellEl.insertBefore(toggleBtn, cellEl.firstChild);
    }
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        eventBus.emit(GridEventType.TREE_NODE_TOGGLE_CLICKED, { row, colDef });
    });
}
/**
 * Re-applies the toggle icon/label after expansion state changes without a
 * full row rebuild — mirrors `BodyRenderer.updatePanelRow`'s master-detail
 * sync block. A no-op when the row has no toggle button (leaf rows, or
 * Tree Data not enabled).
 */
export function syncTreeToggle(rowEl, row, treeData, iconRenderer) {
    if (!treeData || row.type !== 'data')
        return;
    const toggleBtn = rowEl.querySelector('.pg-tree-toggle');
    if (!toggleBtn)
        return;
    const isExpanded = treeData.isExpandedFn(row.nodeId);
    const iconEl = toggleBtn.querySelector('.pg-icon');
    if (iconEl)
        iconRenderer.updateIcon(iconEl, isExpanded ? 'chevronDown' : 'chevronRight');
    toggleBtn.setAttribute('aria-label', isExpanded ? 'Collapse' : 'Expand');
}
//# sourceMappingURL=tree-cell-renderer.js.map