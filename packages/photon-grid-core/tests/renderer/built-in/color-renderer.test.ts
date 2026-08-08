// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { colorRenderer } from '../../../src/renderer/built-in/color';
import { cellRenderers } from '../../../src/renderer/built-in/registry';
import { DEFAULT_RENDERER_BY_TYPE } from '../../../src/renderer/built-in/default-renderer-map';
import { compileDisplayText, resolveDisplayRenderer } from '../../../src/renderer/renderer-resolver';
import { clearColorParseCache } from '../../../src/color';
import type {
  BuiltInRenderContext,
  ColorRendererOptions,
} from '../../../src/types/built-in-renderer.types';
import type { ColumnDef } from '../../../src/types/column.types';

/**
 * The `color` renderer's contract.
 *
 * The column's premise is that `#f00`, `rgb(255 0 0)`, `hsl(0 100% 50%)` and
 * `red` are one colour, and that the cell shows it. These specs pin what reaches
 * the DOM for each of those forms, what happens to a value that is not a colour
 * at all, and the in-place patch path — which is the difference between a
 * colour column that survives a live feed and one that rebuilds every cell.
 */

const COLOR_COL: ColumnDef = {
  colId: 'brand', field: 'brand', header: 'Brand colour', type: 'color',
};

beforeEach(() => {
  clearColorParseCache();
});

/** Builds a render context around a fresh `.pg-cell` / `.pg-cell__inner` pair. */
function context(
  value: unknown,
  options: ColorRendererOptions = {},
): BuiltInRenderContext<ColorRendererOptions> & { cell: HTMLElement } {
  const cell = document.createElement('div');
  cell.className = 'pg-cell';
  const inner = document.createElement('div');
  inner.className = 'pg-cell__inner';
  cell.appendChild(inner);

  return {
    cell,
    inner,
    value,
    rawValue: value,
    formattedValue: value === null || value === undefined ? '' : String(value),
    row: {},
    colDef: COLOR_COL,
    rowIndex: 0,
    colIndex: 0,
    options,
    icons: null,
    api: null,
  };
}

/** Renders one value and hands back the cell plus its root value element. */
function render(
  value: unknown,
  options: ColorRendererOptions = {},
): { cell: HTMLElement; root: HTMLElement } {
  const ctx = context(value, options);
  colorRenderer.render(ctx);
  return { cell: ctx.cell, root: ctx.inner.querySelector<HTMLElement>('.pg-cell__value')! };
}

describe('colorRenderer — registration', () => {
  it('is registered under its name', () => {
    expect(cellRenderers.get('color')).toBe(colorRenderer);
  });

  it('is what a type: "color" column renders with by default', () => {
    expect(DEFAULT_RENDERER_BY_TYPE.color).toBe('color');
    expect(resolveDisplayRenderer(COLOR_COL).builtIn).toBe(colorRenderer);
  });

  it('is not textOnly, since it emits a swatch element', () => {
    // Declaring textOnly would let the Virtual DOM patch the cell with a single
    // textContent write, destroying the swatch.
    expect(colorRenderer.textOnly).toBe(false);
  });
});

describe('colorRenderer — every notation reaches the DOM as one colour', () => {
  it.each([
    ['#f00', '#ff0000'],
    ['#ff0000', '#ff0000'],
    ['rgb(255, 0, 0)', '#ff0000'],
    ['rgb(255 0 0)', '#ff0000'],
    ['hsl(0, 100%, 50%)', '#ff0000'],
    ['hsl(0deg 100% 50%)', '#ff0000'],
    ['red', '#ff0000'],
    ['RED', '#ff0000'],
  ])('paints %s as %s', (value, expected) => {
    const { root } = render(value);
    expect(root.style.getPropertyValue('--pg-cell-color')).toBe(expected);
  });

  it('carries alpha through as an rgba paint value', () => {
    const { root } = render('rgba(255, 0, 0, 0.5)');
    expect(root.style.getPropertyValue('--pg-cell-color')).toBe('rgba(255, 0, 0, 0.5)');
  });
});

