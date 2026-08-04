import { describe, it, expect } from 'vitest';

import { IconRegistry } from '../../src/icons/icon-registry';
import { coreIcons } from '../../src/icons/icon-sets/core-icons';

/**
 * The layering contract: host overrides → active variant pack → core defaults.
 *
 * The precedence order is the part most likely to be broken by a later change,
 * because it is only correct in one place ({@link IconRegistry.get}) and every
 * other method has to agree with it.
 */
describe('IconRegistry layering', () => {
  const VARIANT_CHECK = '<svg data-src="variant"/>';
  const HOST_CHECK = '<svg data-src="host"/>';

  it('falls back to the core set when no variant or override is set', () => {
    const registry = new IconRegistry();
    expect(registry.get('check')).toBe(coreIcons.check);
  });

  it('lets a variant pack shadow the core set', () => {
    const registry = new IconRegistry();
    registry.setVariantIcons({ check: VARIANT_CHECK });

    expect(registry.get('check')).toBe(VARIANT_CHECK);
  });

  it('falls through to core for names the variant pack omits', () => {
    const registry = new IconRegistry();
    registry.setVariantIcons({ check: VARIANT_CHECK });

    // A pack is partial by design — this is what lets a variant ship ~25 icons.
    expect(registry.get('search')).toBe(coreIcons.search);
  });

  it('ranks host overrides above the variant pack', () => {
    const registry = new IconRegistry();
    registry.setVariantIcons({ check: VARIANT_CHECK });
    registry.register('check', HOST_CHECK);

    expect(registry.get('check')).toBe(HOST_CHECK);
  });

  it('keeps host overrides across a variant switch', () => {
    const registry = new IconRegistry();
    registry.register('check', HOST_CHECK);

    registry.setVariantIcons({ check: VARIANT_CHECK });
    expect(registry.get('check')).toBe(HOST_CHECK);

    // …and through a second switch, and through clearing the variant entirely.
    registry.setVariantIcons({ check: '<svg data-src="other"/>' });
    expect(registry.get('check')).toBe(HOST_CHECK);

    registry.setVariantIcons(null);
    expect(registry.get('check')).toBe(HOST_CHECK);
  });

  it('restores the core glyph when the variant layer is cleared', () => {
    const registry = new IconRegistry();
    registry.setVariantIcons({ check: VARIANT_CHECK });
    registry.setVariantIcons(null);

    expect(registry.get('check')).toBe(coreIcons.check);
  });

  it('replaces the variant layer wholesale rather than merging', () => {
    const registry = new IconRegistry();
    registry.setVariantIcons({ check: VARIANT_CHECK, search: '<svg data-src="v-search"/>' });
    registry.setVariantIcons({ check: VARIANT_CHECK });

    // `search` must not linger from the previous pack.
    expect(registry.get('search')).toBe(coreIcons.search);
  });

  it('applies GridOptions-style icons as host overrides, not base', () => {
    const registry = new IconRegistry({ icons: { check: HOST_CHECK } });
    registry.setVariantIcons({ check: VARIANT_CHECK });

    // Construction-time icons have to outrank variants too, or a host that
    // passed `GridOptions.icons` would lose them on the first theme switch.
    expect(registry.get('check')).toBe(HOST_CHECK);
  });

  it('reports has() and getNames() across every layer', () => {
    const registry = new IconRegistry();
    registry.setVariantIcons({ variantOnly: '<svg/>' });
    registry.register('hostOnly', '<svg/>');

    expect(registry.has('variantOnly')).toBe(true);
    expect(registry.has('hostOnly')).toBe(true);
    expect(registry.has('check')).toBe(true);
    expect(registry.has('nope')).toBe(false);

    const names = registry.getNames();
    expect(names).toContain('variantOnly');
    expect(names).toContain('hostOnly');
    expect(names).toContain('check');
    // Union, not concatenation — a name present in two layers appears once.
    expect(names.filter((n) => n === 'check')).toHaveLength(1);
  });

  it('flattens getAll() with the same precedence as get()', () => {
    const registry = new IconRegistry();
    registry.setVariantIcons({ check: VARIANT_CHECK, search: '<svg data-src="v-search"/>' });
    registry.register('check', HOST_CHECK);

    const all = registry.getAll();
    expect(all.get('check')).toBe(HOST_CHECK);
    expect(all.get('search')).toBe('<svg data-src="v-search"/>');
    expect(all.get('close')).toBe(coreIcons.close);
  });

  it('removes a name from every layer', () => {
    const registry = new IconRegistry();
    registry.setVariantIcons({ check: VARIANT_CHECK });
    registry.register('check', HOST_CHECK);

    registry.remove('check');

    expect(registry.get('check')).toBeUndefined();
    expect(registry.has('check')).toBe(false);
  });

  it('restores the base layer via loadCoreIcons after clear()', () => {
    const registry = new IconRegistry();
    registry.clear();
    expect(registry.get('check')).toBeUndefined();

    registry.loadCoreIcons();
    expect(registry.get('check')).toBe(coreIcons.check);
  });
});

/**
 * Every variant pack is consumed through `renderToString`, which injects
 * `width`/`height`/`style` right after `<svg`. HTML keeps the *first* of a
 * duplicate attribute, so a pack that declares its own would silently shadow the
 * size the grid asked for — and a hardcoded fill cannot follow the theme.
 */
describe('variant icon packs conform to the authoring rules', () => {
  const packs = {
    ion: () => import('../../src/icons/icon-sets/ion-icons').then((m) => m.ionIcons),
    neon: () => import('../../src/icons/icon-sets/neon-icons').then((m) => m.neonIcons),
    photon: () => import('../../src/icons/icon-sets/photon-icons').then((m) => m.photonIcons),
    quantum: () => import('../../src/icons/icon-sets/quantum-icons').then((m) => m.quantumIcons),
  };

  for (const [name, load] of Object.entries(packs)) {
    it(`${name}: root <svg> declares a viewBox and no width/height/style`, async () => {
      const pack = await load();
      for (const [icon, markup] of Object.entries(pack)) {
        const root = /<svg[^>]*>/.exec(markup)?.[0] ?? '';
        expect(root, `${name}/${icon} root tag`).toContain('viewBox');
        expect(root, `${name}/${icon} must not set width`).not.toMatch(/\swidth=/);
        expect(root, `${name}/${icon} must not set height`).not.toMatch(/\sheight=/);
        expect(root, `${name}/${icon} must not set style`).not.toMatch(/\sstyle=/);
      }
    });

    it(`${name}: paints only with currentColor`, async () => {
      const pack = await load();
      for (const [icon, markup] of Object.entries(pack)) {
        // Any literal colour — hex, rgb(), or a named colour on fill/stroke.
        expect(markup, `${name}/${icon} uses a hardcoded colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
        expect(markup, `${name}/${icon} uses rgb()`).not.toMatch(/rgba?\(/);
      }
    });

    it(`${name}: every name it defines is resolvable from the core set too`, async () => {
      const pack = await load();
      // A pack should only re-skin glyphs the grid actually asks for. A name
      // that exists nowhere else is almost certainly a typo.
      for (const icon of Object.keys(pack)) {
        expect(coreIcons, `${name}/${icon} is not a known icon name`).toHaveProperty(icon);
      }
    });
  }
});
