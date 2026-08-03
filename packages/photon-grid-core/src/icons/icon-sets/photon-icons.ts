import type { IconSet } from '../../types/icon.types';

/**
 * Photon icon pack — hairline 1px stroke, open forms, rounded caps.
 *
 * The editorial register: the lightest of the four packs, drawn slightly larger
 * within the 16px box so the thin stroke still reads. Forms are open and airy
 * to match a borderless grid with hairline dividers — a heavy glyph would be the
 * darkest thing on the screen and pull focus from the data.
 *
 * Partial by design — names omitted here fall through to `coreIcons`.
 */
export const photonIcons: IconSet = {
  sortAsc: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 13.25V2.75m0 0L1.25 5M3.5 2.75 5.75 5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 3.75h6M8.5 8h4.5M8.5 12.25h3" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  sortDesc: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.5 2.75v10.5m0 0L1.25 11M3.5 13.25 5.75 11" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 3.75h3M8.5 8h4.5M8.5 12.25h6" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  sortNone: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 6.25 8 3.25l3 3M5 9.75l3 3 3-3" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" opacity="0.4"/></svg>`,
  filter: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.75 3h12.5L9.25 8.75v4.5l-2.5 1.25V8.75L1.75 3Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/></svg>`,
  filterActive: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.75 3h12.5L9.25 8.75v4.5l-2.5 1.25V8.75L1.75 3Z" fill="currentColor" fill-opacity="0.18" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><circle cx="12.5" cy="3.5" r="2.25" fill="currentColor"/></svg>`,
  menuHorizontal: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="2.75" cy="8" r="1" fill="currentColor"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="13.25" cy="8" r="1" fill="currentColor"/></svg>`,
  chevronRight: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m5.75 2.75 5.5 5.25-5.5 5.25" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevronDown: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.75 5.75 8 11.25l5.25-5.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  chevronLeft: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.25 2.75 4.75 8l5.5 5.25" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  close: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m3.25 3.25 9.5 9.5m0-9.5-9.5 9.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  check: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m2.25 8.25 4 4 7.5-8.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  add: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2.25v11.5M2.25 8h11.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  drag: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 5h10M3 8h10M3 11h10" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  search: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1"/><path d="m10.5 10.5 3.25 3.25" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  pin: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.25 1.75h3.5v4.75l2 3.25h-7.5l2-3.25V1.75Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><path d="M8 9.75v4.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  unpin: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.25 1.75h3.5v4.75l2 3.25h-7.5l2-3.25V1.75Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round" opacity="0.5"/><path d="m2 2 12 12" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  eye: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 8s2.75-4.5 7-4.5S15 8 15 8s-2.75 4.5-7 4.5S1 8 1 8Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1"/></svg>`,
  eyeOff: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.4 6.4a2.25 2.25 0 0 0 3.2 3.2" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="M3.1 4.3C1.7 5.6 1 8 1 8s2.75 4.5 7 4.5c1.1 0 2.1-.3 2.95-.75M5.9 3.7c.66-.13 1.36-.2 2.1-.2 4.25 0 7 4.5 7 4.5s-.66 1.1-1.8 2.25" stroke="currentColor" stroke-width="1" stroke-linecap="round"/><path d="m2 2 12 12" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  group: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.25" y="2.25" width="13.5" height="3.25" rx="1.25" stroke="currentColor" stroke-width="1"/><rect x="3.25" y="7.25" width="11.5" height="2.75" rx="1.25" stroke="currentColor" stroke-width="1"/><rect x="5.25" y="11.75" width="9.5" height="2.5" rx="1.25" stroke="currentColor" stroke-width="1"/></svg>`,
  settings: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1"/><path d="M8 1.25v2M8 12.75v2M1.25 8h2M12.75 8h2M3.25 3.25l1.4 1.4M11.35 11.35l1.4 1.4M12.75 3.25l-1.4 1.4M4.65 11.35l-1.4 1.4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>`,
  pageFirst: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.75 3v10M12.25 3 7.5 8l4.75 5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pagePrev: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 3 5.5 8l5 5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pageNext: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m5.5 3 5 5-5 5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  pageLast: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.25 3v10M3.75 3 8.5 8l-4.75 5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  loading: `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1" opacity="0.2"/><path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" stroke-width="1" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.9s" repeatCount="indefinite"/></path></svg>`,
};
