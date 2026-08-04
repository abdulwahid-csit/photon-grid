import type { IconSet } from '../../types/icon.types';

/**
 * Neon icon pack — angular, 1.25px stroke, butt caps, no rounding.
 *
 * The technical/terminal register: hard corners, chamfered arrowheads, bracket
 * forms instead of curves. Thinner than the other packs on purpose — against
 * Neon's high-contrast chrome a heavier stroke reads as blunt, and the accent
 * glow does the work of drawing the eye.
 *
 * Partial by design — names omitted here fall through to `coreIcons`.
 */
export const neonIcons: IconSet = {
  sortAsc: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 13V3m0 0L1.5 5.5M4 3l2.5 2.5" stroke="currentColor" stroke-width="1.25"/><path d="M9 4h5.5M9 8h4M9 12h2.5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  sortDesc: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 3v10m0 0L1.5 10.5M4 13l2.5-2.5" stroke="currentColor" stroke-width="1.25"/><path d="M9 4h2.5M9 8h4M9 12h5.5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  sortNone: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.25 6.5 8 3.75l2.75 2.75M5.25 9.5 8 12.25l2.75-2.75" stroke="currentColor" stroke-width="1.25" opacity="0.4"/></svg>`,
  filter: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.75 2.75h12.5v1.5L9.5 9v4.25l-3 1V9L1.75 4.25v-1.5Z" stroke="currentColor" stroke-width="1.25"/></svg>`,
  filterActive: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.75 2.75h12.5v1.5L9.5 9v4.25l-3 1V9L1.75 4.25v-1.5Z" fill="currentColor" stroke="currentColor" stroke-width="1.25"/></svg>`,
  menuHorizontal: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="7" width="2" height="2" fill="currentColor"/><rect x="7" y="7" width="2" height="2" fill="currentColor"/><rect x="12" y="7" width="2" height="2" fill="currentColor"/></svg>`,
  chevronRight: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m5.75 3 5 5-5 5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  chevronDown: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m3 5.75 5 5 5-5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  chevronLeft: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.25 3 5.25 8l5 5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  close: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m3.5 3.5 9 9m0-9-9 9" stroke="currentColor" stroke-width="1.25"/></svg>`,
  check: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m2.5 8 3.75 3.75L13.5 4.5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  add: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2.5v11M2.5 8h11" stroke="currentColor" stroke-width="1.25"/></svg>`,
  drag: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3.5h6M5 6.5h6M5 9.5h6M5 12.5h6" stroke="currentColor" stroke-width="1.25"/></svg>`,
  search: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 3h8v8H3z" stroke="currentColor" stroke-width="1.25"/><path d="m11 11 3 3" stroke="currentColor" stroke-width="1.25"/></svg>`,
  pin: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1.75h4v5l2.25 3.25H3.75L6 6.75v-5Z" stroke="currentColor" stroke-width="1.25"/><path d="M8 10v4.25" stroke="currentColor" stroke-width="1.25"/></svg>`,
  unpin: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1.75h4v5l2.25 3.25H3.75L6 6.75v-5Z" stroke="currentColor" stroke-width="1.25"/><path d="m2 2 12 12" stroke="currentColor" stroke-width="1.25"/></svg>`,
  eye: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 8 4.5 4.25h7L14.5 8l-3 3.75h-7L1.5 8Z" stroke="currentColor" stroke-width="1.25"/><path d="M6.25 8h3.5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  eyeOff: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 8 4.5 4.25h7L14.5 8l-3 3.75h-7L1.5 8Z" stroke="currentColor" stroke-width="1.25" opacity="0.45"/><path d="m2 2 12 12" stroke="currentColor" stroke-width="1.25"/></svg>`,
  group: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.75 2.25h12.5v3.5H1.75zM3.75 7.25h10.5v3H3.75zM5.75 11.75h8.5v2.5H5.75z" stroke="currentColor" stroke-width="1.25"/></svg>`,
  settings: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 5.5 10.5 7v3L8 11.5 5.5 10V7L8 5.5Z" stroke="currentColor" stroke-width="1.25"/><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3" stroke="currentColor" stroke-width="1.25"/></svg>`,
  pageFirst: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 3v10M12.5 3 7.5 8l5 5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  pagePrev: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 3 5.5 8l5 5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  pageNext: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 3l5 5-5 5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  pageLast: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 3v10M3.5 3l5 5-5 5" stroke="currentColor" stroke-width="1.25"/></svg>`,
  loading: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1.5v3M8 11.5v3M1.5 8h3M11.5 8h3M3.4 3.4l2.1 2.1M10.5 10.5l2.1 2.1M12.6 3.4l-2.1 2.1M5.5 10.5l-2.1 2.1" stroke="currentColor" stroke-width="1.25"><animateTransform attributeName="transform" type="rotate" values="0 8 8;360 8 8" dur="0.9s" repeatCount="indefinite"/></path></svg>`,
};
