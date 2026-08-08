import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  LONG_TEXT_TEXT_CLASS,
  LONG_TEXT_TOGGLE_ATTR,
  LONG_TEXT_VALUE_CLASS,
  longTextRenderer,
} from '../../../src/renderer/built-in/long-text';
import { cellRenderers } from '../../../src/renderer/built-in/registry';
import { coreIcons } from '../../../src/icons/icon-sets/core-icons';
import type { IconRenderer } from '../../../src/icons/icon-renderer';
import type {
  BuiltInRenderContext,
  LongTextRendererOptions,
} from '../../../src/types/built-in-renderer.types';
import type { ColumnDef } from '../../../src/types/column.types';

import { StubElement, elementsCreated, installDomStub, resetDomCounters } from '../dom-stub';

/**
 * Contract for the `longText` renderer.
 *
 * Two invariants carry the whole feature and are where a regression would hide:
 *
 * 1. **The cell holds the untruncated value.** Truncation is CSS. `GridCore`
 *    reads the panel's text straight out of the cell's DOM, so a renderer that
 *    ever shortened the text node would silently truncate the panel too — the
 *    one thing this renderer exists to prevent.
 * 2. **`patch` refuses whenever the cell's shape would change.** The toggle's
 *    presence is value-dependent (`minLength`), so a patch that only rewrote
 *    text would leave a cell wearing an affordance its value no longer earns.
 */

let teardown: () => void;

beforeEach(() => { teardown = installDomStub(); });
afterEach(() => { teardown(); });

const LONG =
  'Aliquam dapibus, lorem vel mattis aliquet, purus lorem tincidunt mauris, ' +
  'in blandit quam risus sed ipsum. Maecenas non felis venenatis, porta velit quis.';

/** An icon renderer that records what it was asked for. */
function stubIcons(): { icons: IconRenderer; asked: string[] } {
  const asked: string[] = [];
  const icons = {
    render: (name: string) => {
      asked.push(name);
      return new StubElement('svg');
    },
  } as unknown as IconRenderer;
  return { icons, asked };
}

function context(
  options: LongTextRendererOptions,
  value: unknown = LONG,
  icons: IconRenderer | null = null,
): { inner: StubElement; ctx: BuiltInRenderContext<LongTextRendererOptions> } {
  const inner = new StubElement('div');
  return {
    inner,
    ctx: {
      inner: inner as unknown as HTMLElement,
      value,
      rawValue: value,
      formattedValue: value === null || value === undefined ? '' : String(value),
      row: { notes: value },
      colDef: { colId: 'notes', field: 'notes', header: 'Notes', type: 'string' } as ColumnDef,
      rowIndex: 0,
      colIndex: 0,
      options,
      icons,
      locale: 'en-US',
      api: null,
    },
  };
}

function render(
  options: LongTextRendererOptions = {},
  value: unknown = LONG,
  icons: IconRenderer | null = null,
): StubElement {
  const { inner, ctx } = context(options, value, icons);
  longTextRenderer.render(ctx);
  return inner;
}

/**
 * Renders a value {@link render} cannot express.
 *
 * `undefined` is one of the empty values under test, and a default parameter
 * fires on an explicitly-passed `undefined` — so that case has to bypass the
 * defaults rather than go through them.
 */
function renderExact(options: LongTextRendererOptions, value: unknown): StubElement {
  const inner = new StubElement('div');
  longTextRenderer.render({
    ...context(options).ctx,
    inner: inner as unknown as HTMLElement,
    value,
    rawValue: value,
    formattedValue: value === null || value === undefined ? '' : String(value),
  });
  return inner;
}

