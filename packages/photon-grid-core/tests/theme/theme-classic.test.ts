// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

import { themeClassicCss } from '../../src/styles/themes/theme-classic';
import { injectBaseStyles, removeBaseStyles } from '../../src/styles/base-styles';
import { variantIconSets } from '../../src/icons/icon-sets/variant-icon-sets';
import {
  DEFAULT_ROW_HEIGHT,
  DEFAULT_THEME_VARIANT,
  THEME_VARIANT_CLASS,
  THEME_VARIANT_ROW_HEIGHT,
  resolveVariantRowHeight,
} from '../../src/types/theme.types';

/**
 * Contract for the **classic** variant — the skin a grid gets when it names
 * none.
 *
 * Two things carry the weight:
 *
 * 1. **It is genuinely the default.** A variant that exists but is never applied
 *    is invisible, and the failure mode is silent: grids simply keep the old
 *    unskinned look. The registration is asserted at every layer that has to
 *    know about it.
 * 2. **Becoming the default changed no geometry.** Classic ships the row height
 *    the grid already used, so adopting it re-colours without re-flowing.
 */

beforeEach(() => { removeBaseStyles(); });

describe('classic is the default variant', () => {
  it('is what a grid naming no variant resolves to', () => {
    expect(DEFAULT_THEME_VARIANT).toBe('classic');
  });

  it('is registered at every layer that has to know a variant exists', () => {
    // A variant missing from any one of these is a runtime hole: no class to
    // select on, no density, or a `Record<ThemeVariant, …>` lookup returning
    // undefined.
    expect(THEME_VARIANT_CLASS.classic).toBe('pg-classic-theme');
    expect(THEME_VARIANT_ROW_HEIGHT.classic).toBeTypeOf('number');
    expect(variantIconSets.classic).toBeDefined();
  });

  it('keeps its icon pack partial, so every other glyph falls through to the core set', () => {
    // Classic overrides only where the default skin's reference point (AG Grid)
    // parts company with `coreIcons` — the sort arrows above all. Asserted as
    // "still a handful, and it has the arrows" rather than as an exact list, so
    // a deliberate addition does not fail here; see
    // `classic-header-indicators.test.ts` for the glyphs themselves.
    const names = Object.keys(variantIconSets.classic);
    expect(names).toContain('sortAsc');
    expect(names).toContain('sortDesc');
    expect(names.length).toBeLessThan(10);
  });
});

describe('classic carries Quartz’s density', () => {
  it('ships Quartz’s body row height, not the grid’s historical default', () => {
    // font-size + grid-size * 3.5 = 14 + 8 * 3.5. Density is part of matching
    // Quartz; the palette alone at 48px reads as a near-miss.
    expect(THEME_VARIANT_ROW_HEIGHT.classic).toBe(42);
    expect(THEME_VARIANT_ROW_HEIGHT.classic).not.toBe(DEFAULT_ROW_HEIGHT);
  });

  it('resolves an unspecified variant through the default', () => {
    expect(resolveVariantRowHeight(undefined, undefined)).toBe(THEME_VARIANT_ROW_HEIGHT.classic);
  });

  it('gives an explicitly unskinned grid the base height', () => {
    expect(resolveVariantRowHeight(undefined, 'none')).toBe(DEFAULT_ROW_HEIGHT);
  });

  it('still lets the host win, and other variants keep their own density', () => {
    expect(resolveVariantRowHeight(30, undefined)).toBe(30);
    expect(resolveVariantRowHeight(30, 'ion')).toBe(30);
    expect(resolveVariantRowHeight(undefined, 'ion')).toBe(THEME_VARIANT_ROW_HEIGHT.ion);
  });
});

