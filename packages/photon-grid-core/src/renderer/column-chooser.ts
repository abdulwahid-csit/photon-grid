import type { ColumnDef, ColumnDefInput } from '../types/column.types';
import type { ColumnModel } from '../core/column-model';
import type { IconRenderer } from '../icons/icon-renderer';

/**
 * Modal "Choose Columns" dialog — the target of the column menu's
 * `Visibility ▸ Column Chooser…` item.
 *
 * Renders the grid's columns as a tree that mirrors the header's column-group
 * structure: any `ColumnDef` with a `children` array becomes an
 * expand/collapse group node with a tri-state checkbox that toggles all of its
 * descendant columns; every other column is a flat row with a checkbox and its
 * header label. A search box filters by header text.
 *
 * The component owns only DOM + view state (expanded groups, search term).
 * Visibility itself is delegated to {@link ColumnModel.setColumnVisible}, so the
 * grid stays the single source of truth. Every visual is class-driven — all
 * colors, spacing, radii and typography come from theme CSS variables (see
 * `column-chooser.css.ts`); the component sets no inline styles.
 */
export class ColumnChooser {
  private overlayEl: HTMLElement | null = null;
  private dialogEl: HTMLElement | null = null;
  private treeEl: HTMLElement | null = null;

  /** Original, still-nested column definitions used as the tree's structure. */
  private columns: ColumnDefInput[] = [];
  /** Group ids currently expanded in the tree. */
  private readonly expanded = new Set<string>();
  /** Lower-cased search term; empty shows everything. */
  private searchTerm = '';

  private readonly boundKeydown: (e: KeyboardEvent) => void;
  private readonly boundOutsideDown: (e: MouseEvent) => void;

