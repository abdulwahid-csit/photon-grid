import type { RowNode } from '../../types/row.types';
import type { ColumnDef } from '../../types/column.types';
import type { EditingConfig } from '../../types/grid.types';
import type { GridStore } from '../../core/grid-store';
import type { EventBus } from '../../event-bus/event-bus';
import { GridEventType } from '../../types/event.types';
import { parseValue, validateValue } from './value-parser';

export interface EditSession {
  rowNode: RowNode;
  colDef: ColumnDef;
  originalValue: unknown;
  currentValue: unknown;
  editorEl: HTMLElement | null;
  cellEl: HTMLElement | null;
}

export class CellEditorEngine {
  private activeSession: EditSession | null = null;
  private config: EditingConfig = {
    mode: 'cell',
    singleClickEdit: false,
    stopEditingWhenCellsLoseFocus: true,
  };
  /**
   * Optional callback invoked when Tab is pressed while a native editor is
   * active.  Receives `shiftKey` so the caller can navigate forwards or
   * backwards.  Registered by `wireEditing` in `GridCore`.
   */
  private tabHandler: ((shiftKey: boolean) => void) | null = null;

  /** Register a callback to be called when Tab is pressed inside a native editor. */
  setTabHandler(fn: (shiftKey: boolean) => void): void {
    this.tabHandler = fn;
  }

  constructor(
    private store: GridStore,
    private eventBus: EventBus,
  ) {}