describe('longText renderer — the cell', () => {
  it('is registered under its documented name', () => {
    expect(cellRenderers.get('longText')).toBe(longTextRenderer);
  });

  it('keeps the whole value in the DOM, however long it is', () => {
    // The invariant the panel depends on: truncation is CSS, so the text node
    // is complete and `GridCore` can read it back verbatim.
    const text = render().querySelector(`.${LONG_TEXT_TEXT_CLASS}`);
    expect(text?.textContent).toBe(LONG);
  });

  it('hangs everything off a value span the click handler can scope to', () => {
    const root = render().children[0];
    expect(root.classList.contains('pg-cell__value')).toBe(true);
    expect(root.classList.contains(LONG_TEXT_VALUE_CLASS)).toBe(true);
  });

  it('draws the toggle as a real button, out of the tab order', () => {
    // A styled <div> would mean reimplementing focus, Enter/Space activation and
    // the accessible role by hand. tabIndex -1 because the grid owns focus
    // through its roving cell model.
    const toggle = render().querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`);
    expect(toggle?.tagName).toBe('button');
    expect(toggle?.type).toBe('button');
    expect((toggle as unknown as { tabIndex: number }).tabIndex).toBe(-1);
  });

  it('announces the toggle as a dialog trigger, starting collapsed', () => {
    const toggle = render().querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`);
    expect(toggle?.getAttribute('aria-haspopup')).toBe('dialog');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
    expect(toggle?.getAttribute('aria-label')).toBe('Show full text');
  });

  it('takes its accessible name from the column when one is given', () => {
    const toggle = render({ toggleLabel: 'Read the full note' })
      .querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`);
    expect(toggle?.getAttribute('aria-label')).toBe('Read the full note');
  });

  it('carries the action, so one handler can serve several columns', () => {
    const toggle = render({ action: 'read-note' }).querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`);
    expect(toggle?.getAttribute(LONG_TEXT_TOGGLE_ATTR)).toBe('read-note');
  });

  it('resolves its icon through the registry rather than inlining SVG', () => {
    const { icons, asked } = stubIcons();
    render({}, LONG, icons);
    expect(asked).toEqual(['expandText']);
    // Registered, so a host can replace it like any other grid icon.
    expect(coreIcons['expandText']).toBeDefined();
  });

  it('takes an icon override', () => {
    const { icons, asked } = stubIcons();
    render({ icon: 'fullscreen' }, LONG, icons);
    expect(asked).toEqual(['fullscreen']);
  });

  it('renders without an icon renderer at all', () => {
    // The context's `icons` is nullable, and a cell that threw here would take
    // the whole row render down with it.
    const toggle = render({}, LONG, null).querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`);
    expect(toggle).not.toBeNull();
    expect(toggle?.children.length).toBe(0);
  });
});

describe('longText renderer — when the toggle appears', () => {
  it('appears for every non-empty value by default', () => {
    expect(render({}, 'hi').querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`)).not.toBeNull();
  });

  it('is suppressed below minLength', () => {
    // The documented stand-in for a measured overflow test, which would cost a
    // forced reflow per cell per render.
    expect(render({ minLength: 60 }, 'Short note').querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`))
      .toBeNull();
    expect(render({ minLength: 60 }, LONG).querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`))
      .not.toBeNull();
  });

  it('is suppressed outright by expandable: false', () => {
    expect(render({ expandable: false }).querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`)).toBeNull();
    // The text is still there — only the affordance is gone.
    expect(render({ expandable: false }).querySelector(`.${LONG_TEXT_TEXT_CLASS}`)?.textContent)
      .toBe(LONG);
  });

  it('carries the visibility mode as a class, so hover reveal stays in CSS', () => {
    const hover = render().querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`);
    expect(hover?.classList.contains('pg-long-text__toggle--hover')).toBe(true);

    const always = render({ toggle: 'always' }).querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`);
    expect(always?.classList.contains('pg-long-text__toggle--always')).toBe(true);
  });

  it('reserves the toggle\'s gutter only where a toggle is drawn', () => {
    // Held open whether or not the toggle is currently visible: padding the
    // text on hover would re-run the ellipsis and make the value twitch under
    // the cursor. A cell with no toggle gets the full width instead.
    expect(render().querySelector(`.${LONG_TEXT_TEXT_CLASS}`)
      ?.classList.contains('pg-long-text__text--inset')).toBe(true);
    expect(render({ expandable: false }).querySelector(`.${LONG_TEXT_TEXT_CLASS}`)
      ?.classList.contains('pg-long-text__text--inset')).toBe(false);
    expect(render({ minLength: 500 }).querySelector(`.${LONG_TEXT_TEXT_CLASS}`)
      ?.classList.contains('pg-long-text__text--inset')).toBe(false);
  });
});

describe('longText renderer — truncation and empties', () => {
  it('leaves a single-line cell alone — the ellipsis is the stylesheet\'s job', () => {
    const text = render().querySelector(`.${LONG_TEXT_TEXT_CLASS}`);
    expect(text?.classList.contains('pg-long-text__text--clamped')).toBe(false);
    expect(text?.style.getPropertyValue('--pg-cell-max-lines')).toBe('');
  });

  it('clamps through a custom property, not a rule per column', () => {
    const text = render({ maxLines: 3 }).querySelector(`.${LONG_TEXT_TEXT_CLASS}`);
    expect(text?.classList.contains('pg-long-text__text--clamped')).toBe(true);
    expect(text?.style.getPropertyValue('--pg-cell-max-lines')).toBe('3');
  });

  it('offers no native tooltip unless asked', () => {
    // The panel already serves that purpose, and a browser tooltip covering the
    // row on the way to the toggle fights it.
    expect(render().querySelector(`.${LONG_TEXT_TEXT_CLASS}`)?.title).toBe('');
    expect(render({ tooltip: true }).querySelector(`.${LONG_TEXT_TEXT_CLASS}`)?.title).toBe(LONG);
  });

  it('falls through to the shared empty state, with no toggle', () => {
    for (const empty of [null, undefined, '', '   ']) {
      const el = renderExact({ emptyText: '—' }, empty);
      expect(el.querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`)).toBeNull();
      expect(el.children[0].textContent).toBe('—');
    }
  });
});

