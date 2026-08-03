/**
 * Function-based cell renderers.
 *
 * The Vue wrapper forwards column definitions to the core untouched, so a cell
 * renderer is a plain `(params) => HTMLElement | string` function rather than a
 * Vue component. That is deliberate for cells: a virtualized grid mounts and
 * discards renderers on every scroll frame, and building the DOM directly skips
 * a component instance, a reactive scope and a mount/unmount cycle per cell.
 *
 * (Vue *components* are still supported where the lifecycle is coarse enough to
 * pay for itself — see `masterDetail.renderer` in the Master/Detail demo.)
 */

import { COUNTRY_FLAGS } from './employees';

/**
 * `fullName` cell: avatar, employee name, and job title in gray underneath.
 *
 * The avatar index is derived from the row index rather than `Math.random()`,
 * so a scroll-driven recycle re-renders the *same* face instead of swapping to
 * a new one — random avatars read as visual noise rather than identity.
 *
 * @param {{ row: Record<string, unknown>, rowIndex: number }} params
 * @returns {HTMLElement}
 */
export function employeeCellRenderer(params) {
  const row = params.row ?? {};
  const index = ((params.rowIndex ?? 0) * 37 + 17) % 61;

  const root = document.createElement('div');
  root.className = 'employee-cell';

  const avatar = document.createElement('img');
  avatar.className = 'employee-cell__avatar';
  avatar.src = `https://i.pravatar.cc/64?img=${index}`;
  avatar.alt = String(row.fullName ?? '');
  avatar.width = 32;
  avatar.height = 32;
  avatar.loading = 'lazy';
  avatar.decoding = 'async';

  const text = document.createElement('div');
  text.className = 'employee-cell__text';

  const name = document.createElement('span');
  name.className = 'employee-cell__name';
  name.textContent = String(row.fullName ?? '');

  const title = document.createElement('span');
  title.className = 'employee-cell__title';
  title.textContent = String(row.jobTitle ?? '');

  text.append(name, title);
  root.append(avatar, text);
  return root;
}

/**
 * `country` cell: flag image + country name.
 *
 * Used for both the `display` and the `option` renderer slots so the dropdown
 * editor's options look exactly like the rendered cell. The params shape differs
 * between the two — a display cell carries `value`, an option carries `option` —
 * so both are unwrapped here rather than in two renderers.
 *
 * @param {Record<string, unknown>} params
 * @returns {HTMLElement}
 */
export function countryCellRenderer(params) {
  const raw = params?.value ?? params?.option?.value ?? params?.option?.label ?? params?.label ?? '';
  const label = String(raw ?? '');
  const code = COUNTRY_FLAGS[label] ?? label.toLowerCase();
  const hasCode = Boolean(code && code !== 'undefined' && code !== 'null');

  const root = document.createElement('div');
  root.className = 'country-cell';

  const flag = document.createElement('span');
  flag.className = 'country-cell__flag';

  if (hasCode) {
    const img = document.createElement('img');
    img.src = `https://flagcdn.com/16x12/${code}.png`;
    img.srcset = `https://flagcdn.com/32x24/${code}.png 2x, https://flagcdn.com/48x36/${code}.png 3x`;
    img.width = 16;
    img.height = 12;
    img.alt = `${label} flag`;
    img.loading = 'lazy';
    img.decoding = 'async';
    flag.appendChild(img);
  } else {
    flag.textContent = '🌐';
  }

  const name = document.createElement('span');
  name.className = 'country-cell__name';
  // `textContent`, never `innerHTML`: the label originates in row data.
  name.textContent = label;

  root.append(flag, name);
  return root;
}
