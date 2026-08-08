import type { CountryEntry } from '../../../types/built-in-renderer.types';

/**
 * ISO 3166-1 country lookup, and the normalisation that makes real-world data
 * resolve against it.
 *
 * ### Why a packed string
 * The 249 entries live in one delimited constant rather than 249 object
 * literals. It is roughly a third of the bytes in the bundle, and it costs
 * nothing at runtime because it is only split when a country column is first
 * rendered — a grid with no country column never touches it.
 *
 * ### No network
 * Everything resolves against this table. There is no fetch, no CDN and no
 * `Intl.DisplayNames` dependency, so lookups are synchronous and identical in
 * every environment (including the Node test runner, where `Intl` region data
 * is not guaranteed to be present).
 *
 * @packageDocumentation
 */

/**
 * `alpha2|alpha3|name` triples, `;`-separated.
 *
 * Names are the common English forms people actually type and read, not the
 * ISO short names — "South Korea" rather than "Korea, Republic of". The formal
 * variants are reachable through {@link COUNTRY_ALIASES}.
 */
const COUNTRY_TABLE =
  'AF|AFG|Afghanistan;AX|ALA|Åland Islands;AL|ALB|Albania;DZ|DZA|Algeria;AS|ASM|American Samoa;' +
  'AD|AND|Andorra;AO|AGO|Angola;AI|AIA|Anguilla;AQ|ATA|Antarctica;AG|ATG|Antigua and Barbuda;' +
  'AR|ARG|Argentina;AM|ARM|Armenia;AW|ABW|Aruba;AU|AUS|Australia;AT|AUT|Austria;AZ|AZE|Azerbaijan;' +
  'BS|BHS|Bahamas;BH|BHR|Bahrain;BD|BGD|Bangladesh;BB|BRB|Barbados;BY|BLR|Belarus;BE|BEL|Belgium;' +
  'BZ|BLZ|Belize;BJ|BEN|Benin;BM|BMU|Bermuda;BT|BTN|Bhutan;BO|BOL|Bolivia;BQ|BES|Caribbean Netherlands;' +
  'BA|BIH|Bosnia and Herzegovina;BW|BWA|Botswana;BV|BVT|Bouvet Island;BR|BRA|Brazil;' +
  'IO|IOT|British Indian Ocean Territory;BN|BRN|Brunei;BG|BGR|Bulgaria;BF|BFA|Burkina Faso;' +
  'BI|BDI|Burundi;CV|CPV|Cape Verde;KH|KHM|Cambodia;CM|CMR|Cameroon;CA|CAN|Canada;' +
  'KY|CYM|Cayman Islands;CF|CAF|Central African Republic;TD|TCD|Chad;CL|CHL|Chile;CN|CHN|China;' +
  'CX|CXR|Christmas Island;CC|CCK|Cocos Islands;CO|COL|Colombia;KM|COM|Comoros;CG|COG|Republic of the Congo;' +
  'CD|COD|Democratic Republic of the Congo;CK|COK|Cook Islands;CR|CRI|Costa Rica;CI|CIV|Côte d’Ivoire;' +
  'HR|HRV|Croatia;CU|CUB|Cuba;CW|CUW|Curaçao;CY|CYP|Cyprus;CZ|CZE|Czechia;DK|DNK|Denmark;' +
  'DJ|DJI|Djibouti;DM|DMA|Dominica;DO|DOM|Dominican Republic;EC|ECU|Ecuador;EG|EGY|Egypt;' +
  'SV|SLV|El Salvador;GQ|GNQ|Equatorial Guinea;ER|ERI|Eritrea;EE|EST|Estonia;SZ|SWZ|Eswatini;' +
  'ET|ETH|Ethiopia;FK|FLK|Falkland Islands;FO|FRO|Faroe Islands;FJ|FJI|Fiji;FI|FIN|Finland;' +
  'FR|FRA|France;GF|GUF|French Guiana;PF|PYF|French Polynesia;TF|ATF|French Southern Territories;' +
  'GA|GAB|Gabon;GM|GMB|Gambia;GE|GEO|Georgia;DE|DEU|Germany;GH|GHA|Ghana;GI|GIB|Gibraltar;' +
  'GR|GRC|Greece;GL|GRL|Greenland;GD|GRD|Grenada;GP|GLP|Guadeloupe;GU|GUM|Guam;GT|GTM|Guatemala;' +
  'GG|GGY|Guernsey;GN|GIN|Guinea;GW|GNB|Guinea-Bissau;GY|GUY|Guyana;HT|HTI|Haiti;' +
  'HM|HMD|Heard Island and McDonald Islands;VA|VAT|Vatican City;HN|HND|Honduras;HK|HKG|Hong Kong;' +
  'HU|HUN|Hungary;IS|ISL|Iceland;IN|IND|India;ID|IDN|Indonesia;IR|IRN|Iran;IQ|IRQ|Iraq;' +
  'IE|IRL|Ireland;IM|IMN|Isle of Man;IL|ISR|Israel;IT|ITA|Italy;JM|JAM|Jamaica;JP|JPN|Japan;' +
  'JE|JEY|Jersey;JO|JOR|Jordan;KZ|KAZ|Kazakhstan;KE|KEN|Kenya;KI|KIR|Kiribati;KP|PRK|North Korea;' +
  'KR|KOR|South Korea;KW|KWT|Kuwait;KG|KGZ|Kyrgyzstan;LA|LAO|Laos;LV|LVA|Latvia;LB|LBN|Lebanon;' +
  'LS|LSO|Lesotho;LR|LBR|Liberia;LY|LBY|Libya;LI|LIE|Liechtenstein;LT|LTU|Lithuania;' +
  'LU|LUX|Luxembourg;MO|MAC|Macao;MG|MDG|Madagascar;MW|MWI|Malawi;MY|MYS|Malaysia;MV|MDV|Maldives;' +
  'ML|MLI|Mali;MT|MLT|Malta;MH|MHL|Marshall Islands;MQ|MTQ|Martinique;MR|MRT|Mauritania;' +
  'MU|MUS|Mauritius;YT|MYT|Mayotte;MX|MEX|Mexico;FM|FSM|Micronesia;MD|MDA|Moldova;MC|MCO|Monaco;' +
  'MN|MNG|Mongolia;ME|MNE|Montenegro;MS|MSR|Montserrat;MA|MAR|Morocco;MZ|MOZ|Mozambique;' +
  'MM|MMR|Myanmar;NA|NAM|Namibia;NR|NRU|Nauru;NP|NPL|Nepal;NL|NLD|Netherlands;NC|NCL|New Caledonia;' +
  'NZ|NZL|New Zealand;NI|NIC|Nicaragua;NE|NER|Niger;NG|NGA|Nigeria;NU|NIU|Niue;NF|NFK|Norfolk Island;' +
  'MK|MKD|North Macedonia;MP|MNP|Northern Mariana Islands;NO|NOR|Norway;OM|OMN|Oman;PK|PAK|Pakistan;' +
  'PW|PLW|Palau;PS|PSE|Palestine;PA|PAN|Panama;PG|PNG|Papua New Guinea;PY|PRY|Paraguay;PE|PER|Peru;' +
  'PH|PHL|Philippines;PN|PCN|Pitcairn Islands;PL|POL|Poland;PT|PRT|Portugal;PR|PRI|Puerto Rico;' +
  'QA|QAT|Qatar;RE|REU|Réunion;RO|ROU|Romania;RU|RUS|Russia;RW|RWA|Rwanda;BL|BLM|Saint Barthélemy;' +
  'SH|SHN|Saint Helena;KN|KNA|Saint Kitts and Nevis;LC|LCA|Saint Lucia;MF|MAF|Saint Martin;' +
  'PM|SPM|Saint Pierre and Miquelon;VC|VCT|Saint Vincent and the Grenadines;WS|WSM|Samoa;' +
  'SM|SMR|San Marino;ST|STP|São Tomé and Príncipe;SA|SAU|Saudi Arabia;SN|SEN|Senegal;RS|SRB|Serbia;' +
  'SC|SYC|Seychelles;SL|SLE|Sierra Leone;SG|SGP|Singapore;SX|SXM|Sint Maarten;SK|SVK|Slovakia;' +
  'SI|SVN|Slovenia;SB|SLB|Solomon Islands;SO|SOM|Somalia;ZA|ZAF|South Africa;' +
  'GS|SGS|South Georgia and the South Sandwich Islands;SS|SSD|South Sudan;ES|ESP|Spain;' +
  'LK|LKA|Sri Lanka;SD|SDN|Sudan;SR|SUR|Suriname;SJ|SJM|Svalbard and Jan Mayen;SE|SWE|Sweden;' +
  'CH|CHE|Switzerland;SY|SYR|Syria;TW|TWN|Taiwan;TJ|TJK|Tajikistan;TZ|TZA|Tanzania;TH|THA|Thailand;' +
  'TL|TLS|Timor-Leste;TG|TGO|Togo;TK|TKL|Tokelau;TO|TON|Tonga;TT|TTO|Trinidad and Tobago;' +
  'TN|TUN|Tunisia;TR|TUR|Türkiye;TM|TKM|Turkmenistan;TC|TCA|Turks and Caicos Islands;TV|TUV|Tuvalu;' +
  'UG|UGA|Uganda;UA|UKR|Ukraine;AE|ARE|United Arab Emirates;GB|GBR|United Kingdom;' +
  'US|USA|United States;UM|UMI|United States Minor Outlying Islands;UY|URY|Uruguay;UZ|UZB|Uzbekistan;' +
  'VU|VUT|Vanuatu;VE|VEN|Venezuela;VN|VNM|Vietnam;VG|VGB|British Virgin Islands;' +
  'VI|VIR|United States Virgin Islands;WF|WLF|Wallis and Futuna;EH|ESH|Western Sahara;YE|YEM|Yemen;' +
  'ZM|ZMB|Zambia;ZW|ZWE|Zimbabwe';

