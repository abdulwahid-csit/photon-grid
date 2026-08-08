import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { countryRenderer } from '../../../src/renderer/built-in/country/country';
import { clearCountryLookupCache } from '../../../src/renderer/built-in/country/country-registry';
import { compileDisplayText } from '../../../src/renderer/renderer-resolver';
import { ClipboardEngine } from '../../../src/engines/clipboard/clipboard-engine';
import { FilterEngine } from '../../../src/engines/filter/filter-engine';
import { GridStore } from '../../../src/core/grid-store';
import { EventBus } from '../../../src/event-bus/event-bus';
import type { ColumnDef } from '../../../src/types/column.types';
import type { ColumnFilter } from '../../../src/types/filter.types';
import type { RowNode } from '../../../src/types/row.types';

/**
 * The country column's *text* contract.
 *
 * The renderer's whole premise is that `US`, `USA` and `United States` all draw
 * the same cell, which means the value a row stores is not the text the user
 * sees. Everything that reasons about a cell as text rather than as pixels has
 * to agree with the cell, or the column becomes a trap: copying it yields codes
 * nobody recognises, and filtering it demands a code the grid never displayed.
 *
 * These specs pin that agreement across the three consumers of
 * `BuiltInRendererDefinition.toText` — the renderer itself, the clipboard, and
 * the filter engine.
 */

beforeEach(() => { clearCountryLookupCache(); });
afterEach(() => { clearCountryLookupCache(); });

/** A column drawn by the built-in country renderer. */
const COUNTRY_COL: ColumnDef = {
  colId: 'country', field: 'country', header: 'Country', type: 'string', renderer: 'country',
};

/** An ordinary text column, to prove untransformed columns are untouched. */
const CITY_COL: ColumnDef = {
  colId: 'city', field: 'city', header: 'City', type: 'string',
};

function dataRow(nodeId: string, data: Record<string, unknown>): RowNode {
  return { nodeId, type: 'data', data, rowIndex: 0, top: 0 } as unknown as RowNode;
}

describe('countryRenderer.toText', () => {
  it('resolves every accepted input form to the displayed name', () => {
    const toText = (v: unknown): string | null => countryRenderer.toText!(v, {});
    expect(toText('US')).toBe('United States');
    expect(toText('USA')).toBe('United States');
    expect(toText('United States')).toBe('United States');
  });

  it('returns null for a value it cannot resolve, so the caller keeps the raw text', () => {
    // The cell falls back to showing the raw value; text consumers must too,
    // rather than being handed an empty string for a typo'd country.
    expect(countryRenderer.toText!('Atlantis', {})).toBeNull();
  });

  it('follows nameFormat, so the text matches whichever form is on screen', () => {
    expect(countryRenderer.toText!('United States', { nameFormat: 'alpha2' })).toBe('US');
    expect(countryRenderer.toText!('US', { nameFormat: 'alpha3' })).toBe('USA');
  });

  it('reports the full name for a flag-only column', () => {
    // The flag carries the cell's accessible label in this mode; "" would be a
    // useless thing to copy or filter by.
    expect(countryRenderer.toText!('US', { showName: false })).toBe('United States');
  });
});

describe('compileDisplayText', () => {
  it('compiles a resolver for a text-transforming column', () => {
    const toText = compileDisplayText(COUNTRY_COL);
    expect(toText).not.toBeNull();
    expect(toText!('US')).toBe('United States');
  });

  it('threads the column\'s renderer options through', () => {
    const toText = compileDisplayText({ ...COUNTRY_COL, rendererParams: { nameFormat: 'alpha3' } });
    expect(toText!('US')).toBe('USA');
  });

  it('returns null for a column whose renderer does not transform its value', () => {
    // The important half of the contract: callers skip the per-cell call
    // entirely, so this seam costs ordinary columns nothing.
    expect(compileDisplayText(CITY_COL)).toBeNull();
  });
});

