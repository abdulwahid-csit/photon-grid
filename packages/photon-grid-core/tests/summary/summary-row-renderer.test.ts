// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import {
  SummaryPosition,
  SummaryRowRenderer,
  SummaryScope,
  type SummaryBandLayout,
  type SummaryBandRow,
  type SummaryCellSnapshot,
} from '../../src/summary';
import type { ColumnDef } from '../../src/types/column.types';

/**
 * Contract for `SummaryRowRenderer`'s band DOM.
 *
 * Two properties matter most and are what these specs pin down:
 *
 * 1. **Alignment.** A summary cell must land under its column in every layout —
 *    pinned regions, gutters, an auto-group column, and a horizontally
 *    virtualized center window. It achieves that by carrying `data-col-id`
 *    (so `ColumnStyleManager`'s width rules apply) and by mirroring the header's
 *    spacer widths, so anything that breaks that correspondence breaks the grid.
 * 2. **Reconciliation.** A value-only refresh must patch text in place rather
 *    than rebuild, because a rebuild on every data tick would discard custom
 *    renderers and thrash layout.
 */

function col(colId: string, extra: Partial<ColumnDef> = {}): ColumnDef {
  return { colId, field: colId, header: colId, type: 'number', ...extra } as ColumnDef;
}

function cell(colId: string, formattedValue: string, extra: Partial<SummaryCellSnapshot> = {}): SummaryCellSnapshot {
  return {
    colId,
    value: formattedValue,
    formattedValue,
    tooltip: null,
    colSpan: 1,
    createRendererParams: null,
    ...extra,
  };
}

function bandRow(
  id: string,
  cells: SummaryCellSnapshot[],
  def: Partial<SummaryBandRow['def']['def']> = {},
): SummaryBandRow {
  const map = new Map<string, SummaryCellSnapshot>();
  for (const c of cells) map.set(c.colId, c);
  return {
    def: {
      id,
      def: { id, ...def },
      position: SummaryPosition.Bottom,
      sticky: true,
      scope: SummaryScope.All,
      height: 40,
      className: null,
    },
    snapshot: {
      id,
      position: SummaryPosition.Bottom,
      sticky: true,
      scope: SummaryScope.All,
      rowCount: 3,
      height: 40,
      className: null,
      cells: map,
    },
  };
}

const WIDTHS: Record<string, number> = { a: 100, b: 150, c: 200, d: 50 };

function layout(overrides: Partial<SummaryBandLayout> = {}): SummaryBandLayout {
  return {
    leftCols: [],
    centerCols: [col('a'), col('b')],
    rightCols: [],
    centerLeftSpacerW: 0,
    centerRightSpacerW: 0,
    showCheckboxes: false,
    showSerialNumber: false,
    showVerticalBorders: false,
    hasGroupColumn: false,
    groupColWidth: 200,
    hasLeftPanel: false,
    hasRightPanel: false,
    getColumnWidth: (colId) => WIDTHS[colId] ?? 100,
    ...overrides,
  };
}

let host: HTMLElement;
let renderer: SummaryRowRenderer;

beforeEach(() => {
  document.body.innerHTML = '';
  host = document.createElement('div');
  document.body.appendChild(host);
  renderer = new SummaryRowRenderer(SummaryPosition.Bottom, true);
  renderer.mount(host);
});

