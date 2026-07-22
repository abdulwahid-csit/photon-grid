import type { ColumnDef } from '../../types/column.types';
import type { ColumnFilter, FilterCondition, FilterLogic, FilterOperator, FilterSetOption } from '../../types/filter.types';
import type { FilterRendererParams } from '../../types/renderer.types';
import { resolveColumnRenderer } from '../../renderer/renderer-resolver';

export type { FilterSetOption } from '../../types/filter.types';

// ─── Public interfaces ────────────────────────────────────────────────────────

/**
 * Full configuration object passed to {@link FilterPanel} on construction.
 * The caller is responsible for supplying the unique-value list and wiring the
 * change and close callbacks.
 */
export interface FilterPanelConfig {
  /** Column definition for which the filter is being applied. */
  colDef: ColumnDef;
  /**
   * Element the panel anchors to (the filter-icon button in the column header).
   * Used for positioning the panel directly below the clicked button.
   */
  anchorEl: HTMLElement;
  /**
   * Grid wrapper element (`pg-grid`).  The panel is appended here so it clips
   * to the grid boundary and participates in its z-index stacking context.
   */
  containerEl: HTMLElement;
  /** Currently-applied filter, or `null` when no filter is active on this column. */
  currentFilter: ColumnFilter | null;
  /**
   * Pre-extracted unique value/label pairs for set-type (dropdown / array)
   * columns.  Passed in rather than derived here so the caller can cache or
   * sort them once instead of on every panel open.
   */
  uniqueOptions: FilterSetOption[];
  /** Called immediately when the user changes any filter state. */
  onFilterChange: (filter: ColumnFilter | null) => void;
  /** Called when the panel is closed by any means (click-outside, Escape, Clear). */
  onClose: () => void;
}

// ─── Internal types ───────────────────────────────────────────────────────────

/** One entry in an operator `<select>` drop-down. */
interface ConditionOption {
  label: string;
  operator: FilterOperator;
}

/** Logic mode visible in the AND / OR / None toggle row. */
type LogicMode = 'and' | 'or' | 'none';

// ─── Operator tables (by column type) ────────────────────────────────────────

const STRING_OPERATORS: ConditionOption[] = [
  { label: 'Contains',           operator: 'contains'          },
  { label: 'Does not contain',   operator: 'notContains'       },
  { label: 'Equals',             operator: 'equals'            },
  { label: 'Does not equal',     operator: 'notEquals'         },
  { label: 'Starts with',        operator: 'startsWith'        },
  { label: 'Ends with',          operator: 'endsWith'          },
  { label: 'Blank',              operator: 'blank'             },
  { label: 'Not blank',          operator: 'notBlank'          },
];

const NUMBER_OPERATORS: ConditionOption[] = [
  { label: 'Equals',                   operator: 'equals'            },
  { label: 'Does not equal',           operator: 'notEquals'         },
  { label: 'Greater than',             operator: 'greaterThan'       },
  { label: 'Greater than or equal to', operator: 'greaterThanOrEqual'},
  { label: 'Less than',                operator: 'lessThan'          },
  { label: 'Less than or equal to',    operator: 'lessThanOrEqual'   },
  { label: 'Between',                  operator: 'inRange'           },
  { label: 'Blank',                    operator: 'blank'             },
  { label: 'Not blank',                operator: 'notBlank'          },
];

