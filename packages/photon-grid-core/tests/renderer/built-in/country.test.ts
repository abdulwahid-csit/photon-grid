import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  clearCountryLookupCache,
  flagEmoji,
  flagImageUrl,
  getAllCountries,
  getCountry,
  normalizeCountry,
  registerCountries,
} from '../../../src/renderer/built-in/country/country-registry';
import { countryRenderer } from '../../../src/renderer/built-in/country/country';
import type { BuiltInRenderContext, CountryRendererOptions } from '../../../src/types/built-in-renderer.types';
import type { ColumnDef } from '../../../src/types/column.types';

import { installDomStub, StubElement } from '../dom-stub';

/**
 * Contract for the country renderer.
 *
 * The point of the feature is that it accepts what real data actually holds
 * rather than demanding a canonical form: this repo's own fixtures
 * (`examples/react/src/lib/employees.js`) store `USA` and `UK`, neither of which
 * is an ISO code or an ISO name. A country renderer that only understood
 * `alpha2` would fail on the most common values in the codebase.
 */

let teardown: () => void;

beforeEach(() => { teardown = installDomStub(); clearCountryLookupCache(); });
afterEach(() => { teardown(); });

function render(value: unknown, options: CountryRendererOptions = {}): StubElement {
  const inner = new StubElement('div');
  const ctx = {
    inner: inner as unknown as HTMLElement,
    value,
    rawValue: value,
    formattedValue: value === null || value === undefined ? '' : String(value),
    row: {},
    colDef: { colId: 'country', field: 'country', header: 'Country', type: 'string' } as ColumnDef,
    rowIndex: 0,
    colIndex: 0,
    options,
    icons: null,
    api: null,
  } satisfies BuiltInRenderContext<CountryRendererOptions>;
  countryRenderer.render(ctx);
  return inner;
}

/** Text of the rendered country name, ignoring the flag. */
function nameText(el: StubElement): string | undefined {
  return el.querySelector('.pg-cell-country__name')?.textContent;
}

/** `src` of the rendered flag image, or `undefined` when it is not an image. */
function flagSrc(el: StubElement): string | undefined {
  return el.querySelector('.pg-cell-flag__img')?.getAttribute('src') ?? undefined;
}

describe('normalizeCountry', () => {
  it('resolves ISO alpha-2 codes', () => {
    expect(normalizeCountry('US')?.name).toBe('United States');
    expect(normalizeCountry('PK')?.name).toBe('Pakistan');
    expect(normalizeCountry('DE')?.name).toBe('Germany');
  });

  it('resolves ISO alpha-3 codes', () => {
    expect(normalizeCountry('USA')?.alpha2).toBe('US');
    expect(normalizeCountry('GBR')?.alpha2).toBe('GB');
    expect(normalizeCountry('PAK')?.alpha2).toBe('PK');
  });

  it('resolves full country names', () => {
    expect(normalizeCountry('United States')?.alpha2).toBe('US');
    expect(normalizeCountry('Pakistan')?.alpha2).toBe('PK');
    expect(normalizeCountry('Germany')?.alpha2).toBe('DE');
  });

  it('resolves the informal names real data uses', () => {
    // `USA` is also a valid alpha-3, so it resolves either way; `UK` is
    // neither a code nor a name and only works because of the alias table.
    expect(normalizeCountry('USA')?.alpha2).toBe('US');
    expect(normalizeCountry('UK')?.alpha2).toBe('GB');
    expect(normalizeCountry('UAE')?.alpha2).toBe('AE');
    expect(normalizeCountry('Holland')?.alpha2).toBe('NL');
    expect(normalizeCountry('Czech Republic')?.alpha2).toBe('CZ');
    expect(normalizeCountry('South Korea')?.alpha2).toBe('KR');
  });

  it('ignores case, spacing, punctuation and accents', () => {
    expect(normalizeCountry('  united states  ')?.alpha2).toBe('US');
    expect(normalizeCountry('UNITED-STATES')?.alpha2).toBe('US');
    expect(normalizeCountry('us')?.alpha2).toBe('US');
    // The canonical spelling carries an accent; data very often does not.
    expect(normalizeCountry("Cote d'Ivoire")?.alpha2).toBe('CI');
    expect(normalizeCountry('Côte d’Ivoire')?.alpha2).toBe('CI');
  });

  it('returns null for empty and unresolvable values, never throws', () => {
    expect(normalizeCountry(null)).toBeNull();
    expect(normalizeCountry(undefined)).toBeNull();
    expect(normalizeCountry('')).toBeNull();
    expect(normalizeCountry('   ')).toBeNull();
    expect(normalizeCountry('Atlantis')).toBeNull();
    expect(normalizeCountry(42)).toBeNull();
    expect(normalizeCountry({})).toBeNull();
  });

  it('accepts an object that carries its own code', () => {
    expect(normalizeCountry({ alpha2: 'FR' })?.name).toBe('France');
    expect(normalizeCountry({ alpha3: 'FRA' })?.name).toBe('France');
    expect(normalizeCountry({ name: 'France' })?.alpha2).toBe('FR');
  });

  it('returns the identical entry for a repeated value, so the memo is doing its job', () => {
    // A country column repeats the same handful of values across thousands of
    // rows; resolving each one once is the whole reason the cache exists.
    const first = normalizeCountry('United States');
    const second = normalizeCountry('United States');
    expect(second).toBe(first);
  });

  it('caches misses too, since an unresolvable value usually recurs on every row', () => {
    expect(normalizeCountry('Atlantis')).toBeNull();
    expect(normalizeCountry('Atlantis')).toBeNull();
  });
});