describe('SummaryRowRenderer — structure', () => {
  it('builds the three regions plus the scrollbar spacer', () => {
    const band = renderer.getElement()!;
    expect(band.querySelector('.pg-summary__region--left')).not.toBeNull();
    expect(band.querySelector('.pg-summary__region--center .pg-summary__region-inner')).not.toBeNull();
    expect(band.querySelector('.pg-summary__region--right')).not.toBeNull();
    expect(band.querySelector('.pg-summary__vscroll-spacer')).not.toBeNull();
    expect(band.getAttribute('role')).toBe('rowgroup');
  });

  it('inserts before an anchor so a top band precedes the body in flex order', () => {
    const body = document.createElement('div');
    body.className = 'body';
    host.appendChild(body);

    const top = new SummaryRowRenderer(SummaryPosition.Top, true);
    top.mount(host, body);
    expect(host.children[1].className).toContain('pg-summary--top');
    expect(host.children[2]).toBe(body);
  });

  it('stamps every cell with data-col-id so column width rules apply', () => {
    renderer.render([bandRow('r', [cell('a', '10'), cell('b', '20')])], layout());
    const ids = [...renderer.getElement()!.querySelectorAll('.pg-summary__region--center [data-col-id]')]
      .map((el) => el.getAttribute('data-col-id'));
    expect(ids).toEqual(['a', 'b']);
  });

  it('renders a row slice into each displayed pinned region', () => {
    renderer.render(
      [bandRow('r', [cell('a', '1'), cell('b', '2'), cell('c', '3')])],
      layout({
        leftCols: [col('a')],
        centerCols: [col('b')],
        rightCols: [col('c')],
        hasLeftPanel: true,
        hasRightPanel: true,
      }),
    );
    const band = renderer.getElement()!;
    expect(band.querySelectorAll('.pg-summary__row')).toHaveLength(3); // one per region
    expect(band.querySelector('.pg-summary__region--left [data-col-id="a"]')).not.toBeNull();
    expect(band.querySelector('.pg-summary__region--right [data-col-id="c"]')).not.toBeNull();
  });

  it('omits pinned regions that are not displayed', () => {
    renderer.render([bandRow('r', [cell('a', '1')])], layout({ centerCols: [col('a')] }));
    expect(renderer.getElement()!.querySelectorAll('.pg-summary__row')).toHaveLength(1);
  });

  it('emits gutter cells matching the header for checkbox and serial columns', () => {
    renderer.render(
      [bandRow('r', [cell('a', '1')])],
      layout({ leftCols: [col('a')], hasLeftPanel: true, showCheckboxes: true, showSerialNumber: true }),
    );
    const left = renderer.getElement()!.querySelector('.pg-summary__region--left .pg-summary__row')!;
    // Serial first, then checkbox — the order the header and body rows use.
    // They are different widths (52px vs 44px), so the reverse order shifts
    // every left-panel column by 8px.
    expect(left.children[0].className).toContain('pg-summary__cell--serial');
    expect(left.children[1].className).toContain('pg-summary__cell--checkbox');
    expect(left.children[2].getAttribute('data-col-id')).toBe('a');
  });

  it('reserves the auto-group column at the start of the center region', () => {
    renderer.render(
      [bandRow('r', [cell('a', '1')])],
      layout({ centerCols: [col('a')], hasGroupColumn: true, groupColWidth: 180 }),
    );
    const first = renderer.getElement()!.querySelector('.pg-summary__region-inner .pg-summary__row')!
      .children[0] as HTMLElement;
    expect(first.className).toContain('pg-summary__cell--group');
    expect(first.style.width).toBe('180px');
  });

  it('mirrors the header\'s virtual-window spacers on both sides', () => {
    renderer.render(
      [bandRow('r', [cell('b', '2')])],
      layout({ centerCols: [col('b')], centerLeftSpacerW: 300, centerRightSpacerW: 450 }),
    );
    const row = renderer.getElement()!.querySelector('.pg-summary__region-inner .pg-summary__row')!;
    const spacers = [...row.querySelectorAll('.pg-summary__spacer')] as HTMLElement[];
    expect(spacers.map((s) => s.style.width)).toEqual(['300px', '450px']);
  });

  it('right-aligns numeric columns and leaves text columns alone', () => {
    renderer.render(
      [bandRow('r', [cell('a', '1'), cell('b', 'x')])],
      layout({ centerCols: [col('a'), col('b', { type: 'string' })] }),
    );
    const band = renderer.getElement()!;
    expect(band.querySelector('[data-col-id="a"]')!.className).toContain('--align-right');
    expect(band.querySelector('[data-col-id="b"]')!.className).not.toContain('--align-');
  });

  it('hides the band and reports zero height when it has no rows', () => {
    renderer.render([bandRow('r', [cell('a', '1')])], layout());
    expect(renderer.getHeight()).toBe(40);

    renderer.render([], layout());
    expect(renderer.getElement()!.className).toContain('pg-summary--empty');
    expect(renderer.getHeight()).toBe(0);
  });

  it('sums row heights, so a multi-row band reserves the right space', () => {
    renderer.render([bandRow('a', []), bandRow('b', [])], layout());
    expect(renderer.getHeight()).toBe(80);
  });
});