describe('longText renderer — patching', () => {
  /** Renders into a `.pg-cell` → `.pg-cell__inner` pair, as the grid does. */
  function mount(options: LongTextRendererOptions, value: unknown = LONG): StubElement {
    const cell = new StubElement('div');
    const inner = new StubElement('div');
    cell.appendChild(inner);
    const ctx = context(options, value).ctx;
    longTextRenderer.render({ ...ctx, inner: inner as unknown as HTMLElement });
    return cell;
  }

  function patch(cell: StubElement, options: LongTextRendererOptions, value: unknown): boolean {
    return longTextRenderer.patch!(
      cell as unknown as HTMLElement,
      context(options, value).ctx,
    );
  }

  it('rewrites the text without allocating a single element', () => {
    const cell = mount({});
    // Built before the window opens — the context is the test's own scaffolding,
    // not something the patch path allocates.
    const next = context({}, `${LONG} Updated.`).ctx;

    resetDomCounters();
    const patched = longTextRenderer.patch!(cell as unknown as HTMLElement, next);

    expect(patched).toBe(true);
    expect(elementsCreated).toBe(0);
    expect(cell.querySelector(`.${LONG_TEXT_TEXT_CLASS}`)?.textContent).toBe(`${LONG} Updated.`);
  });

  it('keeps the same toggle element, and its ARIA state with it', () => {
    const cell = mount({});
    const before = cell.querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`);
    before?.setAttribute('aria-expanded', 'true');

    patch(cell, {}, 'A different, equally long-ish note about the shipment.');

    const after = cell.querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`);
    expect(after).toBe(before);
    // A rebuilt button would have reset this and stranded the open panel.
    expect(after?.getAttribute('aria-expanded')).toBe('true');
  });

  it('refuses when the value crosses the minLength threshold in either direction', () => {
    const gained = mount({ minLength: 60 }, 'Short');
    expect(patch(gained, { minLength: 60 }, LONG)).toBe(false);

    const lost = mount({ minLength: 60 }, LONG);
    expect(patch(lost, { minLength: 60 }, 'Short')).toBe(false);
  });

  it('refuses when the value empties out, whitespace included', () => {
    // The empty state is a plain text span with no toggle and no text element —
    // a different cell shape entirely.
    expect(patch(mount({}), {}, '')).toBe(false);
    expect(patch(mount({}), {}, '   ')).toBe(false);
    expect(patch(mount({}), {}, null)).toBe(false);
  });

  it('refuses a cell it did not render', () => {
    expect(patch(new StubElement('div'), {}, LONG)).toBe(false);
  });

  it('keeps the tooltip in step when the column asked for one', () => {
    const cell = mount({ tooltip: true });
    patch(cell, { tooltip: true }, 'Replacement note.');
    expect(cell.querySelector(`.${LONG_TEXT_TEXT_CLASS}`)?.title).toBe('Replacement note.');
  });
});
