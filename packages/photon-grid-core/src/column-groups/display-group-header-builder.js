import { createDiv } from '../renderer/dom-utils';
/**
 * Builds the multi-row grouped header DOM from a {@link DisplayHeaderTree}.
 *
 * ### Layout model
 * ```
 * pg-header-group-row depth-0  ← group cells (position: absolute)
 * pg-header-group-row depth-1  ← deeper group cells (if nested)
 * pg-header-row                ← leaf headers (built by HeaderRenderer)
 * ```
 *
 * Group rows use `position: relative` with absolutely-positioned cells,
 * allowing arbitrary column widths and nesting depths without flex constraints.
 * Filler cells occupy the group-row space of flat/shallow columns, making them
 * appear to span the full header height.
 *
 * ### Responsibilities
 * - Build one `HTMLElement` per group depth row (`buildGroupRows`).
 * - Rebuild existing rows in place without re-mounting (`updateGroupRows`).
 * - Render group cells: label, collapse button, resize handle.
 * - Render filler cells for flat/shallow columns.
 */
export class DisplayGroupHeaderBuilder {
    constructor(iconRenderer) {
        this.iconRenderer = iconRenderer;
    }
    // ── Public: build / update ────────────────────────────────────────────────
    /**
     * Build one `HTMLElement` per group depth row from the given display tree.
     * Returns an empty array when `maxGroupDepth === 0` (no groups present).
     *
     * @param tree    - Fully-computed display header tree.
     * @param options - Callbacks and configuration for interactive cells.
     */
    buildGroupRows(tree, options) {
        if (tree.maxGroupDepth === 0)
            return [];
        return tree.groupRows.map((row) => this.buildRow(row, options));
    }
    /**
     * Rebuild the contents of existing group-row elements in place.
     * Called when column widths change or collapse state is toggled.
     *
     * @param rowEls  - Previously built row elements (from `buildGroupRows`).
     * @param tree    - Updated display header tree.
     * @param options - Callbacks and configuration.
     */
    updateGroupRows(rowEls, tree, options) {
        if (rowEls.length === 0 || tree.maxGroupDepth === 0)
            return;
        const count = Math.min(rowEls.length, tree.groupRows.length);
        for (let d = 0; d < count; d++) {
            rowEls[d].innerHTML = '';
            this.populateRow(rowEls[d], tree.groupRows[d], options);
        }
    }
    // ── Private: DOM building ─────────────────────────────────────────────────
    buildRow(row, options) {
        const el = createDiv(`pg-header-group-row pg-header-group-row--depth-${row.depth}`);
        el.setAttribute('role', 'row');
        el.setAttribute('data-group-depth', String(row.depth));
        this.populateRow(el, row, options);
        return el;
    }
    populateRow(rowEl, row, options) {
        for (const cell of row.cells) {
            rowEl.appendChild(this.buildCell(cell, options));
        }
    }
    buildCell(cell, options) {
        if (cell.kind === 'filler') {
            // Filler cells occupy group-row space for flat/shallow columns.
            // They have the header background but no interactive elements.
            // data-col-id is stamped here so the group-drag CSS-transform path can
            // apply --pg-drag-x offsets to the filler cell via the same [data-col-id]
            // rule that shifts the corresponding leaf header and body cells.
            const filler = createDiv('pg-th pg-th--depth-filler');
            filler.setAttribute('data-filler-id', cell.id);
            filler.setAttribute('data-col-id', cell.colId);
            filler.style.left = `${cell.left}px`;
            filler.style.width = `${cell.width}px`;
            return filler;
        }
        return this.buildGroupCell(cell.node, cell.left, cell.width, options);
    }
    /**
     * Build a single interactive group header cell.
     *
     * @param group   - Display group node supplying all rendering data.
     * @param left    - Pixel left offset within the row.
     * @param width   - Pixel width of the cell.
     * @param options - Interactive callbacks.
     */
    buildGroupCell(group, left, width, options) {
        const isCollapsed = group.collapsed;
        const classes = ['pg-th', 'pg-th--group'];
        if (isCollapsed)
            classes.push('pg-th--group--collapsed');
        if (group.headerCssClass) {
            for (const cls of group.headerCssClass.split(' ')) {
                if (cls.trim())
                    classes.push(cls.trim());
            }
        }
        const th = createDiv(classes.join(' '));
        th.setAttribute('role', 'columnheader');
        th.setAttribute('data-group-id', group.logicalGroupId);
        th.setAttribute('data-instance-id', group.instanceId);
        th.setAttribute('aria-expanded', String(!isCollapsed));
        th.setAttribute('aria-label', group.header);
        th.setAttribute('tabindex', '0');
        th.style.left = `${left}px`;
        th.style.width = `${width}px`;
        if (group.headerRendererFn) {
            // Custom renderer — receive a minimal LogicalGroupDef proxy
            const proxy = {
                id: group.logicalGroupId,
                header: group.header,
                parentId: null,
                headerCssClass: group.headerCssClass,
                resizable: group.resizable,
                collapsedWidth: group.collapsedWidth,
                headerRendererFn: group.headerRendererFn,
            };
            const rendered = group.headerRendererFn({ logicalGroup: proxy, collapsed: isCollapsed, api: null });
            if (typeof rendered === 'string')
                th.innerHTML = rendered;
            else
                th.appendChild(rendered);
        }
        else {
            this.buildDefaultContent(th, group, isCollapsed);
        }
        // Resize handle — appears on hover; distributes width among all group leaves
        if (group.resizable) {
            const handle = createDiv('pg-th__resize-handle pg-th__resize-handle--group');
            handle.setAttribute('aria-hidden', 'true');
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.startGroupResize(e, group, width, options);
            });
            th.appendChild(handle);
        }
        // Mousedown: notify drag handler before threshold check
        th.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pg-th__resize-handle'))
                return;
            options.onGroupHeaderMouseDown?.(e, group, th);
        });
        // Click: toggle collapse (suppressed when drag just finished)
        th.addEventListener('click', (e) => {
            if (e.target.closest('.pg-th__resize-handle'))
                return;
            if (options.didJustDragFn?.())
                return;
            options.onCollapseToggle?.(group.instanceId);
        });
        // Right-click: open the group context menu at cursor position.
        th.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            options.onGroupContextMenu?.(e, group, th);
        });
        // Keyboard: Enter/Space toggles; Arrow keys expand/collapse directionally
        th.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                options.onCollapseToggle?.(group.instanceId);
            }
            else if (e.key === 'ArrowLeft' && !isCollapsed) {
                e.preventDefault();
                options.onCollapseToggle?.(group.instanceId);
            }
            else if (e.key === 'ArrowRight' && isCollapsed) {
                e.preventDefault();
                options.onCollapseToggle?.(group.instanceId);
            }
        });
        return th;
    }
    buildDefaultContent(th, group, isCollapsed) {
        const content = createDiv('pg-th__content');
        const labelEl = createDiv('pg-th__label');
        labelEl.textContent = group.header;
        labelEl.title = group.header;
        content.appendChild(labelEl);
        th.appendChild(content);
        const btn = createDiv('pg-th__collapse-btn');
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('aria-label', isCollapsed ? `Expand ${group.header}` : `Collapse ${group.header}`);
        btn.innerHTML = this.iconRenderer.renderToString(isCollapsed ? 'chevronRight' : 'chevronLeft', 12);
        th.appendChild(btn);
    }
    /**
     * Start a group-header resize drag.
     * Computes the new width on each mousemove and fires `onGroupResize`.
     *
     * @param e          - Initiating mousedown event.
     * @param group      - The group being resized.
     * @param startWidth - Pixel width at drag start.
     * @param options    - Contains the `onGroupResize` callback.
     */
    startGroupResize(e, group, startWidth, options) {
        const startX = e.clientX;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        const onMove = (ev) => {
            const newW = Math.max(group.collapsedWidth, startWidth + ev.clientX - startX);
            options.onGroupResize?.(group.instanceId, newW);
        };
        const onUp = (ev) => {
            const newW = Math.max(group.collapsedWidth, startWidth + ev.clientX - startX);
            options.onGroupResize?.(group.instanceId, newW);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }
}
//# sourceMappingURL=display-group-header-builder.js.map