describe('registerCountries', () => {
  it('adds an entry and makes it resolvable by every form', () => {
    registerCountries([{ alpha2: 'XX', alpha3: 'XXX', name: 'Testland' }]);
    expect(normalizeCountry('XX')?.name).toBe('Testland');
    expect(normalizeCountry('XXX')?.name).toBe('Testland');
    expect(normalizeCountry('Testland')?.alpha2).toBe('XX');
  });

  it('overrides a shipped entry, so an app can correct or localise a name', () => {
    registerCountries([{ alpha2: 'DE', alpha3: 'DEU', name: 'Deutschland' }]);
    expect(normalizeCountry('DE')?.name).toBe('Deutschland');
    expect(normalizeCountry('Deutschland')?.alpha2).toBe('DE');
    // Restore, since the table is module state shared across tests.
    registerCountries([{ alpha2: 'DE', alpha3: 'DEU', name: 'Germany' }]);
  });
});

describe('getAllCountries', () => {
  it('exposes the whole table, so applications do not keep their own list', () => {
    const all = getAllCountries();
    expect(all.length).toBeGreaterThan(240);
    expect(all.some((c) => c.alpha2 === 'US')).toBe(true);
    expect(all.some((c) => c.alpha2 === 'PK')).toBe(true);
  });

  it('holds a well-formed entry for every country', () => {
    // The table is a packed string parsed positionally, so one stray separator
    // shifts every field in that row along and registers a nonsense entry —
    // a wrong answer rather than a missing one. This is the guard against that.
    for (const entry of getAllCountries()) {
      expect(entry.alpha2, entry.name).toHaveLength(2);
      expect(entry.alpha3, entry.name).toHaveLength(3);
      expect(entry.name, entry.alpha2).not.toContain('|');
      expect(entry.name.length, entry.alpha2).toBeGreaterThan(0);
    }
  });

  it('round-trips every entry through all three lookup forms', () => {
    // An entry that is in the list but not reachable by its own code or name
    // is worse than one that is missing: the picker offers it and the renderer
    // then fails to resolve it.
    for (const entry of getAllCountries()) {
      expect(normalizeCountry(entry.alpha2)?.alpha2, entry.alpha2).toBe(entry.alpha2);
      expect(normalizeCountry(entry.alpha3)?.alpha2, entry.alpha3).toBe(entry.alpha2);
      expect(normalizeCountry(entry.name)?.alpha2, entry.name).toBe(entry.alpha2);
    }
  });

  it('resolves every alias to a country that exists', () => {
    for (const alias of ['USA', 'UK', 'UAE', 'Holland', 'Czech Republic', 'Turkey', 'Burma', 'DRC']) {
      expect(normalizeCountry(alias), alias).not.toBeNull();
    }
  });
});

describe('flagImageUrl', () => {
  it('lower-cases the code, which is what flagcdn keys on', () => {
    expect(flagImageUrl('US')).toBe('https://flagcdn.com/24x18/us.png');
    expect(flagImageUrl('pk', 'w40')).toBe('https://flagcdn.com/w40/pk.png');
  });
});

describe('getCountry', () => {
  it('takes either code form and nothing else', () => {
    expect(getCountry('jp')?.name).toBe('Japan');
    expect(getCountry('JPN')?.name).toBe('Japan');
    expect(getCountry('Japan')).toBeUndefined();
  });
});

describe('flagEmoji', () => {
  it('derives the regional-indicator pair from an alpha-2 code', () => {
    expect(flagEmoji('US')).toBe('\u{1F1FA}\u{1F1F8}');
    expect(flagEmoji('pk')).toBe('\u{1F1F5}\u{1F1F0}');
  });

  it('returns empty for anything that is not two letters', () => {
    expect(flagEmoji('USA')).toBe('');
    expect(flagEmoji('')).toBe('');
  });
});

