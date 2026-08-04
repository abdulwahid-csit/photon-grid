import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { cellRenderers } from '../../../src/renderer/built-in/registry';
import type { BuiltInRenderContext, BaseRendererOptions } from '../../../src/types/built-in-renderer.types';
import type { ColumnDef } from '../../../src/types/column.types';

import { installDomStub, StubElement } from '../dom-stub';

/**
 * One case per built-in renderer.
 *
 * Deliberately shallow and broad rather than deep: the value is in catching a
 * renderer that throws, blanks a cell, or mis-declares `textOnly` — the three
 * failures that would be invisible until a column in production used it.
 * Behavioural depth lives in the focused suites (`country.test.ts`).
 */

let teardown: () => void;

beforeEach(() => { teardown = installDomStub(); });
afterEach(() => { teardown(); });

function render(
  name: string,
  value: unknown,
  colDef: Partial<ColumnDef> = {},
  options: BaseRendererOptions = {},
): StubElement {
  const inner = new StubElement('div');
  const definition = cellRenderers.get(name);
  if (!definition) throw new Error(`no renderer registered as "${name}"`);
  definition.render({
    inner: inner as unknown as HTMLElement,
    value,
    rawValue: value,
    formattedValue: value === null || value === undefined ? '' : String(value),
    row: {},
    colDef: { colId: 'c', field: 'c', header: 'C', type: 'string', ...colDef } as ColumnDef,
    rowIndex: 0,
    colIndex: 0,
    options,
    icons: null,
    locale: 'en-US',
    api: null,
  } as BuiltInRenderContext);
  return inner;
}

/** Every renderer name the grid ships. */
const ALL = cellRenderers.names();

describe('built-in renderers — the whole set', () => {
  it('registers all 29 documented names', () => {
    expect(ALL).toHaveLength(29);
  });

  it.each(ALL)('%s survives a null value without throwing or leaving a hole', (name) => {
    const el = render(name, null);
    // Something must always be appended, or the cell collapses and the row's
    // columns fall out of alignment.
    expect(el.children.length).toBeGreaterThan(0);
  });

  it.each(ALL)('%s puts .pg-cell__value first, as findValueEl expects', (name) => {
    const el = render(name, 1, { type: 'number' });
    expect(el.children[0]?.classList.contains('pg-cell__value')).toBe(true);
  });

  it.each(ALL.filter((n) => cellRenderers.get(n)?.textOnly))(
    '%s is textOnly and therefore emits no child elements',
    (name) => {
      // The Virtual DOM patches a textOnly cell with a `textContent` write,
      // which destroys children. A renderer that declares textOnly and emits
      // elements would lose them on the first value change.
      const span = render(name, 42, { type: 'number' }).children[0];
      expect(span.children.length).toBe(0);
    },
  );
});

describe('text renderers', () => {
  it('renders text and mirrors it into the title', () => {
    const span = render('text', 'hello').children[0];
    expect(span.textContent).toBe('hello');
    expect(span.title).toBe('hello');
  });

  it('truncates past maxLength', () => {
    expect(render('text', 'abcdefgh', {}, { maxLength: 4 } as BaseRendererOptions).textContent)
      .toBe('abcd…');
  });

  it('formats numbers, currency and percentages', () => {
    expect(render('number', 1234.5, { type: 'number' }).textContent).toBe('1,234.5');
    expect(render('currency', 1234.5, { type: 'currency' }).textContent).toBe('$1,234.50');
    expect(render('percentage', 42, { type: 'percentage' }).textContent).toBe('42%');
  });

  it('scales a ratio percentage when asked', () => {
    expect(render('percentage', 0.42, {}, { scale: 'ratio' } as BaseRendererOptions).textContent)
      .toBe('42%');
  });

  it('shows a non-numeric value verbatim rather than NaN', () => {
    // Real datasets carry 'N/A' in numeric columns; NaN loses what the author
    // deliberately put there.
    expect(render('number', 'N/A', { type: 'number' }).textContent).toBe('N/A');
  });

  it('renders booleans as Yes/No text', () => {
    expect(render('boolean', true).textContent).toBe('Yes');
    expect(render('boolean', false).textContent).toBe('No');
  });

  it('formats durations from seconds', () => {
    expect(render('duration', 8100).textContent).toBe('2h 15m');
    expect(render('duration', 45).textContent).toBe('45s');
    expect(render('duration', 8100, {}, { style: 'clock' } as BaseRendererOptions).textContent)
      .toBe('02:15:00');
  });

  it('serialises JSON compactly', () => {
    expect(render('json', { a: 1 }).textContent).toBe('{"a":1}');
  });
});