describe('colorRenderer — structure', () => {
  it('draws a swatch and the stored text by default', () => {
    const { root } = render('rgb(255, 0, 0)');
    expect(root.querySelector('.pg-cell-color__swatch')).not.toBeNull();
    // 'value' is the default format: what the row stores, not a normalised form.
    expect(root.querySelector('.pg-cell-color__text')?.textContent).toBe('rgb(255, 0, 0)');
  });

  it('hides the swatch on request', () => {
    const { root } = render('red', { showSwatch: false });
    expect(root.querySelector('.pg-cell-color__swatch')).toBeNull();
    expect(root.querySelector('.pg-cell-color__text')?.textContent).toBe('red');
  });

  it('applies the requested shape and size', () => {
    const { root } = render('red', { shape: 'circle', size: 20 });
    expect(root.querySelector('.pg-cell-color__swatch')?.className).toContain(
      'pg-cell-color__swatch--circle',
    );
    expect(root.style.getPropertyValue('--pg-cell-swatch-size')).toBe('20px');
  });

  it('marks a translucent swatch for the checkerboard, and an opaque one not', () => {
    expect(render('rgba(255, 0, 0, 0.5)').root.querySelector('.pg-cell-color__swatch')!.className)
      .toContain('pg-cell-color__swatch--alpha');
    expect(render('#ff0000').root.querySelector('.pg-cell-color__swatch')!.className)
      .not.toContain('pg-cell-color__swatch--alpha');
  });

  it('omits the checkerboard when the column turns it off', () => {
    const { root } = render('rgba(255, 0, 0, 0.5)', { showAlpha: false });
    expect(root.querySelector('.pg-cell-color__swatch')!.className).not.toContain('--alpha');
  });

  it('resolves the contrast colour only for the filled variant', () => {
    // The contrast probe is the one real calculation in the renderer; the
    // default variant must not pay for it.
    expect(render('#ffffff', { variant: 'fill' }).root.style.getPropertyValue(
      '--pg-cell-color-contrast',
    )).toBe('#000000');
    expect(render('#000000', { variant: 'fill' }).root.style.getPropertyValue(
      '--pg-cell-color-contrast',
    )).toBe('#ffffff');
    expect(render('#ffffff').root.style.getPropertyValue('--pg-cell-color-contrast')).toBe('');
  });

  it('keeps the pill element in the filled variant even with no label', () => {
    // The label element *is* what gets painted; dropping it leaves nothing.
    const { root } = render('red', { variant: 'fill', textFormat: 'none' });
    expect(root.classList.contains('pg-cell-color--fill')).toBe(true);
    expect(root.querySelector('.pg-cell-color__text')).not.toBeNull();
  });

  it('labels a swatch-only cell for assistive technology', () => {
    const { root } = render('red', { textFormat: 'none' });
    expect(root.querySelector('.pg-cell-color__text')).toBeNull();
    expect(root.getAttribute('role')).toBe('img');
    expect(root.getAttribute('aria-label')).toBe('#ff0000');
  });

  it('tooltips the hex whatever notation is displayed, and can be turned off', () => {
    expect(render('hsl(0, 100%, 50%)').root.title).toBe('#ff0000');
    expect(render('red', { tooltip: false }).root.title).toBe('');
  });

  it('applies the column\'s extra class', () => {
    expect(render('red', { cssClass: 'brand-swatch' }).root.className).toContain('brand-swatch');
  });
});

describe('colorRenderer — text formats', () => {
  it.each([
    ['value', 'hsl(0, 100%, 50%)'],
    ['hex', '#ff0000'],
    ['rgb', 'rgb(255, 0, 0)'],
    ['hsl', 'hsl(0, 100%, 50%)'],
    ['name', 'red'],
    ['none', undefined],
  ] as const)('renders %s as %s', (textFormat, expected) => {
    const { root } = render('hsl(0, 100%, 50%)', { textFormat });
    expect(root.querySelector('.pg-cell-color__text')?.textContent).toBe(expected);
  });
});

describe('colorRenderer — values that are not colours', () => {
  it('shows the raw text rather than blanking the cell', () => {
    const { root } = render('not a colour');
    expect(root.textContent).toBe('not a colour');
    expect(root.querySelector('.pg-cell-color__swatch')).toBeNull();
  });

  it('honours a literal fallback', () => {
    expect(render('n/a', { fallback: '—' }).root.textContent).toBe('—');
  });

  it('honours a fallback function, string or element', () => {
    expect(render('n/a', { fallback: (v) => `<em>${String(v)}</em>` }).root.innerHTML)
      .toBe('<em>n/a</em>');

    const el = document.createElement('b');
    el.textContent = 'missing';
    expect(render('n/a', { fallback: () => el }).root.textContent).toBe('missing');
  });

  it('renders the empty state for an absent value', () => {
    expect(render(null).root.textContent).toBe('');
    expect(render(undefined, { emptyText: '—' }).root.textContent).toBe('—');
    expect(render('   ', { emptyText: '—' }).root.textContent).toBe('—');
  });
});