  constructor(
    private readonly columnModel: ColumnModel,
    private readonly iconRenderer: IconRenderer,
  ) {
    this.boundKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.close();
    };
    // Close when a pointer press lands anywhere outside the dialog. Captured at
    // the document level (capture phase) so it fires regardless of z-index or
    // whether the press hit the grid, a menu, or the page background.
    this.boundOutsideDown = (e: MouseEvent): void => {
      if (this.dialogEl && !this.dialogEl.contains(e.target as Node)) this.close();
    };
  }

  /**
   * Opens the dialog for the given (nested) column definitions. Re-opening
   * while already open rebuilds it. Groups are expanded by default so the user
   * sees the full structure immediately.
   *
   * @param columns - The grid's top-level `ColumnDef[]`, groups included.
   */
  open(columns: ColumnDefInput[]): void {
    this.columns = columns;
    this.close();

    // Expand every group by default on first open.
    this.expanded.clear();
    this.collectGroupIds(columns, this.expanded);

    this.build();
    document.addEventListener('keydown', this.boundKeydown);
    // Deferred so the click that opened the dialog (still in flight) doesn't
    // immediately trigger the outside-press handler and close it.
    setTimeout(() => {
      if (this.overlayEl) document.addEventListener('mousedown', this.boundOutsideDown, true);
    }, 0);
  }

  /** Closes the dialog and detaches listeners. Safe when already closed. */
  close(): void {
    document.removeEventListener('keydown', this.boundKeydown);
    document.removeEventListener('mousedown', this.boundOutsideDown, true);
    this.overlayEl?.remove();
    this.overlayEl = null;
    this.dialogEl = null;
    this.treeEl = null;
  }

  /** Permanently disposes the component. */
  destroy(): void {
    this.close();
  }

  // ── DOM construction ────────────────────────────────────────────────────

  private build(): void {
    const doc = document;

    const overlay = doc.createElement('div');
    overlay.className = 'pg-col-chooser__overlay';

    const dialog = doc.createElement('div');
    dialog.className = 'pg-col-chooser';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', 'Choose columns');

    // Header ────────────────────────────────────────────────────────────────
    const header = doc.createElement('div');
    header.className = 'pg-col-chooser__header';

    const title = doc.createElement('span');
    title.className = 'pg-col-chooser__title';
    title.textContent = 'Choose Columns';

    const closeBtn = doc.createElement('button');
    closeBtn.className = 'pg-col-chooser__close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = this.iconRenderer.renderToString('close', 16);
    closeBtn.addEventListener('click', () => this.close());

    header.append(title, closeBtn);

    // Search ──────────────────────────────────────────────────────────────
    const search = doc.createElement('div');
    search.className = 'pg-col-chooser__search';

    const searchIcon = doc.createElement('span');
    searchIcon.className = 'pg-col-chooser__search-icon';
    searchIcon.innerHTML = this.iconRenderer.renderToString('search', 14);

    const searchInput = doc.createElement('input');
    searchInput.className = 'pg-col-chooser__search-input';
    searchInput.type = 'text';
    searchInput.placeholder = 'Search…';
    searchInput.setAttribute('aria-label', 'Search columns');
    searchInput.addEventListener('input', () => {
      this.searchTerm = searchInput.value.trim().toLowerCase();
      this.renderTree();
    });

    search.append(searchIcon, searchInput);

    // Body / tree ────────────────────────────────────────────────────────
    const body = doc.createElement('div');
    body.className = 'pg-col-chooser__body';

    const tree = doc.createElement('div');
    tree.className = 'pg-col-chooser__tree';
    tree.setAttribute('role', 'tree');
    body.appendChild(tree);
    this.treeEl = tree;

    dialog.append(header, search, body);
    overlay.appendChild(dialog);
    doc.body.appendChild(overlay);
    this.overlayEl = overlay;
    this.dialogEl = dialog;

    this.renderTree();
    searchInput.focus();
  }

  /** Rebuilds the tree body from the current search term and expanded state. */
  private renderTree(): void {
    if (!this.treeEl) return;
    this.treeEl.textContent = '';
    const frag = document.createDocumentFragment();
    for (const def of this.columns) {
      const node = this.buildNode(def);
      if (node) frag.appendChild(node);
    }
    if (!frag.childNodes.length) {
      const empty = document.createElement('div');
      empty.className = 'pg-col-chooser__empty';
      empty.textContent = 'No columns match your search.';
      frag.appendChild(empty);
    }
    this.treeEl.appendChild(frag);
  }

  /**
   * Builds a group or leaf node (recursively), or `null` when it is filtered
   * out by the current search term.
   */
  private buildNode(def: ColumnDefInput): HTMLElement | null {
    const isGroup = Array.isArray(def.children) && def.children.length > 0;
    return isGroup ? this.buildGroupNode(def) : this.buildLeafNode(def);
  }

  private buildGroupNode(def: ColumnDefInput): HTMLElement | null {
    if (this.searchTerm && !this.groupMatches(def)) return null;

    const groupId = this.groupId(def);
    // While searching, force groups with matches open so results are visible.
    const isExpanded = this.searchTerm ? true : this.expanded.has(groupId);

    const wrap = document.createElement('div');
    wrap.className = 'pg-col-chooser__group';

    const row = this.makeRow();
    row.classList.add('pg-col-chooser__row--group');

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pg-col-chooser__toggle';
    toggle.setAttribute('aria-label', isExpanded ? 'Collapse group' : 'Expand group');
    toggle.innerHTML = this.iconRenderer.renderToString(isExpanded ? 'chevronDown' : 'chevronRight', 14);
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.expanded.has(groupId)) this.expanded.delete(groupId);
      else this.expanded.add(groupId);
      this.renderTree();
    });

    const { checkbox, state } = this.makeGroupCheckbox(def);
    const label = this.makeLabel(def.header ?? groupId);

    row.append(toggle, checkbox, label);
    // Clicking the row label area toggles the whole group's visibility.
    label.addEventListener('click', () => this.setGroupVisible(def, state !== 'all'));

    wrap.appendChild(row);

    if (isExpanded) {
      const children = document.createElement('div');
      children.className = 'pg-col-chooser__children';
      children.setAttribute('role', 'group');
      for (const child of def.children!) {
        const childNode = this.buildNode(child);
        if (childNode) children.appendChild(childNode);
      }
      wrap.appendChild(children);
    }

    return wrap;
  }

  private buildLeafNode(def: ColumnDefInput): HTMLElement | null {
    const live = this.resolveLeaf(def);
    if (!live) return null;
    if (this.searchTerm && !(live.header ?? '').toLowerCase().includes(this.searchTerm)) return null;

    const row = this.makeRow();
    row.classList.add('pg-col-chooser__row--leaf');

    const spacer = document.createElement('span');
    spacer.className = 'pg-col-chooser__toggle pg-col-chooser__toggle--spacer';

    const visible = live.visible !== false;
    const checkbox = this.makeCheckbox(visible, false, !!live.alwaysVisible);
    const label = this.makeLabel(live.header ?? live.colId);

    const toggle = (): void => {
      if (live.alwaysVisible) return;
      this.columnModel.setColumnVisible(live.colId, live.visible === false);
      this.renderTree();
    };
    checkbox.addEventListener('click', toggle);
    label.addEventListener('click', toggle);

    row.append(spacer, checkbox, label);
    return row;
  }

  // ── Small DOM builders ──────────────────────────────────────────────────

  /** A tree row. Hierarchical indent is handled by the nested `__children` container in CSS — no inline geometry. */
  private makeRow(): HTMLElement {
    const row = document.createElement('div');
    row.className = 'pg-col-chooser__row';
    row.setAttribute('role', 'treeitem');
    return row;
  }

  private makeLabel(text: string): HTMLElement {
    const label = document.createElement('span');
    label.className = 'pg-col-chooser__label';
    label.textContent = text;
    label.title = text;
    return label;
  }

  /**
   * A themed tri-state checkbox. `checked`/`indeterminate` drive modifier
   * classes; the tick glyph comes from the icon registry so it themes with the
   * rest of the grid. `disabled` covers always-visible columns.
   */
  private makeCheckbox(checked: boolean, indeterminate: boolean, disabled: boolean): HTMLElement {
    const box = document.createElement('span');
    box.className = 'pg-col-chooser__checkbox';
    box.setAttribute('role', 'checkbox');
    box.tabIndex = disabled ? -1 : 0;
    box.setAttribute('aria-checked', indeterminate ? 'mixed' : String(checked));
    if (checked) box.classList.add('pg-col-chooser__checkbox--checked');
    if (indeterminate) box.classList.add('pg-col-chooser__checkbox--indeterminate');
    if (disabled) box.classList.add('pg-col-chooser__checkbox--disabled');
    box.innerHTML = this.iconRenderer.renderToString('check', 12);
    return box;
  }

  /** Builds a group checkbox reflecting the aggregate visibility of its leaves. */
  private makeGroupCheckbox(def: ColumnDefInput): { checkbox: HTMLElement; state: 'all' | 'none' | 'some' } {
    const leaves = this.groupLeaves(def);
    const visibleCount = leaves.filter((c) => c.visible !== false).length;
    const state: 'all' | 'none' | 'some' =
      visibleCount === 0 ? 'none' : visibleCount === leaves.length ? 'all' : 'some';

    const checkbox = this.makeCheckbox(state === 'all', state === 'some', false);
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      // "some"/"none" → show all; "all" → hide all.
      this.setGroupVisible(def, state !== 'all');
    });
    return { checkbox, state };
  }

  // ── Visibility helpers ──────────────────────────────────────────────────

  private setGroupVisible(def: ColumnDefInput, visible: boolean): void {
    for (const leaf of this.groupLeaves(def)) {
      if (leaf.alwaysVisible) continue;
      this.columnModel.setColumnVisible(leaf.colId, visible);
    }
    this.renderTree();
  }

  /** Live {@link ColumnModel} leaves that belong to a (possibly nested) group. */
  private groupLeaves(def: ColumnDefInput): ColumnDef[] {
    const out: ColumnDef[] = [];
    const walk = (d: ColumnDefInput): void => {
      if (Array.isArray(d.children) && d.children.length > 0) {
        d.children.forEach(walk);
      } else {
        const live = this.resolveLeaf(d);
        if (live) out.push(live);
      }
    };
    def.children?.forEach(walk);
    return out;
  }

  /**
   * Resolves a nested (possibly un-normalized) leaf definition to the live
   * column held by {@link ColumnModel}. Matches by `colId` first, then falls
   * back to `field` since the original defs may predate colId normalization.
   */
  private resolveLeaf(def: ColumnDefInput): ColumnDef | undefined {
    if (def.colId) {
      const byId = this.columnModel.getColumn(def.colId);
      if (byId) return byId;
    }
    if (def.field) {
      return this.columnModel.getAllColumns().find((c) => c.field === def.field);
    }
    return undefined;
  }

  // ── Search / structure helpers ──────────────────────────────────────────

  /** `true` when a group has at least one leaf whose header matches the search. */
  private groupMatches(def: ColumnDefInput): boolean {
    if (!this.searchTerm) return true;
    if ((def.header ?? '').toLowerCase().includes(this.searchTerm)) return true;
    return this.groupLeaves(def).some((c) => (c.header ?? '').toLowerCase().includes(this.searchTerm));
  }

  private groupId(def: ColumnDefInput): string {
    return def.colId ?? def.header ?? '';
  }

  private collectGroupIds(defs: ColumnDefInput[], out: Set<string>): void {
    for (const def of defs) {
      if (Array.isArray(def.children) && def.children.length > 0) {
        out.add(this.groupId(def));
        this.collectGroupIds(def.children, out);
      }
    }
  }
}