describe('element renderers', () => {
  it('builds a mailto link for email and a tel link for phone', () => {
    expect(render('email', 'a@b.com').querySelector('a')?.getAttribute('href')).toBe('mailto:a@b.com');
    expect(render('phone', '+1 (555) 123-4567').querySelector('a')?.getAttribute('href'))
      .toBe('tel:+15551234567');
  });

  it('gives a bare URL a scheme and opens it safely in a new tab', () => {
    const a = render('link', 'example.com').querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://example.com');
    expect(a?.getAttribute('target')).toBe('_blank');
    // Without this an opened page can reach back through `window.opener`.
    expect(a?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('refuses an href that would execute rather than navigate', () => {
    // Row data is untrusted; a stored `javascript:` value would otherwise be
    // script execution behind a single click.
    expect(render('link', 'javascript:alert(1)').querySelector('a')?.getAttribute('href')).toBe('');
    expect(render('link', 'DATA:text/html,x').querySelector('a')?.getAttribute('href')).toBe('');
  });

  it('renders an image with reserved dimensions', () => {
    const img = render('image', 'https://x/a.png').querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://x/a.png');
    // Set before load so the row does not reflow when the image arrives.
    expect(img?.getAttribute('width')).toBe('32');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('falls back to initials when an avatar value is not an image', () => {
    // A user table is full of rows with no uploaded picture; a broken-image
    // icon on every one is worse than no avatar.
    const el = render('avatar', 'Ada Lovelace');
    expect(el.querySelector('.pg-cell-avatar')?.textContent).toBe('AL');
    expect(el.querySelector('img')).toBeNull();
  });

  it('renders a checkbox, disabled unless the column is editable', () => {
    expect(render('checkbox', true, { editable: true }).querySelector('.pg-cell-checkbox')?.disabled)
      .toBe(false);
    expect(render('checkbox', true).querySelector('.pg-cell-checkbox')?.disabled).toBe(true);
  });

  it('renders a badge only when a colour resolves, matching the original behaviour', () => {
    const withColor = render('badge', 'a', {
      dropdownOptions: [{ value: 'a', label: 'Active', color: '#0f0' }],
    });
    expect(withColor.querySelector('.pg-badge')?.textContent).toBe('Active');

    // A colourless pill is just text in a box.
    expect(render('badge', 'a').querySelector('.pg-badge')).toBeNull();
  });

  it('always colours a tag, so the same value looks the same everywhere', () => {
    expect(render('tag', 'platform').querySelector('.pg-badge')).not.toBeNull();
  });

  it('collapses a long list into a +N counter', () => {
    const el = render('list', ['a', 'b', 'c', 'd', 'e']);
    const pills = el.querySelectorAll('.pg-badge');
    expect(pills).toHaveLength(4);
    expect(pills[3].textContent).toBe('+2');
    // The full list stays reachable, which is what makes truncating safe.
    expect(el.children[0].title).toBe('a, b, c, d, e');
  });

  it('draws every rating symbol, filling up to the score', () => {
    // All symbols are always present so the column does not shift width as
    // values change — and so `patch` can re-score by toggling classes.
    const el = render('rating', 3);
    const items = el.querySelectorAll('.pg-cell-rating__item');
    expect(items).toHaveLength(5);
    expect(items.filter((i) => i.classList.contains('pg-cell-rating__item--on'))).toHaveLength(3);
  });

  it('drives the progress bar through a custom property, not an inline width', () => {
    const span = render('progress', 25, { type: 'number' }).children[0];
    expect(span.style['--pg-progress-fraction']).toBe('0.25');
    expect(span.querySelector('.pg-cell-progress__label')?.textContent).toBe('25%');
  });

  it('clamps a progress value outside its bounds', () => {
    expect(render('progress', 500, { type: 'number' }).children[0].style['--pg-progress-fraction'])
      .toBe('1');
    expect(render('progress', -5, { type: 'number' }).children[0].style['--pg-progress-fraction'])
      .toBe('0');
  });

  it('renders a button carrying its action', () => {
    const button = render('button', 'Go', {}, { action: 'open' } as BaseRendererOptions)
      .querySelector('button');
    expect(button?.getAttribute('data-cell-button')).toBe('open');
    expect(button?.textContent).toBe('Go');
  });

  it('builds the sparkline scaffold even where a canvas cannot paint', () => {
    expect(render('sparkline', [1, 2, 3]).querySelector('canvas.pg-sparkline')).not.toBeNull();
  });
});

describe('patch hooks', () => {
  it('are declared by exactly the renderers whose element holds state', () => {
    const withPatch = ALL.filter((n) => typeof cellRenderers.get(n)?.patch === 'function');
    expect(withPatch.sort()).toEqual(
      ['button', 'checkbox', 'progress', 'rating', 'sparkline', 'switch'].sort(),
    );
  });

  it('re-scores a rating in place instead of rebuilding it', () => {
    const inner = render('rating', 2);
    const cell = new StubElement('div');
    cell.appendChild(inner);
    const before = inner.querySelectorAll('.pg-cell-rating__item')[0];

    const patched = cellRenderers.get('rating')!.patch!(cell as unknown as HTMLElement, {
      value: 4,
      options: {},
      colDef: {} as ColumnDef,
    } as BuiltInRenderContext);

    expect(patched).toBe(true);
    const items = inner.querySelectorAll('.pg-cell-rating__item');
    // Same elements, new classes — that is the whole point of a patch.
    expect(items[0]).toBe(before);
    expect(items.filter((i) => i.classList.contains('pg-cell-rating__item--on'))).toHaveLength(4);
  });
});
