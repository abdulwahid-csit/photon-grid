/**
 * Backward compatibility for the editing surfaces that predate this module.
 *
 * The new architecture is the default for every editable column, which means it
 * has to keep two older mechanisms working exactly as they did:
 *
 * 1. **`ColumnDef.renderer.editor`** — a bare `(params) => HTMLElement` slot.
 *    It took priority over every built-in editor, so its replacement strategy
 *    sits immediately after the editability check.
 * 2. **The `dropdown` / `object` dropdown** — `CustomDropdownEditor`, a
 *    virtualised, option-renderer-aware list that is materially nicer than a
 *    native `<select>`. Rewriting those columns onto the plain `select` editor
 *    would be a visible downgrade, so it is wrapped rather than replaced.
 *
 * Both are adapters, not forks: each presents an {@link ICellEditor} to the
 * resolver like everything else, so the pipeline has exactly one code path and
 * these can be deleted the day the old surfaces are.
 *
 * @packageDocumentation
 */

import type { ColumnDef, ColumnDropdownOption } from '../../types/column.types';
import type { EditorRendererParams } from '../../types/renderer.types';
import { resolveColumnRenderer } from '../../renderer/renderer-resolver';
import { CustomDropdownEditor } from '../../engines/editing/custom-dropdown-editor';
import type { CellEditorParams, ICellEditor } from '../types/cell-editor.types';
import type {
  EditorResolution,
  EditorResolutionRequest,
  EditorResolutionStrategy,
} from '../registry/default-editor-resolver';

/**
 * Presents a legacy `renderer.editor` function as an {@link ICellEditor}.
 *
 * The old contract had no `getValue`: the slot reported values through
 * `onValueChange` and the engine remembered the last one. That is reproduced
 * here — {@link getValue} returns whatever was last reported — so a column using
 * the slot behaves identically while still flowing through validation, the
 * popup service and the keyboard manager like any other editor.
 */
export class LegacySlotEditor implements ICellEditor {
  private gui: HTMLElement | null = null;
  private value: unknown;

  /**
   * @param render - The function from `ColumnDef.renderer.editor`.
   */
  constructor(private readonly render: (params: EditorRendererParams) => HTMLElement) {}

  init(params: CellEditorParams): void {
    this.value = params.value;
    const legacyParams: EditorRendererParams = {
      value: params.value,
      row: params.data as Record<string, unknown>,
      colDef: params.colDef,
      rowIndex: params.rowIndex,
      onValueChange: (v: unknown) => {
        this.value = v;
        params.onValueChange(v);
      },
      onEditStop: () => params.commit(),
    };
    this.gui = this.render(legacyParams);
  }

  getGui(): HTMLElement {
    // `init` always assigns it; the fallback keeps the return type honest
    // rather than asserting non-null on something a third-party function built.
    return this.gui ?? document.createElement('div');
  }

  getValue(): unknown {
    return this.value;
  }
}

/**
 * Presents {@link CustomDropdownEditor} as an {@link ICellEditor}.
 *
 * That class owns its own portal, virtual scrolling, keyboard handling and
 * dismissal, so this wrapper is deliberately thin: it reports `isPopup(): false`
 * because the dropdown portals its *panel* itself while its trigger stays in the
 * cell, and it hands the grid a hidden host element to satisfy the `getGui`
 * contract.
 */
export class LegacyDropdownEditor implements ICellEditor {
  private dropdown: CustomDropdownEditor | null = null;
  private host: HTMLElement | null = null;
  private value: unknown;
  private tabBackwards = false;

  init(params: CellEditorParams): void {
    const { colDef } = params;
    this.value = params.value;

    const options: ColumnDropdownOption[] =
      colDef.dropdownOptions ??
      colDef.enumOptions?.map((v) => ({ value: v, label: v })) ??
      [];

    const host = document.createElement('div');
    host.className = 'pg-editor pg-editor--dropdown-host';
    this.host = host;

    const renderOption = resolveColumnRenderer(colDef, 'option');

    this.dropdown = new CustomDropdownEditor(
      host,
      params.cellElement,
      options,
      params.value,
      {
        onSelect: (opt) => {
          // An `object` column stores the whole option; a `dropdown` column
          // stores only its value. Preserved verbatim from `wireEditing`.
          const next = colDef.type === 'object' ? opt : opt.value;
          this.value = next;
          params.onValueChange(next);
        },
        onStop: (commit) => (commit ? params.commit() : params.cancel()),
        onTab: (shiftKey: boolean) => {
          this.tabBackwards = shiftKey;
          params.commitAndMove(shiftKey);
        },
        ...(renderOption
          ? {
              renderOption: (
                option: ColumnDropdownOption,
                index: number,
                selected: boolean,
                highlighted: boolean,
              ) => renderOption({ option, index, selected, highlighted, colDef, api: params.api as never }),
            }
          : {}),
      },
    );
  }

  getGui(): HTMLElement {
    return this.host ?? document.createElement('div');
  }

  getValue(): unknown {
    return this.value;
  }

  /** The dropdown focuses its own trigger; nothing extra to do. */
  focus(): void {
    this.host?.focus();
  }

  destroy(): void {
    this.dropdown?.destroy();
    this.dropdown = null;
    this.host = null;
    // Read so the field is not merely written — the flag exists for parity with
    // the old `onTab` path and is intentionally inert here.
    void this.tabBackwards;
  }
}

/**
 * Resolution strategy for a column carrying a legacy `renderer.editor` slot.
 *
 * Inserted directly after the editability check so it keeps the priority it has
 * always had: the slot wins over every built-in editor, and over `cellEditor`,
 * because a column that declares both was written against the old behaviour.
 */
export const legacySlotStrategy: EditorResolutionStrategy = {
  name: 'legacy-renderer-slot',
  resolve(request: EditorResolutionRequest): EditorResolution | null {
    const slot = resolveColumnRenderer(request.colDef, 'editor');
    if (!slot) return null;
    return {
      kind: 'editor',
      strategy: 'legacy-renderer-slot',
      create: () => new LegacySlotEditor(slot),
    };
  },
};

/**
 * Resolution strategy keeping `dropdown` / `object` columns on the rich
 * dropdown.
 *
 * Sits immediately before the column-type default, so an explicit
 * `cellEditor: 'select'` still opts a column into the native select — the
 * override the new API is supposed to offer — while a column that says nothing
 * keeps the UX it has today.
 */
export const legacyDropdownStrategy: EditorResolutionStrategy = {
  name: 'legacy-dropdown',
  resolve(request: EditorResolutionRequest): EditorResolution | null {
    const type: ColumnDef['type'] = request.colDef.type;
    if (type !== 'dropdown' && type !== 'object') return null;
    return {
      kind: 'editor',
      strategy: 'legacy-dropdown',
      create: () => new LegacyDropdownEditor(),
    };
  },
};
