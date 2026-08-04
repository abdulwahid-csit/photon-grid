import { memo } from 'react';

import { COUNTRY_FLAGS } from '../lib/employees';

/**
 * Cell renderer for the `country` column: flag image + country name.
 *
 * Used for both the `display` and the `option` renderer slots, so the dropdown
 * editor's options look exactly like the rendered cell. The params shape
 * differs slightly between the two — a display cell carries `value`, an option
 * carries `option` — so both are unwrapped here rather than in two components.
 */
export const CountryCell = memo(function CountryCell(params) {
  const rawValue = params?.value ?? params?.option?.value ?? params?.option?.label ?? params?.label ?? '';
  const label = String(rawValue ?? '');
  const code = COUNTRY_FLAGS[label] ?? label.toLowerCase();
  const hasCode = Boolean(code && code !== 'undefined' && code !== 'null');

  return (
    <div className="country-cell">
      <span className="country-cell__flag">
        {hasCode ? (
          <img
            src={`https://flagcdn.com/16x12/${code}.png`}
            srcSet={`https://flagcdn.com/32x24/${code}.png 2x, https://flagcdn.com/48x36/${code}.png 3x`}
            width={16}
            height={12}
            alt={`${label} flag`}
            loading="lazy"
            decoding="async"
          />
        ) : '🌐'}
      </span>
      <span className="country-cell__name">{label}</span>
    </div>
  );
});

export default CountryCell;