  configure(config: Partial<EditingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  startEditing(rowNode: RowNode, colDef: ColumnDef, cellEl: HTMLElement): boolean {
    if (this.config.mode === 'none') return false;
    if (!colDef.editable || colDef.locked) return false;
    if (this.activeSession) this.stopEditing(true);

    const originalValue = rowNode.data[colDef.field];
    this.activeSession = {
      rowNode,
      colDef,
      originalValue,
      currentValue: originalValue,
      editorEl: null,
      cellEl,
    };

    this.store.set('editingCellId', `${rowNode.nodeId}__${colDef.colId}`);
    cellEl.classList.add('pg-cell--editing');

    this.eventBus.emit(GridEventType.CELL_EDIT_START, {
      row: rowNode,
      colDef,
      oldValue: originalValue,
      newValue: originalValue,
      rowIndex: rowNode.rowIndex,
    });

    this.eventBus.emit(GridEventType.ROW_EDIT_START, {
      row: rowNode,
      field: colDef.field,
      oldValue: originalValue,
      newValue: originalValue,
    });

    return true;
  }

  updateValue(value: unknown): void {
    if (!this.activeSession) return;
    this.activeSession.currentValue = value;
  }

  stopEditing(cancel = false): void {
    if (!this.activeSession) return;

    const { rowNode, colDef, originalValue, currentValue, cellEl } = this.activeSession;

    cellEl?.classList.remove('pg-cell--editing');
    this.store.set('editingCellId', null);

    if (!cancel) {
      const parsed = parseValue(currentValue, colDef);
      const error = validateValue(parsed, colDef);

      if (error) {
        this.eventBus.emit(GridEventType.CELL_EDIT_STOP, {
          row: rowNode,
          field: colDef.field,
          oldValue: originalValue,
          newValue: parsed,
          error,
        });
        this.activeSession = null;
        return;
      }

      if (parsed !== originalValue) {
        rowNode.data = { ...rowNode.data, [colDef.field]: parsed };
        this.eventBus.emit(GridEventType.CELL_VALUE_CHANGED, {
          row: rowNode,
          colDef,
          oldValue: originalValue,
          newValue: parsed,
          rowIndex: rowNode.rowIndex,
        });
        // Flash the edited cell with the same fill-flash animation so the user
        // gets clear visual confirmation that the new value was committed.
        if (cellEl) {
          setTimeout(() => {
            cellEl.classList.remove('pg-cell--fill-flash');
            void (cellEl as HTMLElement).offsetWidth; // force reflow to restart animation
            cellEl.classList.add('pg-cell--fill-flash');
            setTimeout(() => cellEl.classList.remove('pg-cell--fill-flash'), 700);
          }, 0);
        }
      }
    }

    this.eventBus.emit(GridEventType.CELL_EDIT_STOP, {
      row: rowNode,
      field: colDef.field,
      oldValue: originalValue,
      newValue: cancel ? originalValue : currentValue,
    });

    this.activeSession = null;
  }

  isEditing(): boolean {
    return this.activeSession !== null;
  }

  getActiveSession(): EditSession | null {
    return this.activeSession;
  }

  isCellEditing(rowNodeId: string, colId: string): boolean {
    const editId = this.store.get('editingCellId');
    return editId === `${rowNodeId}__${colId}`;
  }

  /**
   * Builds and mounts the appropriate native editor widget into `container` based
   * on `colDef.type`.  Returns the root editor element.
   *
   * Editor types:
   * - `boolean`            → styled checkbox
   * - `dropdown` / `object`→ single-select `<select>` from `dropdownOptions`
   * - `array`              → custom multi-select panel with checkboxes
   * - `number` / `currency`/ `percentage` → number `<input>`
   * - `date`               → date `<input>`
   * - `time`               → time `<input>`
   * - default              → text `<input>`
   */
  buildNativeEditor(colDef: ColumnDef, value: unknown, container: HTMLElement): HTMLElement {
    // array gets its own full return path (custom focus/blur handling)
    if (colDef.type === 'array') {
      return this.buildMultiSelectEditor(colDef, value, container);
    }

    let input: HTMLElement;

    switch (colDef.type) {
      case 'boolean': {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!value;
        checkbox.className = 'pg-editor pg-editor--checkbox';
        checkbox.addEventListener('change', () => this.updateValue(checkbox.checked));
        input = checkbox;
        break;
      }

      case 'dropdown':
      case 'object': {
        const select = document.createElement('select');
        select.className = 'pg-editor pg-editor--select';
        const currentKey = this.resolveObjectKey(value, colDef);
        for (const opt of colDef.dropdownOptions ?? []) {
          const option = document.createElement('option');
          option.value = String(opt.value);
          option.textContent = opt.label;
          option.selected = String(opt.value) === String(currentKey ?? '');
          select.appendChild(option);
        }
        select.addEventListener('change', () => {
          if (colDef.type === 'object') {
            const picked = colDef.dropdownOptions?.find((o) => String(o.value) === select.value);
            this.updateValue(picked ?? select.value);
          } else {
            this.updateValue(select.value);
          }
        });
        input = select;
        break;
      }

      case 'number':
      case 'currency':
      case 'percentage': {
        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.value = String(value ?? '');
        numInput.className = 'pg-editor pg-editor--number';
        if (colDef.min !== undefined && colDef.min !== null) numInput.min = String(colDef.min);
        if (colDef.max !== undefined && colDef.max !== null) numInput.max = String(colDef.max);
        numInput.addEventListener('input', () => this.updateValue(numInput.value));
        input = numInput;
        break;
      }

      case 'date': {
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.value = value ? new Date(value as string).toISOString().split('T')[0] : '';
        dateInput.className = 'pg-editor pg-editor--date';
        dateInput.addEventListener('change', () => this.updateValue(dateInput.value));
        input = dateInput;
        break;
      }

      case 'time': {
        const timeInput = document.createElement('input');
        timeInput.type = 'time';
        timeInput.value = String(value ?? '');
        timeInput.className = 'pg-editor pg-editor--time';
        timeInput.addEventListener('change', () => this.updateValue(timeInput.value));
        input = timeInput;
        break;
      }

      default: {
        const textInput = document.createElement('input');
        textInput.type = colDef.type === 'email' ? 'email' : 'text';
        textInput.value = String(value ?? '');
        textInput.className = 'pg-editor pg-editor--text';
        textInput.addEventListener('input', () => this.updateValue(textInput.value));
        input = textInput;
      }
    }

    if (this.config.stopEditingWhenCellsLoseFocus) {
      input.addEventListener('blur', () => this.stopEditing(false));
    }
    input.addEventListener('keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      ke.stopPropagation();
      if (ke.key === 'Enter') { ke.preventDefault(); this.stopEditing(false); }
      else if (ke.key === 'Escape') { ke.preventDefault(); this.stopEditing(true); }
      else if (ke.key === 'Tab') {
        // Commit edit, suppress default focus-shift, then delegate navigation
        ke.preventDefault();
        this.stopEditing(false);
        this.tabHandler?.(ke.shiftKey);
      }
    });

    container.appendChild(input);
    if (this.activeSession) this.activeSession.editorEl = input;
    setTimeout(() => (input as HTMLInputElement).focus?.(), 0);
    return input;
  }

