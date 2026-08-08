import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { EditingConfig } from '../../types/grid.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
import type { EditorManager } from '../../editing/session/editor-manager';

/**
 * The shape the pre-registry editing engine exposed as its active session.
 *
 * Kept structurally identical so code that read `session.editorEl` or
 * `session.currentValue` still compiles. The live session now belongs to
 * {@link EditorManager}; this is a projection of it.
 *
 * @deprecated Use `EditSession` from `src/editing/session/edit-session.ts`.
 */
export interface EditSession {
  rowNode: RowNode;
  colDef: ColumnDef;
  originalValue: unknown;
  currentValue: unknown;
  editorEl: HTMLElement | null;
  cellEl: HTMLElement | null;
}

/**
 * Deprecated facade over the editing system.
 *
 * Every editable column now runs through {@link EditorManager}: a registry of
 * editors, a resolution chain, and a validation engine the grid owns rather than
 * each editor. This class survives only so existing integrations — code holding
 * `ctx.cellEditorEngine`, or importing `CellEditorEngine` from the package root
 * — keep compiling and behaving.
 *
 * Every method here forwards. Nothing in this file decides anything.
 *
 * ### Migrating
 * | Old                                          | New                                     |
 * | -------------------------------------------- | --------------------------------------- |
 * | `cellEditorEngine.startEditing(r, c, el)`     | `editorManager.startEdit({ rowNode, colDef, cellEl })` |
 * | `cellEditorEngine.stopEditing(false)`         | `editorManager.commit()`                |
 * | `cellEditorEngine.stopEditing(true)`          | `editorManager.cancel()`                |
 * | `cellEditorEngine.buildNativeEditor(...)`     | register an editor; see `EditorRegistry` |
 * | `colDef.validatorFn`                          | `colDef.validation.validate`            |
 *
 * @deprecated Use `GridContext.editorManager`. Scheduled for removal in the next
 * major version.
 */
export class CellEditorEngine {
  /** The real implementation. Assigned by `GridCore` immediately after construction. */
  private manager: EditorManager | null = null;

  /** Configuration held until {@link delegateTo} supplies a manager to forward it to. */
  private pendingConfig: Partial<EditingConfig> | null = null;

  /**
   * @param store - Retained only so the constructor signature is unchanged.
   * @param eventBus - Retained only so the constructor signature is unchanged.
   */
  constructor(
    private readonly store: GridStore,
    private readonly eventBus: EventBus,
  ) {
    // Referenced so the fields are not merely assigned; the facade itself reads
    // neither, because the manager owns both.
    void this.store;
    void this.eventBus;
  }

  /**
   * Binds this facade to the manager that does the work.
   *
   * Called once, by `GridCore`, during construction. Separate from the
   * constructor because the manager needs a `getApi` thunk that is not
   * satisfiable until later in the same constructor.
   */
  delegateTo(manager: EditorManager): void {
    this.manager = manager;
    if (this.pendingConfig) {
      manager.configure(this.pendingConfig);
      this.pendingConfig = null;
    }
  }

  /** @deprecated Use `editorManager.configure`. */
  configure(config: Partial<EditingConfig>): void {
    if (this.manager) this.manager.configure(config);
    else this.pendingConfig = { ...this.pendingConfig, ...config };
  }

  /** @deprecated Use `editorManager.getConfig`. */
  getConfig(): Readonly<EditingConfig> {
    const resolved = this.manager?.getConfig();
    if (!resolved) {
      return { mode: 'cell', singleClickEdit: false, stopEditingWhenCellsLoseFocus: true };
    }
    // The resolved form models "no row validator" as `null`; the public
    // `EditingConfig` uses `undefined`. Normalised here rather than widening the
    // resolved type, which the manager relies on being total.
    return { ...resolved, rowValidator: resolved.rowValidator ?? undefined };
  }

  /**
   * @deprecated Use `editorManager.startEdit`.
   *
   * Note the behavioural difference: this used to open a *session* and leave the
   * caller to build the editor DOM. It now builds and mounts the editor too,
   * because that is what the resolver exists to do.
   */
  startEditing(rowNode: RowNode, colDef: ColumnDef, cellEl: HTMLElement): boolean {
    return this.manager?.startEdit({ rowNode, colDef, cellEl, trigger: 'api' }) ?? false;
  }

  /** @deprecated Use `editorManager.updateValue`. */
  updateValue(value: unknown): void {
    this.manager?.updateValue(value);
  }

  /** @deprecated Use `editorManager.commit()` / `editorManager.cancel()`. */
  stopEditing(cancel = false): void {
    this.manager?.stopEditing(cancel);
  }

  /** @deprecated Use `editorManager.isEditing`. */
  isEditing(): boolean {
    return this.manager?.isEditing() ?? false;
  }

  /** @deprecated Use `editorManager.isCellEditing`. */
  isCellEditing(rowNodeId: string, colId: string): boolean {
    return this.manager?.isCellEditing(rowNodeId, colId) ?? false;
  }

  /**
   * @deprecated Use `editorManager.getActiveSession`, whose session type is
   * richer. This projects the new session onto the old shape.
   */
  getActiveSession(): EditSession | null {
    const session = this.manager?.getActiveSession();
    if (!session) return null;
    return {
      rowNode: session.rowNode,
      colDef: session.colDef,
      originalValue: session.originalValue,
      currentValue: session.currentValue,
      editorEl: session.mounted?.gui ?? null,
      cellEl: session.cellEl,
    };
  }

  /** @deprecated Use `editorManager.setTabHandler`. */
  setTabHandler(fn: (shiftKey: boolean) => void): void {
    this.manager?.setTabHandler(fn);
  }

  /** @deprecated Use `editorManager.setFormulaCommitHandler`. */
  setFormulaCommitHandler(
    fn: (rowNode: RowNode, colDef: ColumnDef, source: string) => boolean,
  ): void {
    this.manager?.setFormulaCommitHandler(fn);
  }

  /**
   * @deprecated Removed. Editors are resolved from a registry now, so there is
   * nothing to "build natively" — see `EditorRegistry` and `DEFAULT_EDITOR_BY_TYPE`.
   *
   * Kept as a no-op returning a detached element rather than deleted, so a
   * caller that still invokes it fails visibly (an empty editor) instead of
   * throwing inside the grid's click handler.
   */
  buildNativeEditor(_colDef: ColumnDef, _value: unknown, container: HTMLElement): HTMLElement {
    console.warn(
      '[PhotonGrid] CellEditorEngine.buildNativeEditor is no longer supported. ' +
        'Editors are resolved from the editor registry; see GridApi.registerEditor.',
    );
    const placeholder = document.createElement('span');
    container.appendChild(placeholder);
    return placeholder;
  }
}