/**
 * Names people use that are not the table's canonical form.
 *
 * Not a nicety — this repo's own fixtures store `USA` and `UK`
 * (`examples/react/src/lib/employees.js`), and neither is an ISO code or an ISO
 * name. Without aliases the two most common country values in the codebase
 * would fail to resolve.
 *
 * Keys are normalised the same way lookups are (see {@link normalizeKey}).
 */
const COUNTRY_ALIASES: Readonly<Record<string, string>> = {
  usa: 'US',
  'us of a': 'US',
  'united states of america': 'US',
  america: 'US',
  uk: 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  uae: 'AE',
  emirates: 'AE',
  'russian federation': 'RU',
  'korea republic of': 'KR',
  'republic of korea': 'KR',
  'korea south': 'KR',
  'korea democratic peoples republic of': 'KP',
  'korea north': 'KP',
  'czech republic': 'CZ',
  holland: 'NL',
  'the netherlands': 'NL',
  turkey: 'TR',
  burma: 'MM',
  'ivory coast': 'CI',
  'cote divoire': 'CI',
  swaziland: 'SZ',
  macedonia: 'MK',
  'cape verde islands': 'CV',
  'vatican': 'VA',
  'holy see': 'VA',
  'east timor': 'TL',
  'vietnam socialist republic': 'VN',
  'viet nam': 'VN',
  laos: 'LA',
  'lao peoples democratic republic': 'LA',
  syria: 'SY',
  'syrian arab republic': 'SY',
  'iran islamic republic of': 'IR',
  'bolivia plurinational state of': 'BO',
  'venezuela bolivarian republic of': 'VE',
  'tanzania united republic of': 'TZ',
  'moldova republic of': 'MD',
  'congo kinshasa': 'CD',
  'congo brazzaville': 'CG',
  drc: 'CD',
  'brunei darussalam': 'BN',
  'hong kong sar': 'HK',
  'macau': 'MO',
  'palestinian territories': 'PS',
  'south korea republic': 'KR',
};