  /**
   * Builds a custom multi-select dropdown panel for `array` column type.
   * The stored value is always `string[]` of selected option values.
   */
  private buildMultiSelectEditor(colDef: ColumnDef, value: unknown, container: HTMLElement): HTMLElement {
    const currentValues = new Set<string>(Array.isArray(value) ? value.map(String) : []);
    const options = colDef.dropdownOptions ?? [];

    const wrapper = document.createElement('div');
    wrapper.className = 'pg-editor pg-editor--multiselect';
    wrapper.setAttribute('tabindex', '-1');

    const trigger = document.createElement('div');
    trigger.className = 'pg-editor__ms-trigger';

    const triggerText = document.createElement('span');
    triggerText.className = 'pg-editor__ms-text';

    const triggerArrow = document.createElement('span');
    triggerArrow.className = 'pg-editor__ms-arrow';

    trigger.appendChild(triggerText);
    trigger.appendChild(triggerArrow);

    const panel = document.createElement('div');
    panel.className = 'pg-editor__ms-panel';

    const refreshTriggerText = () => {
      const labels = options
        .filter((o) => currentValues.has(String(o.value)))
        .map((o) => o.label);
      triggerText.textContent = labels.length > 0 ? labels.join(', ') : '—';
    };

    for (const opt of options) {
      const label = document.createElement('label');
      label.className = 'pg-editor__ms-option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'pg-editor__ms-check';
      checkbox.value = String(opt.value);
      checkbox.checked = currentValues.has(String(opt.value));

      checkbox.addEventListener('change', () => {
        if (checkbox.checked) currentValues.add(checkbox.value);
        else currentValues.delete(checkbox.value);
        refreshTriggerText();
        this.updateValue([...currentValues]);
      });

      const labelText = document.createElement('span');
      labelText.className = 'pg-editor__ms-label';
      labelText.textContent = opt.label;

      label.appendChild(checkbox);
      label.appendChild(labelText);
      panel.appendChild(label);
    }

    refreshTriggerText();

    trigger.addEventListener('mousedown', (e) => {
      e.preventDefault(); // keep focus on wrapper
      panel.classList.toggle('pg-editor__ms-panel--open');
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(panel);
    container.appendChild(wrapper);

    // Deferred open + focus
    setTimeout(() => {
      wrapper.focus();
      panel.classList.add('pg-editor__ms-panel--open');
    }, 0);

    // Close on focus leaving the composite widget
    let blurTimer: ReturnType<typeof setTimeout> | null = null;
    wrapper.addEventListener('focusout', () => {
      blurTimer = setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) {
          this.stopEditing(false);
        }
      }, 150);
    });
    wrapper.addEventListener('focusin', () => {
      if (blurTimer !== null) { clearTimeout(blurTimer); blurTimer = null; }
    });

    wrapper.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); this.stopEditing(false); }
      else if (e.key === 'Escape') { e.preventDefault(); this.stopEditing(true); }
      else if (e.key === 'Tab') {
        e.preventDefault();
        this.stopEditing(false);
        this.tabHandler?.((e as KeyboardEvent).shiftKey);
      }
    });

    if (this.activeSession) this.activeSession.editorEl = wrapper;
    return wrapper;
  }

  /**
   * Resolves the key used to match a cell value against `dropdownOptions`
   * for `object` type columns.  Supports primitive values and plain objects.
   */
  private resolveObjectKey(value: unknown, colDef: ColumnDef): unknown {
    if (typeof value === 'object' && value !== null) {
      const key = colDef.objectValueKey ?? 'value';
      return (value as Record<string, unknown>)[key];
    }
    return value;
  }

  /** Returns the active `EditingConfig` (read-only). */
  getConfig(): Readonly<EditingConfig> {
    return this.config;
  }
}
