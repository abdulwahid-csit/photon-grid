// @vitest-environment jsdom

/**
 * Classic's header state indicators.
 *
 * Two decisions are pinned here, both about how the default skin says "this
 * column is sorted / filtered":
 *
 * 1. **The sort glyph is a bare arrow.** `coreIcons` draws direction as a
 *    GitHub Octicon — bars plus an arrow — which reads as a control. Classic is
 *    pitched against AG Grid, where a sorted column carries a single arrow: a
 *    direction, not a button.
 * 2. **Applied state is never a colour change.** The header label, the sort
 *    arrow and the funnel all keep their ordinary colour when a sort or filter
 *    is on. The base stylesheet accents all three, so classic has to override
 *    it — and that override only holds because the variant sheet is
 *    concatenated *after* the base one, which the last test locks down.
 */

import { describe, expect, it, afterEach } from 'vitest';

import { classicIcons } from '../../src/icons/icon-sets/classic-icons';
import { coreIcons } from '../../src/icons/icon-sets/core-icons';
import { variantIconSets } from '../../src/icons/icon-sets/variant-icon-sets';
import { themeClassicCss } from '../../src/styles/themes/theme-classic';
import { injectBaseStyles, removeBaseStyles } from '../../src/styles/base-styles';

/** Collapses whitespace so a rule can be matched regardless of formatting. */
const flat = (css: string): string => css.replace(/\s+/g, ' ');

const classicFlat = flat(themeClassicCss);

/**
 * The declaration block of the first rule whose selector list contains
 * `selector` — so an assertion is about one rule rather than about whatever
 * happens to sit between two landmarks in the file.
 */
function declarationsFor(selector: string): string {
  const at = classicFlat.indexOf(selector);
  if (at === -1) return '';
  const open = classicFlat.indexOf('{', at);
  const close = classicFlat.indexOf('}', open);
  if (open === -1 || close === -1) return '';
  return classicFlat.slice(open + 1, close).trim();
}