const DATE_OPERATORS: ConditionOption[] = [
  { label: 'Equals',         operator: 'equals'   },
  { label: 'Does not equal', operator: 'notEquals'},
  { label: 'Before',         operator: 'before'   },
  { label: 'After',          operator: 'after'    },
  { label: 'Between',        operator: 'inRange'  },
  { label: 'Blank',          operator: 'blank'    },
  { label: 'Not blank',      operator: 'notBlank' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOperators(colType: string): ConditionOption[] {
  switch (colType) {
    case 'number': case 'currency': case 'percentage': return NUMBER_OPERATORS;
    case 'date':   case 'time':                        return DATE_OPERATORS;
    default:                                           return STRING_OPERATORS;
  }
}

function getInputType(colType: string): string {
  switch (colType) {
    case 'number': case 'currency': case 'percentage': return 'number';
    case 'date':   return 'date';
    case 'time':   return 'time';
    default:       return 'text';
  }
}

/**
 * Set-type columns render a checkbox value list instead of an operator/condition
 * form. `object` and `array` cell values are enumerated into discrete options,
 * and `dropdown` columns use their predefined option list.
 */
function isSetType(colType: string): boolean {
  return colType === 'dropdown' || colType === 'array' || colType === 'object';
}

/** Operators that require no value input (blank / notBlank). */
function isNoValueOperator(op: FilterOperator): boolean {
  return op === 'blank' || op === 'notBlank';
}

/** Operators that require two value inputs (inRange / Between). */
function isRangeOperator(op: FilterOperator): boolean {
  return op === 'inRange';
}

// ─── Virtual-scroll constants ─────────────────────────────────────────────────

/** Fixed item height in px — must match `.pg-filter-set__item` in CSS. */
const VS_ITEM_HEIGHT = 28;
/** Maximum number of items visible without scrolling. */
const VS_MAX_VISIBLE = 9;
/** Number of extra items rendered above/below the viewport. */
const VS_BUFFER = 3;
/** Debounce delay (ms) for condition-filter inputs. */
const DEBOUNCE_MS = 200;

// ─── FilterPanel ──────────────────────────────────────────────────────────────

/**
 * Floating filter panel rendered below a column header cell.
 *
 * The panel is appended to the grid's wrapper element (`pg-grid`) so that it
 * clips correctly and participates in the grid's z-index context.
 *
 * ### Lifecycle
 * ```
 * const panel = new FilterPanel(config);
 * panel.open();       // renders + positions + attaches global listeners
 * // ... user interacts, onFilterChange is called in real-time ...
 * panel.destroy();    // unmounts and calls onClose
 * ```
 *
 * The caller should keep track of the open panel instance and call `destroy()`
 * before opening a new panel for another column.
 */
export class FilterPanel {
  private panelEl: HTMLElement | null = null;

  // ── Condition filter mutable state ──────────────────────────────────────
  private op1: FilterOperator;
  private val1 = '';
  private val1To = '';
  private logicMode: LogicMode = 'none';
  private op2: FilterOperator;
  private val2 = '';
  private val2To = '';

  // ── Set filter mutable state ─────────────────────────────────────────────
  private allOptions: FilterSetOption[];
  private displayOptions: FilterSetOption[];
  private selectedValues: Set<string>;
  private setSearchTerm = '';

  // ── DOM references (populated during build) ───────────────────────────────
  private vsContainerEl: HTMLElement | null = null;
  private vsInnerEl: HTMLElement | null = null;
  private logicRowEl: HTMLElement | null = null;
  private cond2RowEl: HTMLElement | null = null;
  private selectAllCbEl: HTMLInputElement | null = null;

  // ── Lifecycle helpers ─────────────────────────────────────────────────────
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly boundClickOutside: (e: MouseEvent) => void;
  private readonly boundEscapeKey: (e: KeyboardEvent) => void;

  constructor(private readonly config: FilterPanelConfig) {
    const type = config.colDef.type ?? 'string';
    const ops = getOperators(type);

    this.op1 = ops[0].operator;
    this.op2 = ops[0].operator;
    this.allOptions = config.uniqueOptions;
    this.displayOptions = [...this.allOptions];

    const cf = config.currentFilter;
    if (cf) {
      if (isSetType(type)) {
        this.selectedValues = new Set((cf.selectedIds ?? []).map(String));
      } else {
        this.selectedValues = new Set();
        if (cf.conditions.length >= 1) {
          this.op1 = cf.conditions[0].operator;
          this.val1 = cf.conditions[0].value != null ? String(cf.conditions[0].value) : '';
          this.val1To = cf.conditions[0].valueTo != null ? String(cf.conditions[0].valueTo) : '';
        }
        const c2Existing = cf.conditions.length >= 2
          ? (cf.conditions as [FilterCondition, FilterCondition])[1]
          : null;
        if (c2Existing) {
          this.logicMode = (cf.logic ?? 'and') as LogicMode;
          this.op2 = c2Existing.operator;
          this.val2 = c2Existing.value != null ? String(c2Existing.value) : '';
          this.val2To = c2Existing.valueTo != null ? String(c2Existing.valueTo) : '';
        }
      }
    } else {
      // Set filter: all options selected by default (= no filter)
      this.selectedValues = new Set(this.allOptions.map((o) => o.value));
    }

    this.boundClickOutside = this.handleClickOutside.bind(this);
    this.boundEscapeKey = this.handleEscapeKey.bind(this);
  }

  /**
   * Renders the panel DOM, appends it to the container, positions it below the
   * anchor element, and attaches global click-outside / Escape listeners.
   */
  open(): void {
    const type = this.config.colDef.type ?? 'string';

    const panel = document.createElement('div');
    panel.className = 'pg-filter-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', `Filter: ${this.config.colDef.header}`);

    const customFilterFn = resolveColumnRenderer(this.config.colDef, 'filter');
    const isCustom = !!customFilterFn;

    if (customFilterFn) {
      const params: FilterRendererParams = {
        colDef: this.config.colDef,
        anchorEl: this.config.anchorEl,
        currentFilter: this.config.currentFilter,
        uniqueOptions: this.config.uniqueOptions,
        onFilterChange: this.config.onFilterChange,
        onClose: () => this.destroy(),
        api: null,
      };
      panel.appendChild(customFilterFn(params));
    } else if (isSetType(type)) {
      panel.appendChild(this.buildSetFilter());
    } else {
      panel.appendChild(this.buildConditionFilter(type));
    }

    // A custom filter renderer owns its own apply/clear affordances via the
    // callbacks it already received — the default footer only applies to
    // Photon Grid's own condition/set filter UI.
    if (!isCustom) {
      panel.appendChild(this.buildFooter());
    }

    this.panelEl = panel;
    this.config.containerEl.appendChild(panel);

    this.position();

    // After insertion, render the virtual list (needs client dimensions)
    if (!isCustom && isSetType(type) && this.vsContainerEl) {
      this.renderVirtualList();
    }

    // Defer global listeners so the click that opened the panel is not caught
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', this.boundClickOutside, true);
      document.addEventListener('keydown', this.boundEscapeKey, true);
    });
  }

  /** Removes the panel from the DOM and fires the `onClose` callback. */
  destroy(): void {
    this.clearDebounce();
    document.removeEventListener('mousedown', this.boundClickOutside, true);
    document.removeEventListener('keydown', this.boundEscapeKey, true);
    this.panelEl?.remove();
    this.panelEl = null;
    this.config.onClose();
  }

  // ─── Condition filter ─────────────────────────────────────────────────────

  private buildConditionFilter(colType: string): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'pg-filter-cond-wrap';

    // Condition 1
    const cond1 = this.buildConditionRow(colType, 1);
    wrap.appendChild(cond1);

    // Logic toggle row (AND / OR / None) — shown after first value is entered
    const logicRow = document.createElement('div');
    logicRow.className = 'pg-filter-logic';
    if (!this.hasConditionValue(1)) logicRow.classList.add('pg-filter-logic--hidden');

    for (const mode of ['and', 'or', 'none'] as const) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pg-filter-logic__btn';
      btn.textContent = mode === 'none' ? 'None' : mode.toUpperCase();
      if (this.logicMode === mode) btn.classList.add('pg-filter-logic__btn--active');
      btn.addEventListener('click', () => {
        this.logicMode = mode;
        // Update active state
        logicRow.querySelectorAll<HTMLElement>('.pg-filter-logic__btn').forEach((b) => {
          b.classList.toggle('pg-filter-logic__btn--active', b.textContent === (mode === 'none' ? 'None' : mode.toUpperCase()));
        });
        // Show/hide condition 2
        if (this.cond2RowEl) {
          this.cond2RowEl.classList.toggle('pg-filter-cond__row--hidden', mode === 'none');
        }
        this.scheduleEmit();
      });
      logicRow.appendChild(btn);
    }
    this.logicRowEl = logicRow;
    wrap.appendChild(logicRow);

    // Condition 2
    const cond2 = this.buildConditionRow(colType, 2);
    if (this.logicMode === 'none') cond2.classList.add('pg-filter-cond__row--hidden');
    this.cond2RowEl = cond2;
    wrap.appendChild(cond2);

    return wrap;
  }

  private buildConditionRow(colType: string, index: 1 | 2): HTMLElement {
    const ops = getOperators(colType);
    const inputType = getInputType(colType);
    const currentOp = index === 1 ? this.op1 : this.op2;
    const currentVal = index === 1 ? this.val1 : this.val2;
    const currentValTo = index === 1 ? this.val1To : this.val2To;

    const row = document.createElement('div');
    row.className = 'pg-filter-cond__row';

    // Operator select
    const select = document.createElement('select');
    select.className = 'pg-filter-cond__select';
    select.setAttribute('aria-label', 'Filter operator');
    for (const op of ops) {
      const opt = document.createElement('option');
      opt.value = op.operator;
      opt.textContent = op.label;
      if (op.operator === currentOp) opt.selected = true;
      select.appendChild(opt);
    }

    // Value inputs
    const valWrap = document.createElement('div');
    valWrap.className = 'pg-filter-cond__inputs';

    const input1 = document.createElement('input');
    input1.type = inputType;
    input1.className = 'pg-filter-cond__input';
    input1.placeholder = 'Filter value…';
    input1.value = currentVal;
    input1.setAttribute('aria-label', 'Filter value');

    const rangeSep = document.createElement('span');
    rangeSep.className = 'pg-filter-cond__range-sep';
    rangeSep.textContent = 'and';

    const input2 = document.createElement('input');
    input2.type = inputType;
    input2.className = 'pg-filter-cond__input';
    input2.placeholder = 'To value…';
    input2.value = currentValTo;
    input2.setAttribute('aria-label', 'Filter to value');

    // Store DOM refs for condition 1
    if (index === 1) {
      this.val1 = currentVal;
      this.val1To = currentValTo;
    } else {
      this.val2 = currentVal;
      this.val2To = currentValTo;
    }

    // Apply initial visibility
    const isRange = isRangeOperator(currentOp);
    const isNoVal = isNoValueOperator(currentOp);
    valWrap.classList.toggle('pg-filter-cond__inputs--hidden', isNoVal);
    valWrap.classList.toggle('pg-filter-cond__inputs--range', isRange);
    rangeSep.classList.toggle('pg-filter-cond__range-sep--hidden', !isRange);
    input2.classList.toggle('pg-filter-cond__input--hidden', !isRange);

    valWrap.appendChild(input1);
    valWrap.appendChild(rangeSep);
    valWrap.appendChild(input2);

    // Operator change handler
    select.addEventListener('change', () => {
      const op = select.value as FilterOperator;
      if (index === 1) this.op1 = op; else this.op2 = op;
      const noVal = isNoValueOperator(op);
      const range = isRangeOperator(op);
      valWrap.classList.toggle('pg-filter-cond__inputs--hidden', noVal);
      valWrap.classList.toggle('pg-filter-cond__inputs--range', range);
      rangeSep.classList.toggle('pg-filter-cond__range-sep--hidden', !range);
      input2.classList.toggle('pg-filter-cond__input--hidden', !range);
      this.scheduleEmit();
    });

    // Value change handlers
    input1.addEventListener('input', () => {
      const v = input1.value;
      if (index === 1) {
        this.val1 = v;
        // Show/hide logic row after first value
        if (this.logicRowEl) {
          this.logicRowEl.classList.toggle('pg-filter-logic--hidden', !v && !isNoValueOperator(this.op1));
        }
      } else {
        this.val2 = v;
      }
      this.scheduleEmit();
    });

    input2.addEventListener('input', () => {
      if (index === 1) this.val1To = input2.value;
      else this.val2To = input2.value;
      this.scheduleEmit();
    });

    row.appendChild(select);
    row.appendChild(valWrap);
    return row;
  }

  private hasConditionValue(index: 1 | 2): boolean {
    const op = index === 1 ? this.op1 : this.op2;
    const val = index === 1 ? this.val1 : this.val2;
    return isNoValueOperator(op) || val.trim() !== '';
  }

  // ─── Set filter ───────────────────────────────────────────────────────────

  private buildSetFilter(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'pg-filter-set';

    // ── Search input ───────────────────────────────────────────────────────
    const searchWrap = document.createElement('div');
    searchWrap.className = 'pg-filter-set__search';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'pg-filter-set__search-input';
    searchInput.placeholder = 'Search values…';
    searchInput.setAttribute('aria-label', 'Search filter values');
    searchInput.value = this.setSearchTerm;
    searchInput.addEventListener('input', () => {
      this.setSearchTerm = searchInput.value;
      this.applySetSearch();
    });
    searchWrap.appendChild(searchInput);
    wrap.appendChild(searchWrap);

    wrap.appendChild(this.buildDivider());

    // ── Select All ─────────────────────────────────────────────────────────
    const selectAllLabel = document.createElement('label');
    selectAllLabel.className = 'pg-filter-set__item pg-filter-set__item--select-all';

    const selectAllCb = document.createElement('input');
    selectAllCb.type = 'checkbox';
    selectAllCb.className = 'pg-filter-set__checkbox';
    selectAllCb.setAttribute('aria-label', 'Select all');
    this.updateSelectAllState(selectAllCb);

    selectAllCb.addEventListener('change', () => {
      if (selectAllCb.checked) {
        // Select all currently visible + all hidden (full selection = no filter)
        this.selectedValues = new Set(this.allOptions.map((o) => o.value));
      } else {
        this.selectedValues = new Set();
      }
      this.renderVirtualList();
      this.updateSelectAllState(selectAllCb);
      this.emitFilter();
    });

    this.selectAllCbEl = selectAllCb;

    const selectAllText = document.createElement('span');
    selectAllText.className = 'pg-filter-set__item-label';
    selectAllText.textContent = '(Select All)';

    selectAllLabel.appendChild(selectAllCb);
    selectAllLabel.appendChild(selectAllText);
    wrap.appendChild(selectAllLabel);

    wrap.appendChild(this.buildDivider());

    // ── Virtual scroll list ────────────────────────────────────────────────
    const visibleCount = Math.min(this.allOptions.length, VS_MAX_VISIBLE);
    const containerH = visibleCount * VS_ITEM_HEIGHT;

    const vsContainer = document.createElement('div');
    vsContainer.className = 'pg-filter-set__list';
    vsContainer.style.height = `${containerH}px`;

    const vsInner = document.createElement('div');
    vsInner.className = 'pg-filter-set__list-inner';
    vsInner.style.height = `${this.displayOptions.length * VS_ITEM_HEIGHT}px`;

    vsContainer.appendChild(vsInner);
    vsContainer.addEventListener('scroll', () => this.renderVirtualList(), { passive: true });

    this.vsContainerEl = vsContainer;
    this.vsInnerEl = vsInner;

    wrap.appendChild(vsContainer);
    return wrap;
  }

  private buildDivider(): HTMLElement {
    const d = document.createElement('div');
    d.className = 'pg-filter-set__divider';
    return d;
  }

  private applySetSearch(): void {
    const term = this.setSearchTerm.toLowerCase().trim();
    this.displayOptions = term
      ? this.allOptions.filter((o) => o.label.toLowerCase().includes(term))
      : [...this.allOptions];

    if (this.vsInnerEl) {
      this.vsInnerEl.style.height = `${this.displayOptions.length * VS_ITEM_HEIGHT}px`;
    }
    if (this.vsContainerEl) {
      this.vsContainerEl.scrollTop = 0;
    }
    this.renderVirtualList();
    this.updateSelectAllState(this.selectAllCbEl);
  }

  private renderVirtualList(): void {
    if (!this.vsContainerEl || !this.vsInnerEl) return;

    const scrollTop = this.vsContainerEl.scrollTop;
    const containerH = this.vsContainerEl.clientHeight || VS_MAX_VISIBLE * VS_ITEM_HEIGHT;

    const firstIdx = Math.max(0, Math.floor(scrollTop / VS_ITEM_HEIGHT) - VS_BUFFER);
    const lastIdx = Math.min(
      this.displayOptions.length,
      Math.ceil((scrollTop + containerH) / VS_ITEM_HEIGHT) + VS_BUFFER,
    );

    this.vsInnerEl.innerHTML = '';

    for (let i = firstIdx; i < lastIdx; i++) {
      const opt = this.displayOptions[i];
      const item = this.buildSetItem(opt, i);
      this.vsInnerEl.appendChild(item);
    }
  }

  private buildSetItem(opt: FilterSetOption, index: number): HTMLElement {
    const label = document.createElement('label');
    label.className = 'pg-filter-set__item';
    label.style.top = `${index * VS_ITEM_HEIGHT}px`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'pg-filter-set__checkbox';
    cb.checked = this.selectedValues.has(opt.value);
    cb.addEventListener('change', () => {
      if (cb.checked) {
        this.selectedValues.add(opt.value);
      } else {
        this.selectedValues.delete(opt.value);
      }
      this.updateSelectAllState(this.selectAllCbEl);
      this.emitFilter();
    });

    const text = document.createElement('span');
    text.className = 'pg-filter-set__item-label';

    const optionFn = resolveColumnRenderer(this.config.colDef, 'option');
    if (optionFn) {
      const rendered = optionFn({
        option: { value: opt.value, label: opt.label },
        index,
        selected: cb.checked,
        highlighted: false,
        colDef: this.config.colDef,
        api: null,
      });
      if (typeof rendered === 'string') text.innerHTML = rendered;
      else text.appendChild(rendered);
    } else {
      text.textContent = opt.label || '(Blank)';
      if (!opt.label) text.classList.add('pg-filter-set__item-label--blank');
    }

    label.appendChild(cb);
    label.appendChild(text);
    return label;
  }

  private updateSelectAllState(cb: HTMLInputElement | null): void {
    if (!cb) return;
    const total = this.displayOptions.length || this.allOptions.length;
    const selectedCount = this.searchTerm
      ? this.displayOptions.filter((o) => this.selectedValues.has(o.value)).length
      : this.selectedValues.size;

    cb.checked = selectedCount >= total;
    cb.indeterminate = selectedCount > 0 && selectedCount < total;
  }

  private get searchTerm(): string { return this.setSearchTerm; }

  // ─── Footer ───────────────────────────────────────────────────────────────

  private buildFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'pg-filter-panel__footer';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'pg-filter-panel__clear-btn';
    clearBtn.textContent = 'Clear Filter';
    clearBtn.addEventListener('click', () => {
      this.config.onFilterChange(null);
      this.destroy();
    });

    footer.appendChild(clearBtn);
    return footer;
  }

  // ─── Filter building ──────────────────────────────────────────────────────

  private buildColumnFilter(): ColumnFilter | null {
    const colDef = this.config.colDef;
    const type = colDef.type ?? 'string';

    if (isSetType(type)) {
      // All selected = no filter
      if (this.selectedValues.size >= this.allOptions.length) return null;
      if (this.selectedValues.size === 0) {
        // Nothing selected — filter passes nothing
        return {
          colId: colDef.colId,
          field: colDef.field,
          type: 'dropdown',
          logic: 'and',
          conditions: [{ operator: 'equals', value: '__NO_MATCH__' }],
          selectedIds: [],
        };
      }
      return {
        colId: colDef.colId,
        field: colDef.field,
        type: 'dropdown',
        logic: 'and',
        conditions: [{ operator: 'in', value: null }],
        selectedIds: Array.from(this.selectedValues),
      };
    }

    // ── Condition filter ───────────────────────────────────────────────────
    const filterType = this.getFilterDataType(type);
    const c1 = this.buildConditionObject(this.op1, this.val1, this.val1To);
    if (!c1) return null;

    const hasCond2 = this.logicMode !== 'none';
    const c2 = hasCond2 ? this.buildConditionObject(this.op2, this.val2, this.val2To) : null;

    if (!c2) {
      return {
        colId: colDef.colId,
        field: colDef.field,
        type: filterType,
        logic: 'and',
        conditions: [c1],
      };
    }

    return {
      colId: colDef.colId,
      field: colDef.field,
      type: filterType,
      logic: this.logicMode as FilterLogic,
      conditions: [c1, c2],
    };
  }

  private buildConditionObject(
    op: FilterOperator,
    val: string,
    valTo: string,
  ): FilterCondition | null {
    if (isNoValueOperator(op)) return { operator: op, value: null };
    if (val.trim() === '') return null;
    if (isRangeOperator(op)) {
      return { operator: op, value: val.trim(), valueTo: valTo.trim() };
    }
    return { operator: op, value: val.trim() };
  }

  private getFilterDataType(colType: string): import('../../types/filter.types').FilterDataType {
    switch (colType) {
      case 'number': case 'currency': case 'percentage': return 'number';
      case 'date':   case 'time':                        return 'date';
      case 'boolean':                                    return 'boolean';
      case 'dropdown':                                   return 'dropdown';
      case 'array':                                      return 'array';
      default:                                           return 'string';
    }
  }

  // ─── Emit helpers ─────────────────────────────────────────────────────────

  private scheduleEmit(): void {
    this.clearDebounce();
    this.debounceTimer = setTimeout(() => this.emitFilter(), DEBOUNCE_MS);
  }

  private emitFilter(): void {
    const filter = this.buildColumnFilter();
    this.config.onFilterChange(filter);
  }

  private clearDebounce(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  // ─── Positioning ──────────────────────────────────────────────────────────

  private position(): void {
    if (!this.panelEl) return;

    const anchorRect = this.config.anchorEl.getBoundingClientRect();
    const containerRect = this.config.containerEl.getBoundingClientRect();

    let top = anchorRect.bottom - containerRect.top;
    let left = anchorRect.left - containerRect.left;

    // Force a layout so we can read dimensions
    const panelW = this.panelEl.offsetWidth || 280;
    const containerW = containerRect.width;

    // Clamp right edge
    if (left + panelW > containerW) {
      left = Math.max(0, containerW - panelW);
    }
    // Clamp bottom edge — flip upward if needed
    const panelH = this.panelEl.offsetHeight || 300;
    const remainingH = containerRect.height - top;
    if (remainingH < panelH && top > panelH) {
      top = anchorRect.top - containerRect.top - panelH;
    }

    this.panelEl.style.top = `${Math.max(0, top)}px`;
    this.panelEl.style.left = `${Math.max(0, left)}px`;
  }

  // ─── Global event handlers ────────────────────────────────────────────────

  private handleClickOutside(e: MouseEvent): void {
    const target = e.target as Node;
    if (this.panelEl?.contains(target) || this.config.anchorEl?.contains(target)) return;
    this.destroy();
  }

  private handleEscapeKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.stopPropagation();
      this.destroy();
    }
  }
}
