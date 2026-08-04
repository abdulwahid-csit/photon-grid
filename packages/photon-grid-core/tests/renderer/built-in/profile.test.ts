import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { profileRenderer } from '../../../src/renderer/built-in/profile';
import { resolveDisplayRenderer } from '../../../src/renderer/renderer-resolver';
import type { IconRenderer } from '../../../src/icons/icon-renderer';
import type {
  BuiltInRenderContext,
  ProfileRendererOptions,
} from '../../../src/types/built-in-renderer.types';
import type { ColumnDef } from '../../../src/types/column.types';

import { StubElement, elementsCreated, installDomStub, resetDomCounters } from '../dom-stub';

/**
 * Contract for the `profile` renderer.
 *
 * Two things separate it from every other renderer and are where regressions
 * would hide:
 *
 * 1. **It reads sibling fields.** The cell it draws is assembled from parts the
 *    column itself does not point at, so `field`/`value` resolution per part —
 *    and the defaults when a part declares neither — is the feature.
 * 2. **It patches.** The cell holds an `<img>` the browser has fetched and
 *    decoded. `patch` must update the leaves in place and must refuse (rather
 *    than half-update) whenever the cell's shape changes.
 */

let teardown: () => void;

beforeEach(() => { teardown = installDomStub(); });
afterEach(() => { teardown(); });

/** A row shaped like the documented example. */
const ROW: Record<string, unknown> = {
  employee: 'e-1',
  avatar: 'https://cdn.example.com/a.png',
  name: 'Amara Okafor',
  department: 'Logistics',
};

