import type { IconSet } from '../../types/icon.types';

/**
 * Ion icon pack — geometric, 1.5px stroke, rounded caps and joins.
 *
 * The crisp-enterprise register: even stroke weight, 45°/90° geometry, generous
 * optical spacing inside the 16px box. Reads clearly at 12–14px, which is where
 * most of them are drawn.
 *
 * Partial by design — names omitted here fall through to `coreIcons`.
 */
export const ionIcons: IconSet = {
  sortAsc: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12.5V3.5M4 3.5L1.75 5.75M4 3.5L6.25 5.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 4.5h5.5M9 8h4M9 11.5h2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  sortDesc: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3.5v9M4 12.5 1.75 10.25M4 12.5l2.25-2.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M9 4.5h2.5M9 8h4M9 11.5h5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  sortNone: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 6.25 8 3.75l2.5 2.5M5.5 9.75 8 12.25l2.5-2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/></svg>`,
  filter: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 3.5h11l-4.25 5v4.25l-2.5 1.25V8.5L2.5 3.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  filterActive: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 3.5h11l-4.25 5v4.25l-2.5 1.25V8.5L2.5 3.5Z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  menuHorizontal: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="3.25" cy="8" r="1.25" fill="currentColor"/><circle cx="8" cy="8" r="1.25" fill="currentColor"/><circle cx="12.75" cy="8" r="1.25" fill="currentColor"/></svg>`,
  chevronRight: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m6 3.5 4.5 4.5L6 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevronDown: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m3.5 6 4.5 4.5L12.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevronLeft: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  close: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  check: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m3 8.25 3.25 3.25L13 4.75" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  add: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  drag: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="4" r="1.15" fill="currentColor"/><circle cx="10" cy="4" r="1.15" fill="currentColor"/><circle cx="6" cy="8" r="1.15" fill="currentColor"/><circle cx="10" cy="8" r="1.15" fill="currentColor"/><circle cx="6" cy="12" r="1.15" fill="currentColor"/><circle cx="10" cy="12" r="1.15" fill="currentColor"/></svg>`,
  search: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7.25" cy="7.25" r="4" stroke="currentColor" stroke-width="1.5"/><path d="m10.25 10.25 3.25 3.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  pin: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.5 1.75 14.25 6.5l-2.5 1-1 3.25-4.5-4.5 3.25-1 1-3.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m6.25 9.75-3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  unpin: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.5 1.75 14.25 6.5l-2.5 1-1 3.25-4.5-4.5 3.25-1 1-3.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="m2 2 12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  eye: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 8S4 3.75 8 3.75 14.5 8 14.5 8 12 12.25 8 12.25 1.5 8 1.5 8Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="8" cy="8" r="1.75" stroke="currentColor" stroke-width="1.5"/></svg>`,
  eyeOff: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.35 6.35a2.33 2.33 0 0 0 3.3 3.3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3.4 4.15C2.05 5.35 1.5 8 1.5 8s2.5 4.25 6.5 4.25c1.05 0 1.98-.29 2.78-.73M6.2 3.95c.57-.13 1.17-.2 1.8-.2 4 0 6.5 4.25 6.5 4.25s-.62 1.06-1.7 2.15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="m2.25 2.25 11.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  group: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.75" y="2" width="12.5" height="3.5" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="3.75" y="7.25" width="10.5" height="3" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="5.75" y="12" width="8.5" height="2.5" rx="1" stroke="currentColor" stroke-width="1.5"/></svg>`,
  settings: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="2.25" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5v1.75M8 12.75v1.75M1.5 8h1.75M12.75 8h1.75M3.4 3.4l1.25 1.25M11.35 11.35l1.25 1.25M12.6 3.4l-1.25 1.25M4.65 11.35 3.4 12.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  pageFirst: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3.75v8.5M12 3.75 7.75 8 12 12.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pagePrev: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3.75 5.75 8 10 12.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pageNext: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3.75 10.25 8 6 12.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pageLast: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3.75v8.5M4 3.75 8.25 8 4 12.25" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  loading: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5" opacity="0.22"/><path d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.75s" repeatCount="indefinite"/></path></svg>`,
};