describe('SummaryRowRenderer — colSpan', () => {
  it('sizes a spanned cell to the total width of the columns it covers', () => {
    renderer.render(
      [bandRow('r', [cell('a', 'Total', { colSpan: 2 }), cell('c', '9')])],
      layout({ centerCols: [col('a'), col('b'), col('c')] }),
    );
    const row = renderer.getElement()!.querySelector('.pg-summary__region-inner .pg-summary__row')!;
    const first = row.children[0] as HTMLElement;
    expect(first.getAttribute('data-col-id')).toBe('a');
    expect(first.style.width).toBe('250px'); // a(100) + b(150)
    expect(first.getAttribute('aria-colspan')).toBe('2');
    // `b` is covered, so it gets no cell of its own; `c` follows immediately.
    expect(row.children).toHaveLength(2);
    expect((row.children[1] as HTMLElement).getAttribute('data-col-id')).toBe('c');
  });

  it('clamps a span to the end of its region so it cannot cross a pinned boundary', () => {
    renderer.render(
      [bandRow('r', [cell('a', 'Wide', { colSpan: 5 }), cell('c', '9')])],
      layout({
        leftCols: [col('a'), col('b')],
        centerCols: [col('c')],
        hasLeftPanel: true,
      }),
    );
    const left = renderer.getElement()!.querySelector('.pg-summary__region--left .pg-summary__row')!;
    const spanned = left.children[0] as HTMLElement;
    // Clamped from 5 to the 2 columns the left region actually has.
    expect(spanned.style.width).toBe('250px');
    expect(left.children).toHaveLength(1);
    // The center region is untouched by the left region's span.
    expect(renderer.getElement()!.querySelector('.pg-summary__region-inner [data-col-id="c"]')).not.toBeNull();
  });
});