function context(
  options: ProfileRendererOptions,
  row: Record<string, unknown> = ROW,
  value: unknown = row['employee'],
  icons: IconRenderer | null = null,
): { inner: StubElement; ctx: BuiltInRenderContext<ProfileRendererOptions> } {
  const inner = new StubElement('div');
  return {
    inner,
    ctx: {
      inner: inner as unknown as HTMLElement,
      value,
      rawValue: value,
      formattedValue: value === null || value === undefined ? '' : String(value),
      row,
      colDef: { colId: 'employee', field: 'employee', header: 'Employee', type: 'string' } as ColumnDef,
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
  options: ProfileRendererOptions,
  row?: Record<string, unknown>,
  value?: unknown,
  icons?: IconRenderer | null,
): StubElement {
  const { inner, ctx } = context(options, row, value ?? (row ?? ROW)['employee'], icons ?? null);
  profileRenderer.render(ctx);
  return inner;
}

/** The three-part configuration from the public example. */
const EXAMPLE: ProfileRendererOptions = {
  avatar: { field: 'avatar', shape: 'circle', size: 36 },
  title: { field: 'name' },
  subtitle: { field: 'department' },
};

describe('profile renderer — composition', () => {
  it('assembles the avatar, title and subtitle from three sibling fields', () => {
    const el = render(EXAMPLE);

    expect(el.children[0].classList.contains('pg-cell__value')).toBe(true);
    expect(el.querySelector('.pg-profile__image')?.getAttribute('src'))
      .toBe('https://cdn.example.com/a.png');
    expect(el.querySelector('.pg-profile__title')?.textContent).toBe('Amara Okafor');
    expect(el.querySelector('.pg-profile__subtitle')?.textContent).toBe('Logistics');
  });

  it('sizes the avatar through a custom property, not an inline width', () => {
    // A theme can restyle everything built on the property; an inline width
    // would be unreachable from a stylesheet.
    const root = render(EXAMPLE).querySelector('.pg-profile');
    expect(root?.style.getPropertyValue('--pg-profile-avatar-size')).toBe('36px');
    expect(root?.querySelector('.pg-profile__avatar')?.classList.contains('pg-profile__avatar--circle'))
      .toBe(true);
  });

  it('applies the requested shape', () => {
    const el = render({ ...EXAMPLE, avatar: { field: 'avatar', shape: 'rounded' } });
    expect(el.querySelector('.pg-profile__avatar')?.classList.contains('pg-profile__avatar--rounded'))
      .toBe(true);
  });

  it('leaves the avatar image decorative and lazily loaded', () => {
    // The title names the person immediately after; announcing it again per
    // image would make a screen reader read every row twice. Lazy loading keeps
    // a fast scroll from fetching pictures nobody sees.
    const img = render(EXAMPLE).querySelector('img');
    expect(img?.getAttribute('alt')).toBe('');
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(img?.getAttribute('decoding')).toBe('async');
  });

  it('takes an alt from the column when one is supplied', () => {
    const el = render({
      ...EXAMPLE,
      avatar: { field: 'avatar', alt: (row) => `Photo of ${String(row['name'])}` },
    });
    expect(el.querySelector('img')?.getAttribute('alt')).toBe('Photo of Amara Okafor');
  });

  it('resolves a part through a function when it has to be composed', () => {
    const el = render({
      title: { value: (row) => `${String(row['name'])} (${String(row['department'])})` },
    });
    expect(el.querySelector('.pg-profile__title')?.textContent).toBe('Amara Okafor (Logistics)');
  });

  it('reads a part through a dot path', () => {
    const el = render(
      { title: { field: 'manager.name' } },
      { manager: { name: 'Wei Zhang' } },
      null,
    );
    expect(el.querySelector('.pg-profile__title')?.textContent).toBe('Wei Zhang');
  });

  it("falls back to the column's own value for a part that names no source", () => {
    // What makes a bare `renderer: 'profile'` render something sensible.
    const el = render({}, { name: 'x' }, 'Ada Lovelace');
    expect(el.querySelector('.pg-profile__title')?.textContent).toBe('Ada Lovelace');
    expect(el.querySelector('.pg-profile__avatar')?.textContent).toBe('AL');
  });

  it("keeps the column's formatted value when a configured line names no source", () => {
    // `formattedValue` has already been through the column's `valueFormatter`;
    // re-deriving it from the raw value would silently discard that.
    const { inner, ctx } = context({ title: { maxLength: 6 } });
    profileRenderer.render({ ...ctx, value: 42, formattedValue: '$42.00 total' });
    expect(inner.querySelector('.pg-profile__title')?.textContent).toBe('$42.00…');
  });

  it('omits the subtitle element entirely when it resolves to nothing', () => {
    // Not an empty element: an empty line would still take vertical space and
    // push the title off-centre.
    const el = render({ ...EXAMPLE, subtitle: { field: 'missing' } });
    expect(el.querySelector('.pg-profile__subtitle')).toBeNull();
    expect(el.querySelector('.pg-profile__title')?.textContent).toBe('Amara Okafor');
  });

  it('truncates a line past maxLength and mirrors the text into a title', () => {
    const el = render({ title: { field: 'name', maxLength: 5 } });
    const title = el.querySelector('.pg-profile__title');
    expect(title?.textContent).toBe('Amara…');
    expect(title?.title).toBe('Amara…');
  });

  it('drops the tooltip when the column turns it off', () => {
    const el = render({ title: { field: 'name', tooltip: false } });
    expect(el.querySelector('.pg-profile__title')?.title).toBe('');
  });

  it('separates the lines in the inline layout', () => {
    const el = render({ ...EXAMPLE, layout: 'inline', separator: '—' });
    expect(el.querySelector('.pg-profile')?.classList.contains('pg-profile--inline')).toBe(true);
    const separator = el.querySelector('.pg-profile__separator');
    expect(separator?.textContent).toBe('—');
    // Punctuation between two spoken lines is noise read aloud.
    expect(separator?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('profile renderer — avatar fallbacks', () => {
  it('falls back to initials derived from the title, coloured per value', () => {
    // A user table is full of rows with no uploaded picture; a broken-image
    // icon on every one is worse than no avatar at all.
    const el = render(EXAMPLE, { ...ROW, avatar: null });
    const avatar = el.querySelector('.pg-profile__avatar');
    expect(avatar?.classList.contains('pg-profile__avatar--initials')).toBe(true);
    expect(avatar?.textContent).toBe('AO');
    expect(avatar?.style.getPropertyValue('--pg-profile-avatar-color')).not.toBe('');
    expect(el.querySelector('img')).toBeNull();
  });

  it('hides the initials from a screen reader, which the title already names', () => {
    const el = render(EXAMPLE, { ...ROW, avatar: null });
    expect(el.querySelector('.pg-profile__avatar')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('gives the same name the same colour on every render', () => {
    const first = render(EXAMPLE, { ...ROW, avatar: null });
    const second = render(EXAMPLE, { ...ROW, avatar: null });
    expect(first.querySelector('.pg-profile__avatar')?.style.getPropertyValue('--pg-profile-avatar-color'))
      .toBe(second.querySelector('.pg-profile__avatar')?.style.getPropertyValue('--pg-profile-avatar-color'));
  });

  it('honours an explicit colour over the derived one', () => {
    const el = render({
      ...EXAMPLE,
      avatar: { field: 'missing', color: () => '#123456' },
    });
    expect(el.querySelector('.pg-profile__avatar')?.style.getPropertyValue('--pg-profile-avatar-color'))
      .toBe('#123456');
  });

  it('draws an icon when asked, and degrades to initials without an icon renderer', () => {
    const icons = { render: () => new StubElement('svg') } as unknown as IconRenderer;
    const withIcons = render(
      { ...EXAMPLE, avatar: { field: 'missing', fallback: 'icon', icon: 'info' } },
      undefined,
      undefined,
      icons,
    );
    expect(withIcons.querySelector('.pg-profile__avatar')?.classList.contains('pg-profile__avatar--icon'))
      .toBe(true);

    // No icon renderer available: a hole where the avatar should be would be
    // worse than the initials the renderer can always draw.
    const withoutIcons = render({
      ...EXAMPLE,
      avatar: { field: 'missing', fallback: 'icon', icon: 'info' },
    });
    expect(withoutIcons.querySelector('.pg-profile__avatar')?.textContent).toBe('AO');
  });

  it('drops the avatar entirely on request', () => {
    expect(render({ ...EXAMPLE, showAvatar: false }).querySelector('.pg-profile__avatar')).toBeNull();
    expect(
      render({ ...EXAMPLE, avatar: { field: 'missing', fallback: 'none' } })
        .querySelector('.pg-profile__avatar'),
    ).toBeNull();
  });

  it('keeps an empty cell occupied so the row stays aligned', () => {
    const el = render({ ...EXAMPLE, emptyText: '—' }, {}, null);
    expect(el.children).toHaveLength(1);
    expect(el.children[0].textContent).toBe('—');
    expect(el.querySelector('.pg-profile')).toBeNull();
  });
});

describe('profile renderer — patching', () => {
  /** Renders into a `.pg-cell` → `.pg-cell__inner` pair, as the grid does. */
  function mount(options: ProfileRendererOptions, row: Record<string, unknown>): StubElement {
    const cell = new StubElement('div');
    const inner = new StubElement('div');
    cell.appendChild(inner);
    const ctx = context(options, row).ctx;
    profileRenderer.render({ ...ctx, inner: inner as unknown as HTMLElement });
    return cell;
  }

  function patch(
    cell: StubElement,
    options: ProfileRendererOptions,
    row: Record<string, unknown>,
  ): boolean {
    const ctx = context(options, row).ctx;
    return profileRenderer.patch!(cell as unknown as HTMLElement, ctx);
  }

  it('updates both lines in place without allocating a single element', () => {
    const cell = mount(EXAMPLE, ROW);
    // Built before the window opens — the context is the test's own scaffolding,
    // not something the patch path allocates.
    const next = context(EXAMPLE, { ...ROW, name: 'Wei Zhang', department: 'Finance' }).ctx;

    resetDomCounters();
    const patched = profileRenderer.patch!(cell as unknown as HTMLElement, next);

    expect(patched).toBe(true);
    // The whole point of the hook: a rebuild would allocate five nodes and
    // throw away an image the browser has already decoded.
    expect(elementsCreated).toBe(0);
    expect(cell.querySelector('.pg-profile__title')?.textContent).toBe('Wei Zhang');
    expect(cell.querySelector('.pg-profile__subtitle')?.textContent).toBe('Finance');
  });

  it('keeps the same <img> element and only swaps its src', () => {
    const cell = mount(EXAMPLE, ROW);
    const before = cell.querySelector('img');

    patch(cell, EXAMPLE, { ...ROW, avatar: 'https://cdn.example.com/b.png' });

    expect(cell.querySelector('img')).toBe(before);
    expect(before?.getAttribute('src')).toBe('https://cdn.example.com/b.png');
  });

  it('leaves an unchanged src untouched, so nothing re-decodes', () => {
    const cell = mount(EXAMPLE, ROW);
    const img = cell.querySelector('img');
    img?.setAttribute('src', 'https://cdn.example.com/a.png');

    patch(cell, EXAMPLE, { ...ROW, name: 'Wei Zhang' });

    expect(img?.getAttribute('src')).toBe('https://cdn.example.com/a.png');
  });

  it('refuses when the avatar changes form, so the caller rebuilds', () => {
    // Initials are not an <img>; half-updating would leave a picture showing a
    // person the row no longer describes.
    const cell = mount(EXAMPLE, ROW);
    expect(patch(cell, EXAMPLE, { ...ROW, avatar: null })).toBe(false);
  });

  it('refuses when a subtitle appears or disappears', () => {
    const withSubtitle = mount(EXAMPLE, ROW);
    expect(patch(withSubtitle, EXAMPLE, { ...ROW, department: '' })).toBe(false);

    const withoutSubtitle = mount(EXAMPLE, { ...ROW, department: '' });
    expect(patch(withoutSubtitle, EXAMPLE, ROW)).toBe(false);
  });

  it('refuses a cell it never rendered', () => {
    expect(patch(new StubElement('div'), EXAMPLE, ROW)).toBe(false);
  });

  it('re-colours the initials when the name behind them changes', () => {
    const cell = mount(EXAMPLE, { ...ROW, avatar: null });
    const avatar = cell.querySelector('.pg-profile__avatar');
    const before = avatar?.style.getPropertyValue('--pg-profile-avatar-color');

    expect(patch(cell, EXAMPLE, { ...ROW, avatar: null, name: 'Wei Zhang' })).toBe(true);
    expect(avatar?.textContent).toBe('WZ');
    expect(avatar?.style.getPropertyValue('--pg-profile-avatar-color')).not.toBe(before);
  });
});

describe('rendererParams', () => {
  function col(overrides: Partial<ColumnDef>): ColumnDef {
    return { colId: 'employee', field: 'employee', header: 'Employee', type: 'string', ...overrides } as ColumnDef;
  }

  it('configures a renderer named as a string', () => {
    const resolved = resolveDisplayRenderer(col({ renderer: 'profile', rendererParams: EXAMPLE }));
    expect(resolved.builtIn?.name).toBe('profile');
    expect(resolved.options).toBe(EXAMPLE);
    expect(resolved.textOnly).toBe(false);
  });

  it('configures the renderer inferred from the column type', () => {
    const resolved = resolveDisplayRenderer(col({ type: 'number', rendererParams: { maximumFractionDigits: 1 } }));
    expect(resolved.builtIn?.name).toBe('number');
    expect(resolved.options).toEqual({ maximumFractionDigits: 1 });
  });

  it('lets a spec\'s own options win key by key, dropping neither', () => {
    const resolved = resolveDisplayRenderer(col({
      renderer: { name: 'profile', options: { title: { field: 'fullName' } } },
      rendererParams: EXAMPLE,
    }));
    expect(resolved.options).toEqual({ ...EXAMPLE, title: { field: 'fullName' } });
  });

  it('allocates nothing when only one of the two forms is present', () => {
    // Runs once per cell build; a merge per cell would be a per-row allocation
    // for no gain.
    const params = { maxLength: 4 };
    expect(resolveDisplayRenderer(col({ renderer: 'text', rendererParams: params })).options)
      .toBe(params);
  });

  it('is ignored by a column rendering through its own function', () => {
    const resolved = resolveDisplayRenderer(col({
      renderer: () => '<b>x</b>',
      rendererParams: EXAMPLE,
    }));
    expect(resolved.kind).toBe('custom');
    expect(resolved.options).toEqual({});
  });
});