describe('colorRenderer.patch', () => {
  it('repaints in place without replacing the swatch element', () => {
    const { cell } = render('red');
    const swatch = cell.querySelector('.pg-cell-color__swatch');

    expect(colorRenderer.patch!(cell, context('blue'))).toBe(true);

    const root = cell.querySelector<HTMLElement>('.pg-cell__value')!;
    expect(root.style.getPropertyValue('--pg-cell-color')).toBe('#0000ff');
    expect(root.querySelector('.pg-cell-color__text')?.textContent).toBe('blue');
    // The very same element: a rebuild would have thrown it away.
    expect(cell.querySelector('.pg-cell-color__swatch')).toBe(swatch);
  });

  it('adds and removes the alpha checkerboard as the value changes', () => {
    const { cell } = render('#ff0000');
    colorRenderer.patch!(cell, context('rgba(255, 0, 0, 0.5)'));
    expect(cell.querySelector('.pg-cell-color__swatch')!.className).toContain('--alpha');

    colorRenderer.patch!(cell, context('#ff0000'));
    expect(cell.querySelector('.pg-cell-color__swatch')!.className).not.toContain('--alpha');
  });

  it('keeps the tooltip and accessible label in step', () => {
    const { cell } = render('red', { textFormat: 'none' });
    colorRenderer.patch!(cell, context('blue', { textFormat: 'none' }));
    const root = cell.querySelector<HTMLElement>('.pg-cell__value')!;
    expect(root.title).toBe('#0000ff');
    expect(root.getAttribute('aria-label')).toBe('#0000ff');
  });

  it('refuses when the value stops being a colour, so the caller rebuilds', () => {
    // Patching across that boundary would leave the previous row's colour
    // painted behind the new text.
    const { cell } = render('red');
    expect(colorRenderer.patch!(cell, context('n/a'))).toBe(false);
  });

  it('refuses when the value becomes a colour again', () => {
    const { cell } = render('n/a');
    expect(colorRenderer.patch!(cell, context('red'))).toBe(false);
  });

  it('refuses when the cell was rendered empty', () => {
    const { cell } = render(null);
    expect(colorRenderer.patch!(cell, context('red'))).toBe(false);
  });

  it('refuses when a label has to appear where there was none', () => {
    const { cell } = render('red', { textFormat: 'none' });
    expect(colorRenderer.patch!(cell, context('blue', { textFormat: 'hex' }))).toBe(false);
  });
});

describe('colorRenderer.toText — clipboard and filters see the cell', () => {
  const toText = (v: unknown, o: ColorRendererOptions = {}): string | null =>
    colorRenderer.toText!(v, o);

  it('defers for the default format, whose text is the raw value', () => {
    // Returning null lets the caller skip the per-cell call entirely.
    expect(toText('red')).toBeNull();
    expect(compileDisplayText(COLOR_COL)).not.toBeNull();
  });

  it('reports the normalised text so a filter matches what is on screen', () => {
    expect(toText('hsl(0, 100%, 50%)', { textFormat: 'hex' })).toBe('#ff0000');
    expect(toText('#ff0000', { textFormat: 'name' })).toBe('red');
    expect(toText('red', { textFormat: 'rgb' })).toBe('rgb(255, 0, 0)');
  });

  it('reports hex for a swatch-only column rather than nothing', () => {
    expect(toText('red', { textFormat: 'none' })).toBe('#ff0000');
  });

  it('defers for a value that is not a colour, so the raw text is kept', () => {
    expect(toText('n/a', { textFormat: 'hex' })).toBeNull();
  });

  it('threads the column\'s renderer params through the resolver', () => {
    const resolve = compileDisplayText({ ...COLOR_COL, rendererParams: { textFormat: 'hex' } });
    expect(resolve!('red')).toBe('#ff0000');
  });
});
