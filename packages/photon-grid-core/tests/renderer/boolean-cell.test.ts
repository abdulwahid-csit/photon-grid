import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { CellRenderer } from '../../src/renderer/cell-renderer';
import { BOOLEAN_CELL_CHECKBOX_CLASS, isBooleanCellEditable } from '../../src/renderer/cell-renderer';
import type { CellRenderContext } from '../../src/renderer/cell-renderer';
import type { ColumnDef } from '../../src/types/column.types';
import type { RowNode } from '../../src/types/row.types';
import type { IconRenderer } from '../../src/icons/icon-renderer';

import { installDomStub, StubElement } from './dom-stub';

/**
 * Contract for `boolean` columns.
 *
 * A boolean cell renders a real checkbox rather than a tick glyph, so both
 * states are legible — an unchecked box is "false", an empty cell is "no
 * value". The checkbox is interactive exactly when the column can be edited,
 * and disabled otherwise: a control that looks clickable but silently refuses
 * to commit is worse than one that visibly cannot be used.
 */

let teardown: () => void;

beforeEach(() => { teardown = installDomStub(); });
afterEach(() => { teardown(); });

const iconRenderer = {
  renderToString: () => '<svg></svg>',
  render: () => new StubElement('span') as unknown as HTMLElement,
  updateIcon: () => undefined,
} as unknown as IconRenderer;

function boolCol(overrides: Partial<ColumnDef> = {}): ColumnDef {
  return { colId: 'active', field: 'active', header: 'Active', type: 'boolean', ...overrides } as ColumnDef;
}

function row(active: unknown): RowNode {
  return {
    nodeId: 'r1',
    rowIndex: 0,
    data: { active },
    type: 'data',
    selected: false,
    expanded: false,
    editable: false,
    level: 0,
    parent: null,
    children: [],
    height: 32,
    top: 0,
  } as unknown as RowNode;
}

function renderBoolCell(colDef: ColumnDef, value: unknown, editingEnabled?: boolean): StubElement {
  const ctx: CellRenderContext = {
    row: row(value),
    colDef,
    rowIndex: 0,
    colIndex: 0,
    iconRenderer,
    api: null,
    editingEnabled,
  };
  return new CellRenderer().renderCell(ctx) as unknown as StubElement;
}

/** The `<input type="checkbox">` a boolean cell renders, or `null`. */
function checkbox(cell: StubElement): StubElement | null {
  return cell.querySelector(`.${BOOLEAN_CELL_CHECKBOX_CLASS}`);
}

describe('CellRenderer — boolean columns', () => {
  it('renders a checkbox, checked to match the value', () => {
    const on = checkbox(renderBoolCell(boolCol(), true));
    expect(on).not.toBeNull();
    expect(on!.tagName).toBe('input');
    expect(on!.type).toBe('checkbox');
    expect(on!.checked).toBe(true);

    // False renders a real, visible unchecked box — not an empty cell.
    const off = checkbox(renderBoolCell(boolCol(), false));
    expect(off).not.toBeNull();
    expect(off!.checked).toBe(false);
  });

  it('enables the checkbox only when the column is editable', () => {
    expect(checkbox(renderBoolCell(boolCol({ editable: true }), true))!.disabled).toBe(false);
    expect(checkbox(renderBoolCell(boolCol(), true))!.disabled).toBe(true);
    expect(checkbox(renderBoolCell(boolCol({ editable: false }), true))!.disabled).toBe(true);
  });

  it('disables the checkbox on a locked column, whatever `editable` says', () => {
    const cell = renderBoolCell(boolCol({ editable: true, locked: true }), true);
    expect(checkbox(cell)!.disabled).toBe(true);
  });

  it('disables the checkbox when the grid has editing switched off', () => {
    const cell = renderBoolCell(boolCol({ editable: true }), true, false);
    expect(checkbox(cell)!.disabled).toBe(true);
  });

  it('does not use the row-selection checkbox class', () => {
    // `.pg-checkbox` means "row-selection checkbox" to BodyRenderer's delegated
    // click handler and to updateRowSelection; a data cell must never claim it.
    const cell = renderBoolCell(boolCol({ editable: true }), true);
    expect(checkbox(cell)!.classList.contains('pg-checkbox')).toBe(false);
    expect(cell.querySelector('.pg-checkbox')).toBeNull();
  });

  it('marks the checkbox so the delegated toggle handler can find it', () => {
    const cell = renderBoolCell(boolCol({ editable: true }), true);
    expect(checkbox(cell)!.getAttribute('data-bool-cell')).toBe('');
  });

  it('leaves a valueFormatter in charge of the presentation', () => {
    // An author who formats the column has opted out of the built-in widget.
    const cell = renderBoolCell(boolCol({ valueFormatter: () => 'Yes' }), true);
    expect(checkbox(cell)).toBeNull();
    expect(cell.textContent).toBe('Yes');
  });
});

describe('isBooleanCellEditable', () => {
  it('requires an editable, unlocked column in an editing-enabled grid', () => {
    expect(isBooleanCellEditable(boolCol({ editable: true }), true)).toBe(true);
    expect(isBooleanCellEditable(boolCol({ editable: true }), undefined)).toBe(true);
    expect(isBooleanCellEditable(boolCol({ editable: true }), false)).toBe(false);
    expect(isBooleanCellEditable(boolCol({ editable: true, locked: true }), true)).toBe(false);
    expect(isBooleanCellEditable(boolCol(), true)).toBe(false);
  });
});
