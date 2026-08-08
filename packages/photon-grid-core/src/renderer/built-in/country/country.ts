import type {
  BuiltInRendererDefinition,
  CountryEntry,
  CountryRendererOptions,
} from '../../../types/built-in-renderer.types';
import { renderIfEmpty, valueSpan } from '../shared';
import { DEFAULT_FLAG_SIZE, flagEmoji, flagImageUrl, normalizeCountry } from './country-registry';

/** Picks the text shown beside the flag. */
function displayName(entry: CountryEntry, format: CountryRendererOptions['nameFormat']): string {
  if (format === 'alpha2') return entry.alpha2;
  if (format === 'alpha3') return entry.alpha3;
  return entry.name;
}

/**
 * Parses a flagcdn size segment into pixel dimensions.
 *
 * The dimensions go on the `<img>` so the row reserves the flag's box before
 * the image arrives — without them a column of flags reflows once per image as
 * they load in. `WxH` gives both; a `wNNN` segment gives a width, and flagcdn
 * renders those at 4:3.
 */
function flagBox(size: string): { width: number; height: number } | null {
  const explicit = /^(\d+)x(\d+)$/.exec(size);
  if (explicit) return { width: Number(explicit[1]), height: Number(explicit[2]) };

  const widthOnly = /^w(\d+)$/.exec(size);
  if (widthOnly) {
    const width = Number(widthOnly[1]);
    return { width, height: Math.round((width * 3) / 4) };
  }
  return null;
}

/** Builds the flag element for one country. */
function buildFlag(entry: CountryEntry, options: CountryRendererOptions): HTMLElement {
  const el = document.createElement('span');
  el.className = 'pg-cell-flag';

  // The flag repeats the name that follows it, so it is decorative to a screen
  // reader; when the name is hidden the flag has to carry the label instead.
  const labelled = options.showName === false;
  if (labelled) el.setAttribute('aria-label', entry.name);
  else el.setAttribute('aria-hidden', 'true');

  if (options.flag) {
    const custom = options.flag(entry);
    if (typeof custom === 'string') el.innerHTML = custom;
    else el.appendChild(custom);
    return el;
  }

  if (options.flagStyle === 'emoji') {
    el.classList.add('pg-cell-flag--emoji');
    el.textContent = flagEmoji(entry.alpha2);
    return el;
  }

  const size = options.flagSize ?? DEFAULT_FLAG_SIZE;
  const img = document.createElement('img');
  img.className = 'pg-cell-flag__img';
  img.setAttribute(
    'src',
    options.flagUrl?.(entry.alpha2, entry) ?? flagImageUrl(entry.alpha2, size),
  );
  // Empty unless the flag is the only thing identifying the cell — otherwise a
  // screen reader announces the country twice, once for the image and once for
  // the name sitting right beside it.
  img.setAttribute('alt', labelled ? entry.name : '');
  // Flags are a decorative repeat of text already on screen, so fetching a few
  // hundred of them must never delay anything the user is waiting for.
  img.setAttribute('loading', 'lazy');
  img.setAttribute('decoding', 'async');

  const box = flagBox(size);
  if (box) {
    img.setAttribute('width', String(box.width));
    img.setAttribute('height', String(box.height));
  }

  el.appendChild(img);
  return el;
}

/**
 * Country flag and name.
 *
 * Accepts whatever the data actually holds — an ISO alpha-2 code, an alpha-3
 * code, a full name, or a common alias like `USA` or `UK` — and normalises it
 * against the core's country table before drawing. Resolution is memoised per
 * distinct raw value, so a column of 100 000 rows drawn from a dozen countries
 * does a dozen lookups.
 *
 * The flag is an image from flagcdn keyed on the resolved alpha-2 code, so it
 * looks the same on every platform. The *lookup* never leaves the bundle — only
 * the picture is fetched — and `flagUrl` repoints it at a mirror while
 * `flagStyle: 'emoji'` drops the network entirely.
 *
 * An unresolvable value is never an error and never an empty cell: the original
 * text is shown, or `options.fallback` when the author would rather say
 * something else. A country column fed a typo should still be readable.
 */
export const countryRenderer: BuiltInRendererDefinition<CountryRendererOptions> = {
  name: 'country',
  textOnly: false,
  /**
   * The country as text — which is what the cell shows, not the code the data
   * happens to store.
   *
   * A country column's whole point is that `"US"`, `"USA"` and `"United States"`
   * all render the same; without this, copying such a cell yielded whichever raw
   * form that row stored, and filtering matched against it instead of against
   * the name on screen.
   *
   * A flag-only column (`showName: false`) still reports the full name: it is
   * the cell's accessible label already (see `buildFlag`), and "nothing" is not
   * a useful thing to copy or filter by.
   */
  toText(value, options) {
    const entry = normalizeCountry(value);
    // Unresolvable — the cell falls back to the raw text, so the caller should
    // too rather than being told the name is empty.
    if (!entry) return null;
    return options.showName === false ? entry.name : displayName(entry, options.nameFormat);
  },
  render(ctx) {
    if (renderIfEmpty(ctx)) return;

    const { options } = ctx;
    const entry = normalizeCountry(ctx.value);
    const span = valueSpan('country', options.cssClass);

    if (!entry) {
      // Unrecognised. Show what the author put in the cell rather than blanking
      // it — the value is still information, it just is not a country we know.
      if (typeof options.fallback === 'function') {
        const out = options.fallback(ctx.value);
        if (typeof out === 'string') span.innerHTML = out;
        else span.appendChild(out);
      } else {
        const text = options.fallback ?? ctx.formattedValue;
        span.textContent = text;
        span.title = text;
      }
      ctx.inner.appendChild(span);
      return;
    }

    if (options.showFlag !== false) span.appendChild(buildFlag(entry, options));

    if (options.showName !== false) {
      const label = document.createElement('span');
      label.className = 'pg-cell-country__name';
      label.textContent = displayName(entry, options.nameFormat);
      span.appendChild(label);
    }

    // Always the full name, whatever is displayed — an alpha-2 column is only
    // scannable if hovering tells you what the code means.
    span.title = entry.name;
    ctx.inner.appendChild(span);
  },
};
