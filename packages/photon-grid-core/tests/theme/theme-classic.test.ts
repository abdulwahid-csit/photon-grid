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

  it('takes no icon opinion, so every glyph falls through to the core set', () => {
    expect(Object.keys(variantIconSets.classic)).toHaveLength(0);
  });
});

describe('classic changed no density', () => {
  it('ships the row height the grid already defaulted to', () => {
    // The point: making classic the default re-colours existing grids without
    // moving a single row.
    expect(THEME_VARIANT_ROW_HEIGHT.classic).toBe(DEFAULT_ROW_HEIGHT);
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

  it('uses the requested light chrome value', () => {
    expect(themeClassicCss).toContain('--pg-classic-chrome: #f8f9fa');
  });

  it('carries an explicit dark counterpart for that literal', () => {
    // Every other colour in the skin resolves a mode token and so is
    // mode-agnostic by construction. The chrome tint is a literal, which is
    // exactly why it needs a dark form — without one a dark grid renders
    // near-white chrome.
    expect(themeClassicCss).toContain('[data-pg-mode="dark"] .pg-classic-theme .pg-grid');
  });

  it('rules the header off from the data with a bottom border', () => {
    expect(themeClassicCss).toMatch(
      /\.pg-classic-theme \.pg-grid__header \{[^}]*border-bottom:[^}]*\}/,
    );
  });

  it('reaches portaled overlays, which sit outside the grid container', () => {
    // A menu appended to <body> is not a descendant of the container carrying
    // the variant class, so the skin needs the document-root selector too.
    expect(themeClassicCss).toContain('[data-pg-variant="classic"] .pg-context-menu');
  });
});