/**
 * Reduces a value to a comparable lookup key.
 *
 * Case, accents, punctuation and spacing all vary between data sources for the
 * same country ("Côte d'Ivoire" / "cote d ivoire" / "COTE-DIVOIRE"), and none
 * of that variation is meaningful. `NFD` + combining-mark strip folds the
 * accents; everything non-alphanumeric collapses to single spaces.
 */
function normalizeKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Lazily-built indexes. `null` until the first lookup. */
let byAlpha2: Map<string, CountryEntry> | null = null;
let byAlpha3: Map<string, CountryEntry> | null = null;
let byName: Map<string, CountryEntry> | null = null;

/**
 * Memo of raw input → resolved entry, including misses.
 *
 * A country column repeats a handful of distinct values across thousands of
 * rows, so this collapses the work to one resolution per distinct value for the
 * lifetime of the page. Misses are cached too — an unresolvable value is
 * usually a systematic one that will recur on every row.
 */
const lookupCache = new Map<string, CountryEntry | null>();

/**
 * Caps {@link lookupCache}. Reached only by a column of genuinely unique junk,
 * where caching has no value anyway; clearing wholesale is cheaper than
 * tracking recency for a map that should never grow this far.
 */
const LOOKUP_CACHE_LIMIT = 1000;

/** Builds the three indexes from the packed table. Idempotent. */
function buildIndexes(): void {
  if (byAlpha2) return;

  byAlpha2 = new Map();
  byAlpha3 = new Map();
  byName = new Map();

  for (const row of COUNTRY_TABLE.split(';')) {
    const parts = row.split('|');
    // A row with the wrong shape is dropped rather than parsed leniently. Read
    // positionally, an extra separator silently shifts every field along — a
    // four-part row would register a three-letter "alpha-2" and leave the real
    // code unresolvable, which is a wrong answer rather than a missing one.
    if (parts.length !== 3 || parts[0].length !== 2 || parts[1].length !== 3) continue;

    const entry: CountryEntry = { alpha2: parts[0], alpha3: parts[1], name: parts[2] };
    byAlpha2.set(entry.alpha2, entry);
    byAlpha3.set(entry.alpha3, entry);
    byName.set(normalizeKey(entry.name), entry);
  }
}