describe('countryRenderer', () => {
  it('renders a flagcdn image and the common name', () => {
    const el = render('US');
    // flagcdn keys off the lower-cased alpha-2, whatever form the cell held.
    expect(flagSrc(el)).toBe('https://flagcdn.com/24x18/us.png');
    expect(nameText(el)).toBe('United States');
  });

  it('resolves the image from the normalised code, not the raw value', () => {
    // All four of these are the same country written four ways.
    for (const value of ['GB', 'GBR', 'United Kingdom', 'UK']) {
      expect(flagSrc(render(value)), value).toBe('https://flagcdn.com/24x18/gb.png');
    }
  });

  it('reserves the image box so a column of flags does not reflow as they load', () => {
    const img = render('US').querySelector('.pg-cell-flag__img');
    expect(img?.getAttribute('width')).toBe('24');
    expect(img?.getAttribute('height')).toBe('18');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('takes a custom flag size, deriving the box from it', () => {
    expect(flagSrc(render('US', { flagSize: 'w40' }))).toBe('https://flagcdn.com/w40/us.png');
    const img = render('US', { flagSize: 'w40' }).querySelector('.pg-cell-flag__img');
    // flagcdn renders `wNNN` at 4:3.
    expect(img?.getAttribute('width')).toBe('40');
    expect(img?.getAttribute('height')).toBe('30');
  });

  it('repoints the image at a mirror through flagUrl', () => {
    expect(flagSrc(render('US', { flagUrl: (a) => `/assets/flags/${a}.svg` })))
      .toBe('/assets/flags/US.svg');
  });

  it('drops the network entirely with flagStyle emoji', () => {
    const el = render('US', { flagStyle: 'emoji' });
    expect(el.querySelector('.pg-cell-flag__img')).toBeNull();
    expect(el.querySelector('.pg-cell-flag')?.textContent).toBe('\u{1F1FA}\u{1F1F8}');
  });

  it('resolves an alias the same way it resolves a code', () => {
    expect(nameText(render('UK'))).toBe('United Kingdom');
    expect(nameText(render('GBR'))).toBe('United Kingdom');
    expect(nameText(render('GB'))).toBe('United Kingdom');
  });

  it('shows the original value when the country cannot be resolved', () => {
    // Never blank a cell: an unrecognised value is still information.
    const el = render('Atlantis');
    expect(el.textContent).toBe('Atlantis');
    expect(el.querySelector('.pg-cell-flag')).toBeNull();
  });

  it('uses a configured fallback instead of the raw value', () => {
    expect(render('Atlantis', { fallback: 'Unknown' }).textContent).toBe('Unknown');
  });

  it('accepts a fallback function', () => {
    const el = render('Atlantis', { fallback: (v) => `? ${String(v)}` });
    expect(el.textContent).toBe('? Atlantis');
  });

  it('renders nothing for an empty value', () => {
    expect(render(null).textContent).toBe('');
    expect(render('').textContent).toBe('');
  });

  it('honours showFlag and showName', () => {
    const nameOnly = render('US', { showFlag: false });
    expect(nameOnly.querySelector('.pg-cell-flag')).toBeNull();
    expect(nameText(nameOnly)).toBe('United States');

    const flagOnly = render('US', { showName: false });
    expect(flagOnly.querySelector('.pg-cell-flag')).not.toBeNull();
    expect(flagOnly.querySelector('.pg-cell-country__name')).toBeNull();
  });

  it('labels a flag-only cell for screen readers, and hides a redundant flag from them', () => {
    // With no name beside it the flag is the only identification, so it must
    // carry the label; with a name it would otherwise be announced twice.
    const flagOnly = render('US', { showName: false });
    expect(flagOnly.querySelector('.pg-cell-flag')?.getAttribute('aria-label')).toBe('United States');
    expect(flagOnly.querySelector('.pg-cell-flag__img')?.getAttribute('alt')).toBe('United States');

    const withName = render('US');
    expect(withName.querySelector('.pg-cell-flag')?.getAttribute('aria-hidden')).toBe('true');
    expect(withName.querySelector('.pg-cell-flag__img')?.getAttribute('alt')).toBe('');
  });

  it('switches the displayed name to either code form', () => {
    expect(nameText(render('United States', { nameFormat: 'alpha2' }))).toBe('US');
    expect(nameText(render('United States', { nameFormat: 'alpha3' }))).toBe('USA');
  });

  it('takes a custom flag element, for platforms with no flag emoji font', () => {
    const el = render('US', {
      flag: (entry) => {
        const img = new StubElement('img');
        img.setAttribute('src', `/flags/${entry.alpha2}.svg`);
        return img as unknown as HTMLElement;
      },
    });
    expect(el.querySelector('img')?.getAttribute('src')).toBe('/flags/US.svg');
  });

  it('is not text-patchable, since it emits elements', () => {
    expect(countryRenderer.textOnly).toBe(false);
  });
});