describe('ClipboardEngine — country columns copy the name', () => {
  /** Captures what the engine writes, without needing a real clipboard. */
  function captureCopy(): { written: string[]; restore: () => void } {
    const written: string[] = [];
    const prior = (globalThis as { navigator?: unknown }).navigator;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { clipboard: { writeText: (t: string) => { written.push(t); return Promise.resolve(); } } },
    });
    return {
      written,
      restore: () => {
        if (prior === undefined) delete (globalThis as { navigator?: unknown }).navigator;
        else Object.defineProperty(globalThis, 'navigator', { configurable: true, value: prior });
      },
    };
  }

  it('copies the country name, not the code the row stores', async () => {
    const { written, restore } = captureCopy();
    try {
      await new ClipboardEngine().copyRowsToClipboard(
        [dataRow('r1', { country: 'US', city: 'Austin' })],
        [COUNTRY_COL, CITY_COL],
      );
      expect(written[0]).toBe('United States\tAustin');
    } finally {
      restore();
    }
  });

  it('falls back to the raw value when the country cannot be resolved', async () => {
    const { written, restore } = captureCopy();
    try {
      await new ClipboardEngine().copyCellValue('Atlantis', COUNTRY_COL);
      expect(written[0]).toBe('Atlantis');
    } finally {
      restore();
    }
  });
});

describe('FilterEngine — country columns filter on the name', () => {
  const ROWS = [
    dataRow('r1', { country: 'US', city: 'Austin' }),
    dataRow('r2', { country: 'DE', city: 'Berlin' }),
    // Deliberately a different raw form of the same country: the user sees one
    // country, so one filter has to catch both rows.
    dataRow('r3', { country: 'United States', city: 'Denver' }),
  ];
  const COLUMNS = [COUNTRY_COL, CITY_COL];

  function engine(): FilterEngine {
    const bus = new EventBus();
    return new FilterEngine(new GridStore(bus), bus);
  }

  function textFilter(operator: string, value: string): ColumnFilter {
    return {
      colId: 'country', field: 'country', type: 'string', logic: 'and',
      conditions: [{ operator, value }],
    } as unknown as ColumnFilter;
  }

  it('matches a "contains" condition against the displayed name', () => {
    const fe = engine();
    fe.setColumnFilter('country', textFilter('contains', 'United'));
    expect(fe.applyFilters(ROWS, COLUMNS).map((r) => r.nodeId)).toEqual(['r1', 'r3']);
  });

  it('keeps negative operators honest', () => {
    // The reason the display text *replaces* the raw value rather than being
    // OR-ed with it: under an OR, `notEquals` would pass on the raw "US" and
    // match every row.
    const fe = engine();
    fe.setColumnFilter('country', textFilter('notEquals', 'United States'));
    expect(fe.applyFilters(ROWS, COLUMNS).map((r) => r.nodeId)).toEqual(['r2']);
  });

  it('matches a set filter selected by name across every raw form', () => {
    const fe = engine();
    fe.setColumnFilter('country', {
      colId: 'country', field: 'country', type: 'string', logic: 'and',
      conditions: [], selectedIds: ['United States'],
    } as unknown as ColumnFilter);
    expect(fe.applyFilters(ROWS, COLUMNS).map((r) => r.nodeId)).toEqual(['r1', 'r3']);
  });

  it('searches the displayed name from the quick filter', () => {
    const fe = engine();
    fe.setQuickFilter({ term: 'germany' });
    expect(fe.applyFilters(ROWS, COLUMNS).map((r) => r.nodeId)).toEqual(['r2']);
  });

  it('leaves untransformed columns matching on their raw value', () => {
    const fe = engine();
    fe.setColumnFilter('city', {
      colId: 'city', field: 'city', type: 'string', logic: 'and',
      conditions: [{ operator: 'contains', value: 'Berl' }],
    } as unknown as ColumnFilter);
    expect(fe.applyFilters(ROWS, COLUMNS).map((r) => r.nodeId)).toEqual(['r2']);
  });
});