/**
 * Adds or replaces country entries.
 *
 * Lets an application correct a name, add a territory the ISO list omits, or
 * localise the whole table — the same extension point the renderer registry
 * offers, for the data rather than the drawing.
 *
 * @param entries - Entries to merge in. An existing alpha-2 is replaced.
 */
export function registerCountries(entries: readonly CountryEntry[]): void {
  buildIndexes();
  for (const entry of entries) {
    const normalized: CountryEntry = {
      alpha2: entry.alpha2.toUpperCase(),
      alpha3: entry.alpha3.toUpperCase(),
      name: entry.name,
    };
    byAlpha2!.set(normalized.alpha2, normalized);
    byAlpha3!.set(normalized.alpha3, normalized);
    byName!.set(normalizeKey(normalized.name), normalized);
  }
  // Entries just changed meaning, so previously-resolved answers may be wrong.
  lookupCache.clear();
}

/** The entry for an exact ISO alpha-2 or alpha-3 code, or `undefined`. */
export function getCountry(code: string): CountryEntry | undefined {
  buildIndexes();
  const upper = code.toUpperCase();
  return byAlpha2!.get(upper) ?? byAlpha3!.get(upper);
}

/**
 * Every country in the table, in ISO alpha-2 order.
 *
 * The whole point of keeping the list in the core is that applications do not
 * each maintain their own — a country picker, a filter's option list, or a
 * demo's sample data can all read from here instead of hardcoding a subset that
 * drifts. Includes anything added through {@link registerCountries}.
 */
export function getAllCountries(): readonly CountryEntry[] {
  buildIndexes();
  return [...byAlpha2!.values()];
}