describe('the classic stylesheet', () => {
  it('ships inside the base stylesheet, so no separate import is needed', () => {
    injectBaseStyles();
    const sheet = document.getElementById('photon-grid-base-styles');
    expect(sheet?.textContent ?? '').toContain('.pg-classic-theme');
  });

  it('is ordered before the other variants, so switching skins needs no extra specificity', () => {
    injectBaseStyles();
    const css = document.getElementById('photon-grid-base-styles')?.textContent ?? '';
    expect(css.indexOf('.pg-classic-theme')).toBeLessThan(css.indexOf('.pg-ion-theme'));
  });

  it('paints every structural band from one chrome variable', () => {
    // The regression this guards: a band is added or edited and quietly stops
    // matching the other seven. Header, filter row, footer, both scrollbar
    // surfaces, group rows and the toolbar/tool-panel token all read the same
    // variable, so they cannot drift.
    for (const token of [
      '--pg-colors-header-background: var(--pg-classic-chrome)',
      '--pg-colors-filter-background: var(--pg-classic-chrome)',
      '--pg-colors-footer-background: var(--pg-classic-chrome)',
      '--pg-colors-scrollbar-bg: var(--pg-classic-chrome)',
      '--pg-colors-scrollbar-track: var(--pg-classic-chrome)',
      '--pg-colors-group-row-background: var(--pg-classic-chrome)',
      '--pg-colors-group-footer-background: var(--pg-classic-chrome)',
      '--pg-colors-background-alt: var(--pg-classic-chrome)',
    ]) {
      expect(themeClassicCss).toContain(token);
    }
  });

  it('derives the whole palette from Quartz’s three literals', () => {
    // Quartz mixes its entire palette out of a background, a foreground and an
    // accent. Reproducing that construction — not just the output colours — is
    // what keeps the skin in tune when one value is re-pitched, and is why dark
    // mode only has to restate three declarations.
    expect(themeClassicCss).toContain('--pg-classic-bg: #fff');
    expect(themeClassicCss).toContain('--pg-classic-fg: #181d1f');
    expect(themeClassicCss).toContain('--pg-classic-accent: #2196f3');
  });

  it('uses Quartz’s own mix percentages for the two chrome planes', () => {
    // Header band 2% toward the foreground, floating menus 3%, menu borders 20%.
    expect(themeClassicCss).toContain(
      '--pg-classic-chrome: color-mix(in srgb, var(--pg-classic-bg), var(--pg-classic-fg) 2%)',
    );
    expect(themeClassicCss).toContain(
      '--pg-classic-menu: color-mix(in srgb, var(--pg-classic-bg), var(--pg-classic-fg) 3%)',
    );
    expect(themeClassicCss).toContain(
      '--pg-classic-menu-border: color-mix(in srgb, transparent, var(--pg-classic-fg) 20%)',
    );
  });

  it('uses Quartz’s three accent washes at their exact strengths', () => {
    // Selected 8%, hover 12%, range 20%.
    expect(themeClassicCss).toContain(
      '--pg-colors-primary-subtle: color-mix(in srgb, transparent, var(--pg-classic-accent) 8%)',
    );
    expect(themeClassicCss).toContain(
      '--pg-colors-primary-subtle-hover: color-mix(in srgb, transparent, var(--pg-classic-accent) 12%)',
    );
    expect(themeClassicCss).toContain(
      '--pg-colors-primary-soft: color-mix(in srgb, transparent, var(--pg-classic-accent) 20%)',
    );
  });

  it('separates the grid’s own radius from the radius of its controls', () => {
    // Quartz: 8px wrapper, 4px everything inside. Collapsing the two is what
    // makes a lookalike read as "not quite".
    expect(themeClassicCss).toContain('--pg-borders-radius-lg: 8px');
    expect(themeClassicCss).toContain('--pg-borders-radius-md: 4px');
  });

  it('ships Quartz’s type scale and header height', () => {
    expect(themeClassicCss).toContain('--pg-typography-font-size-md: 14px');
    expect(themeClassicCss).toContain('--pg-typography-header-font-weight: 500');
    // font-size + grid-size * 4.25 = 14 + 34.
    expect(themeClassicCss).toContain('--pg-header-row-height: 48px');
  });

  it('re-pitches dark mode from the literals rather than restating the palette', () => {
    // Quartz's dark ground is a desaturated navy, not neutral black, and the
    // chrome planes lift away from it instead of sinking into it.
    expect(themeClassicCss).toContain('[data-pg-mode="dark"] .pg-classic-theme .pg-grid');
    expect(themeClassicCss).toContain('--pg-classic-bg: color-mix(in srgb, #fff, #182230 97%)');
    expect(themeClassicCss).toContain('--pg-classic-fg: #fff');
    expect(themeClassicCss).toContain('--pg-classic-chrome: color-mix(in srgb, #fff, #182230 93%)');
  });

  it('adds no hover and no separator to header cells, as Quartz does not', () => {
    // A hover on the header *cell*, or a box-shadow separator between adjacent
    // ones, is the single most visible way this skin stops looking like Quartz.
    //
    // The header's own buttons are a different matter and must stay hoverable —
    // Quartz lights up the funnel and overflow controls, it just never washes
    // the cell behind them. So this matches .pg-th and its modifiers
    // (.pg-th--sortable) while allowing its elements (.pg-th__menu-btn).
    expect(themeClassicCss).not.toMatch(/\.pg-classic-theme \.pg-th(--[a-z-]+)?:hover/);
    expect(themeClassicCss).not.toContain('.pg-th + .pg-th');
  });

  it('rules the header off from the data with a bottom border', () => {
    expect(themeClassicCss).toMatch(
      /\.pg-classic-theme \.pg-grid__header \{[^}]*border-bottom:[^}]*\}/,
    );
  });

  it('reaches portaled overlays, which sit outside the grid container', () => {
    // A menu appended to the portal host is not a descendant of the container
    // carrying the variant class, so the skin needs the host-rooted selector too.
    expect(themeClassicCss).toContain('[data-pg-variant="classic"] .pg-context-menu');
  });

  it('paints every floating surface from the one menu plane', () => {
    // Quartz puts menus, popups, tool panels and the column chooser on a single
    // colour — that shared plane is what makes its overlays read as one system.
    // A surface missing here renders plain white against its siblings, which is
    // exactly the mismatch this skin exists to remove.
    const rule = themeClassicCss.match(
      /((?:\[data-pg-variant="classic"\][^,{]+,\s*|\.pg-classic-theme \.pg-[a-z-]+,\s*)+\.pg-classic-theme \.pg-import-menu) \{\s*background: var\(--pg-classic-menu\);/,
    );
    expect(rule).not.toBeNull();

    const surfaces = rule![1];
    for (const el of [
      '.pg-context-menu',
      // The row menu nests its fly-outs inside the menu rather than portaling
      // them, so they need naming separately — left out, they kept the base
      // stylesheet's plain surface and rendered white inside a tinted menu.
      '.pg-context-menu__sub',
      '.pg-col-ctx-menu',
      '.pg-col-ctx-menu__submenu',
      '.pg-actions-menu',
      '.pg-col-chooser',
      '.pg-dropdown-editor__panel',
      '.pg-long-text-overlay',
      '.pg-avatar-overlay',
      '.pg-toast',
      '.pg-filters-panel',
      '.pg-filter-panel',
    ]) {
      expect(surfaces).toContain(el);
    }
  });

  it('states every menu-anatomy rule for both menu implementations', () => {
    // The grid ships two menus with independently-grown item metrics, icon
    // muting and chevrons. Whatever classic says about one it must say about
    // the other, or they read as two different products side by side.
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ['.pg-context-menu__item', '.pg-col-ctx-menu__item'],
      ['.pg-context-menu__icon', '.pg-col-ctx-menu__item-icon'],
      ['.pg-context-menu__sep', '.pg-col-ctx-menu__separator'],
      ['.pg-context-menu__item--disabled', '.pg-col-ctx-menu__item--disabled'],
    ];
    for (const [row, column] of pairs) {
      expect(themeClassicCss).toContain(row);
      expect(themeClassicCss).toContain(column);
    }
  });

  it('states fly-out item type explicitly rather than letting it inherit', () => {
    // Both menus reuse the parent's item class inside their fly-outs, so without
    // a rule that names the fly-out container the submenu simply inherits the
    // parent menu's metrics and cannot be tuned at all. Asserting the rule
    // exists and sets a weight — not which weight — leaves the value a design
    // call while keeping the seam open.
    const flyout = themeClassicCss.match(
      /\[data-pg-variant="classic"\] \.pg-context-menu__sub \.pg-context-menu__item,\s*\[data-pg-variant="classic"\] \.pg-col-ctx-menu__submenu \.pg-col-ctx-menu__item \{([\s\S]*?)\}/,
    );
    expect(flyout).not.toBeNull();
    expect(flyout![1]).toMatch(/font-weight:\s*\d+/);
  });

  it('leaves cells to the active-cell indicator and never focus-rings them', () => {
    // CellSelectionEngine.moveActiveCell moves the active-cell class without
    // moving DOM focus, so focus stays on whichever cell was first clicked. A
    // .pg-cell:focus-visible rule therefore does not duplicate the indicator, it
    // strands one: the clicked cell keeps a ring for the whole arrow-key
    // navigation while the active ring moves away from it — two ringed cells,
    // one of them wrong. base/cells.css.ts sets outline:none on .pg-cell for the
    // same reason.
    expect(themeClassicCss).not.toMatch(/^\s*\.pg-classic-theme \.pg-cell:focus-visible/m);

    // The controls that have no other indicator must keep theirs.
    expect(themeClassicCss).toContain('.pg-classic-theme .pg-th:focus-visible');
    expect(themeClassicCss).toContain('.pg-classic-theme .pg-pagination__btn:focus-visible');
  });

  it('mutes menu icons by colour rather than opacity', () => {
    // Opacity fades a 16px glyph toward the menu plane and breaks up its
    // stroke; it also blocks the clean lift to the accent on hover. The column
    // menu's base rule mutes with opacity, so classic has to reset it to 1 in
    // the same block that introduces the colour.
    const iconRule = themeClassicCss.match(
      /\[data-pg-variant="classic"\] \.pg-context-menu__icon,[\s\S]*?\{([\s\S]*?)\}/,
    );
    expect(iconRule).not.toBeNull();
    expect(iconRule![0]).toContain('.pg-col-ctx-menu__item-icon');
    expect(iconRule![1]).toContain('opacity: 1');
    expect(iconRule![1]).toContain(
      'color: color-mix(in srgb, transparent, var(--pg-classic-fg) 62%)',
    );
  });

  it('lifts inputs off the menu plane onto the plain background', () => {
    // The column menu embeds filter controls. On the menu plane an input with
    // the same background reads as more chrome, not as something to type into.
    expect(themeClassicCss).toMatch(
      /\[data-pg-variant="classic"\] \.pg-col-ctx-menu select/,
    );
  });

  it('gives focused inputs Quartz’s accent border and 47% halo', () => {
    expect(themeClassicCss).toContain(
      'box-shadow: 0 0 0 3px color-mix(in srgb, transparent, var(--pg-colors-primary) 47%)',
    );
  });

  it('strengthens menu edges and separators, which the plane would otherwise swallow', () => {
    // --pg-colors-border is pitched to divide rows against the grid background;
    // on the raised menu plane it all but disappears.
    expect(themeClassicCss).toContain('border-color: var(--pg-classic-menu-border)');
    expect(themeClassicCss).toContain('background: var(--pg-classic-menu-border)');
  });
});