describe('SummaryRowRenderer — reconciliation', () => {
  it('patches values in place, keeping the same elements', () => {
    const l = layout();
    renderer.render([bandRow('r', [cell('a', '10'), cell('b', '20')])], l);
    const before = renderer.getElement()!.querySelector('[data-col-id="a"]')!;

    renderer.render([bandRow('r', [cell('a', '99'), cell('b', '20')])], l);
    const after = renderer.getElement()!.querySelector('[data-col-id="a"]')!;

    expect(after).toBe(before); // same node — no rebuild
    expect(after.textContent).toBe('99');
  });

  it('rebuilds when the column layout changes', () => {
    renderer.render([bandRow('r', [cell('a', '10'), cell('b', '20')])], layout());
    const before = renderer.getElement()!.querySelector('[data-col-id="a"]')!;

    // A reorder is a structural change: the same cell must not be reused in a
    // position that now belongs to a different column.
    renderer.render(
      [bandRow('r', [cell('a', '10'), cell('b', '20')])],
      layout({ centerCols: [col('b'), col('a')] }),
    );
    expect(renderer.getElement()!.querySelector('[data-col-id="a"]')).not.toBe(before);
  });

  it('rebuilds when the virtual column window slides', () => {
    renderer.render([bandRow('r', [cell('a', '1')])], layout({ centerLeftSpacerW: 0 }));
    const before = renderer.getElement()!.querySelector('.pg-summary__row')!;
    renderer.render([bandRow('r', [cell('a', '1')])], layout({ centerLeftSpacerW: 120 }));
    expect(renderer.getElement()!.querySelector('.pg-summary__row')).not.toBe(before);
  });

  it('rebuilds when a row is added or removed', () => {
    const l = layout();
    renderer.render([bandRow('a', [cell('a', '1')])], l);
    renderer.render([bandRow('a', [cell('a', '1')]), bandRow('b', [cell('a', '2')])], l);
    expect(renderer.getElement()!.querySelectorAll('.pg-summary__row')).toHaveLength(2);
  });

  it('adds, updates and removes the tooltip attribute as the value changes', () => {
    const l = layout();
    renderer.render([bandRow('r', [cell('a', '1', { tooltip: 'first' })])], l);
    const el = renderer.getElement()!.querySelector('[data-col-id="a"]')!;
    expect(el.getAttribute('title')).toBe('first');

    renderer.render([bandRow('r', [cell('a', '2', { tooltip: 'second' })])], l);
    expect(el.getAttribute('title')).toBe('second');

    renderer.render([bandRow('r', [cell('a', '3', { tooltip: null })])], l);
    expect(el.hasAttribute('title')).toBe(false);
  });

  it('re-invokes a custom renderer when its value changes', () => {
    let invocations = 0;
    const withRenderer = (value: string): SummaryBandRow => {
      const r = bandRow('r', [
        cell('a', value, {
          createRendererParams: () => {
            invocations++;
            return {
              rowId: 'r', colId: 'a', colDef: null, rows: [], values: [],
              scope: SummaryScope.All, api: null, value, formattedValue: value,
            };
          },
        }),
      ]);
      r.def.def.cells = { a: { renderer: (p) => `<b>${p.formattedValue}</b>` } };
      return r;
    };

    const l = layout();
    renderer.render([withRenderer('10')], l);
    expect(invocations).toBe(1);
    expect(renderer.getElement()!.querySelector('[data-col-id="a"]')!.innerHTML).toBe('<b>10</b>');

    renderer.render([withRenderer('20')], l);
    expect(invocations).toBe(2);
    expect(renderer.getElement()!.querySelector('[data-col-id="a"]')!.innerHTML).toBe('<b>20</b>');

    // Unchanged value → no re-invocation.
    renderer.render([withRenderer('20')], l);
    expect(invocations).toBe(2);
  });

  it('applies per-cell class names and inline style declarations', () => {
    const r = bandRow('r', [cell('a', '1')]);
    r.def.def.cells = { a: { className: 'my-cell extra', style: { '--pg-bar': '40%' } } };
    renderer.render([r], layout());

    const el = renderer.getElement()!.querySelector('[data-col-id="a"]') as HTMLElement;
    expect(el.classList.contains('my-cell')).toBe(true);
    expect(el.classList.contains('extra')).toBe(true);
    expect(el.style.getPropertyValue('--pg-bar')).toBe('40%');
  });
});

describe('SummaryRowRenderer — in-content positioning', () => {
  it('writes the offset variable and hides the band once it scrolls out of view', () => {
    const inline = new SummaryRowRenderer(SummaryPosition.Bottom, false);
    inline.mount(host);
    const el = inline.getElement()!;

    inline.setInlineOffset(120, true);
    expect(el.style.getPropertyValue('--pg-summary-offset-y')).toBe('120px');
    expect(el.style.display).toBe('');

    inline.setInlineOffset(-999, false);
    expect(el.style.display).toBe('none');
  });
});

describe('SummaryRowRenderer — teardown', () => {
  it('detaches the band and drops its element reference', () => {
    renderer.render([bandRow('r', [cell('a', '1')])], layout());
    renderer.destroy();
    expect(renderer.getElement()).toBeNull();
    expect(host.querySelector('.pg-summary')).toBeNull();
    expect(renderer.getHeight()).toBe(0);
  });
});