describe('classic sort icons', () => {
  it('is the pack the classic variant resolves', () => {
    expect(variantIconSets.classic).toBe(classicIcons);
  });

  it('stays a partial pack, so a new grid icon needs no classic redraw', () => {
    // Classic overrides only the handful of glyphs where the default skin's
    // reference point differs from the core set; every other name falls
    // through. Asserted as a proportion rather than an exact list so adding a
    // deliberate override does not fail this — only turning it into a fifth
    // full pack would.
    expect(Object.keys(classicIcons).length).toBeLessThan(Object.keys(coreIcons).length / 3);
  });

  it('overrides both sort directions', () => {
    expect(classicIcons.sortAsc).toBeDefined();
    expect(classicIcons.sortDesc).toBeDefined();
  });

  it('replaces the Octicon glyphs rather than repeating them', () => {
    expect(classicIcons.sortAsc).not.toBe(coreIcons.sortAsc);
    expect(classicIcons.sortDesc).not.toBe(coreIcons.sortDesc);
    // The bar-chart rungs are exactly what a plain arrow does away with.
    expect(classicIcons.sortAsc).not.toContain('octicon');
    expect(classicIcons.sortDesc).not.toContain('octicon');
  });

  it('draws each direction as a single stroked arrow path', () => {
    for (const svg of [classicIcons.sortAsc!, classicIcons.sortDesc!]) {
      expect(svg.match(/<path/g)).toHaveLength(1);
      expect(svg).toContain('stroke="currentColor"');
      // Recolourable: the CSS below decides the tone, the glyph never hard-codes it.
      expect(svg).not.toMatch(/fill="#|stroke="#/);
    }
  });

  it('shares the core chevrons’ geometry so the header reads as one family', () => {
    for (const svg of [classicIcons.sortAsc!, classicIcons.sortDesc!]) {
      expect(svg).toContain('viewBox="0 0 16 16"');
      expect(svg).toContain('stroke-width="1.5"');
      expect(svg).toContain('stroke-linecap="round"');
    }
  });

  it('points them in opposite directions', () => {
    // Ascending's arrowhead is drawn above its shaft, descending's below —
    // an easy pair to transpose, and silently wrong if they ever are.
    expect(classicIcons.sortAsc).toContain('M8 12.75V3.75');
    expect(classicIcons.sortDesc).toContain('M8 3.25v9');
  });

  it('leaves sortNone to fall through, since classic never paints it', () => {
    // The base sheet keeps the icon at opacity 0 until a column is sorted.
    expect(classicIcons.sortNone).toBeUndefined();
  });
});

describe('classic applied-state colour', () => {
  it('no longer accents a sorted column’s header text', () => {
    expect(classicFlat).not.toContain('.pg-classic-theme .pg-th--sorted { color: var(--pg-colors-primary)');
    expect(classicFlat).toContain('.pg-classic-theme .pg-th--sorted { color: var(--pg-colors-header-text); }');
  });

  it('keeps the sort arrow at the resting icon colour', () => {
    expect(classicFlat).toContain(
      '.pg-classic-theme .pg-th.pg-th--sort-asc .pg-th__sort-icon, '
      + '.pg-classic-theme .pg-th.pg-th--sort-desc .pg-th__sort-icon '
      + '{ color: var(--pg-colors-text-secondary); }',
    );
  });

  it('keeps a filtered column’s label at the header colour', () => {
    expect(classicFlat).toContain(
      '.pg-classic-theme .pg-th.pg-th--filter-active .pg-th__label { color: inherit; }',
    );
  });

  it('keeps both funnels at the resting icon colour', () => {
    expect(classicFlat).toContain(
      '.pg-classic-theme .pg-th__filter-btn--active, '
      + '.pg-classic-theme .pg-filter-cell__icon--active '
      + '{ color: var(--pg-colors-text-secondary); }',
    );
  });

  it('does not touch opacity, which is what keeps the indicators visible', () => {
    // Colour is the only thing these rules neutralise. Suppressing the opacity
    // the base rules set would hide the arrow altogether — and with the colour
    // gone, the glyph is now the *entire* signal that a sort is applied.
    for (const selector of [
      '.pg-classic-theme .pg-th--sorted',
      '.pg-classic-theme .pg-th.pg-th--sort-asc .pg-th__sort-icon',
      '.pg-classic-theme .pg-th.pg-th--filter-active .pg-th__label',
      '.pg-classic-theme .pg-th__filter-btn--active',
    ]) {
      const declarations = declarationsFor(selector);
      expect(declarations, selector).not.toBe('');
      expect(declarations, selector).toContain('color');
      expect(declarations, selector).not.toContain('opacity');
      expect(declarations, selector).not.toContain('display');
    }
  });
});

describe('classic header casing', () => {
  it('draws header labels as written rather than uppercased', () => {
    // The base sheet uppercases every .pg-th; Quartz — and this skin — does not.
    expect(classicFlat).toContain('.pg-classic-theme .pg-th { '
      + 'color: var(--pg-colors-header-text); '
      + 'font-size: var(--pg-typography-font-size-md); '
      + 'font-weight: var(--pg-typography-header-font-weight); '
      + 'letter-spacing: 0; '
      + 'text-transform: none; }');
  });

  it('does not force capitalize, which would mangle an authored header', () => {
    // "eBay ID" must stay "eBay ID". Title Case for the default comes from
    // ColumnModel deriving it that way, not from a transform in the theme.
    expect(classicFlat).not.toContain('text-transform: capitalize');
    expect(classicFlat).not.toContain('text-transform: uppercase');
  });

  it('out-specifies the base rule it has to beat', () => {
    // `.pg-classic-theme .pg-th` (0,2,0) over `.pg-th` (0,1,0) — this one does
    // not lean on source order, so the assertion is about specificity alone.
    expect(classicFlat).toContain('.pg-classic-theme .pg-th {');
  });
});

describe('override order', () => {  afterEach(() => { removeBaseStyles(); });

  it('places the classic sheet after the base rules it overrides', () => {
    // These overrides tie with the base rules on specificity and win purely on
    // source order. If the concatenation in `base-styles.ts` were ever
    // reordered, the accent would come back with nothing else failing.
    injectBaseStyles();
    const css = document.getElementById('photon-grid-base-styles')?.textContent ?? '';
    expect(css).not.toBe('');

    const baseRule = css.indexOf('.pg-th.pg-th--sort-asc .pg-th__sort-icon');
    const classicRule = css.indexOf('.pg-classic-theme .pg-th.pg-th--sort-asc .pg-th__sort-icon');
    expect(baseRule).toBeGreaterThan(-1);
    expect(classicRule).toBeGreaterThan(baseRule);

    const baseFilter = css.indexOf('.pg-th.pg-th--filter-active .pg-th__label');
    const classicFilter = css.indexOf('.pg-classic-theme .pg-th.pg-th--filter-active .pg-th__label');
    expect(baseFilter).toBeGreaterThan(-1);
    expect(classicFilter).toBeGreaterThan(baseFilter);
  });
});