/**
 * Resolves any of the forms real data uses to a country.
 *
 * Accepts, in order of cost: an ISO alpha-2 code, an ISO alpha-3 code, a
 * country name, or a common alias. Whitespace, case, accents and punctuation
 * are all normalised away first.
 *
 * @param value - The raw cell value.
 * @returns The matching entry, or `null` when nothing matches — never throws,
 *   so an unexpected value degrades to the renderer's fallback rather than
 *   breaking the row.
 */
export function normalizeCountry(value: unknown): CountryEntry | null {
  if (value === null || value === undefined) return null;

  // An object carrying its own code (a joined row, an API payload) is common
  // enough to be worth accepting directly.
  if (typeof value === 'object') {
    const candidate = value as Partial<CountryEntry>;
    const code = candidate.alpha2 ?? candidate.alpha3;
    if (typeof code === 'string') return normalizeCountry(code);
    if (typeof candidate.name === 'string') return normalizeCountry(candidate.name);
    return null;
  }

  const raw = String(value).trim();
  if (raw === '') return null;

  const cached = lookupCache.get(raw);
  if (cached !== undefined) return cached;

  buildIndexes();
  const upper = raw.toUpperCase();

  let entry: CountryEntry | null =
    (raw.length === 2 ? byAlpha2!.get(upper) : undefined) ??
    (raw.length === 3 ? byAlpha3!.get(upper) : undefined) ??
    null;

  if (!entry) {
    const key = normalizeKey(raw);
    const aliased = COUNTRY_ALIASES[key];
    entry = (aliased ? byAlpha2!.get(aliased) : byName!.get(key)) ?? null;
  }

  if (lookupCache.size >= LOOKUP_CACHE_LIMIT) lookupCache.clear();
  lookupCache.set(raw, entry);
  return entry;
}

/** Offset from ASCII `A` to the Regional Indicator Symbol block. */
const REGIONAL_INDICATOR_A = 0x1f1e6;
const ASCII_A = 65;

/**
 * The emoji flag for an alpha-2 code.
 *
 * Derived arithmetically from the code's two letters — a flag emoji *is* the
 * pair of Regional Indicator Symbols for those letters — so no per-country
 * image data is needed at all.
 *
 * Caveat worth knowing: Windows ships no country-flag glyphs, so this renders
 * as the two letters there. The `country` renderer's `flag` option exists to
 * swap in a real image set for that case.
 */
export function flagEmoji(alpha2: string): string {
  if (alpha2.length !== 2) return '';
  return String.fromCodePoint(
    REGIONAL_INDICATOR_A + (alpha2.toUpperCase().charCodeAt(0) - ASCII_A),
    REGIONAL_INDICATOR_A + (alpha2.toUpperCase().charCodeAt(1) - ASCII_A),
  );
}

/** Test seam — drops the memo so cache behaviour can be asserted. */
export function clearCountryLookupCache(): void {
  lookupCache.clear();
}

/**
 * Host serving the default flag images.
 *
 * A constant rather than an inline string so an application that mirrors the
 * images (an air-gapped deployment, a corporate proxy, a self-hosted copy) has
 * one place to point somewhere else — and so the network dependency is visible
 * rather than buried in a template string.
 */
export const FLAG_CDN_HOST = 'https://flagcdn.com';

/** Default flagcdn size segment. Matches a 24x18 flag at a 13px body font. */
export const DEFAULT_FLAG_SIZE = '24x18';

/**
 * URL of a country's flag image on flagcdn.
 *
 * flagcdn keys off the lower-cased ISO alpha-2 code, which is exactly what the
 * lookup table already resolves any input to — so a row storing `"Pakistan"`,
 * `"PAK"` or `"pk"` all end up at the same image.
 *
 * @param alpha2 - ISO 3166-1 alpha-2 code, any case.
 * @param size - flagcdn size segment, e.g. `'24x18'`, `'w40'`. Defaults to {@link DEFAULT_FLAG_SIZE}.
 */
export function flagImageUrl(alpha2: string, size: string = DEFAULT_FLAG_SIZE): string {
  return `${FLAG_CDN_HOST}/${size}/${alpha2.toLowerCase()}.png`;
}
