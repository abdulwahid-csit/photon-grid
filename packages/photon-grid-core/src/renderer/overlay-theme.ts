/**
 * Theming for panels portaled to `document.body`.
 *
 * ### The problem this solves
 * `ThemeManager` emits a grid's design tokens as a stylesheet scoped to that
 * grid's container — `[data-pg-theme-scope="pg-scope-3"] { --pg-colors-…: … }`.
 * A panel appended to `<body>` is not inside that container, so none of those
 * variables resolve for it and every `var(--pg-…, fallback)` collapses to its
 * literal fallback. Those fallbacks are light-mode values, which is why the
 * symptom is always the same: a white panel on a dark grid.
 *
 * `ThemeManager` does also mirror the active mode's tokens onto `:root` for
 * exactly this reason, and for a page with one grid that is enough. It is
 * last-writer-wins, though — with several grids mounted, `:root` carries
 * whichever applied its mode most recently, which need not be the grid the user
 * is actually pointing at.
 *
 * ### The fix
 * Copy the originating grid's scope attribute onto the panel. The token
 * stylesheet's selector matches the *element carrying the attribute*, so the
 * panel starts resolving that grid's tokens directly — correct even with
 * several grids on one page in different modes, and with no dependency on the
 * `:root` mirror at all.
 *
 * @packageDocumentation
 */

/** Attribute `ThemeManager` scopes a grid's token stylesheet to. */
const SCOPE_ATTR = 'data-pg-theme-scope';

/** Attribute carrying the active light/dark mode. */
const MODE_ATTR = 'data-pg-mode';

/** Matches a variant skin class (`pg-ion-theme`), and not `pg-grid`. */
const VARIANT_CLASS = /^pg-.+-theme$/;

/**
 * Points a portaled panel at the theme of the grid it was opened from.
 *
 * Safe to call on every open. The panels that use this are module singletons
 * reused across every grid on the page, so anything a previous open applied is
 * cleared first — two grids need not share a mode, and a stale scope would be
 * worse than none.
 *
 * @param panel  - The element appended to `document.body`.
 * @param origin - Any element inside the owning grid, typically the trigger.
 */
export function adoptGridTheme(panel: HTMLElement, origin: HTMLElement): void {
  for (const cls of [...panel.classList]) {
    if (VARIANT_CLASS.test(cls)) panel.classList.remove(cls);
  }
  panel.removeAttribute(SCOPE_ATTR);
  panel.removeAttribute(MODE_ATTR);
  panel.style.removeProperty('color-scheme');

  const container = origin.closest<HTMLElement>(`[${SCOPE_ATTR}]`)
    ?? origin.closest<HTMLElement>(`[${MODE_ATTR}]`);
  if (!container) return;

  // The one that actually carries the palette.
  const scope = container.getAttribute(SCOPE_ATTR);
  if (scope) panel.setAttribute(SCOPE_ATTR, scope);

  // Not needed by any rule the grid ships today — every `[data-pg-mode]` rule
  // is a descendant selector, which an attribute on the panel itself cannot
  // satisfy. Carried anyway so a host writing
  // `.pg-long-text-overlay[data-pg-mode="dark"]` gets what it expects.
  const mode = container.getAttribute(MODE_ATTR);
  if (mode) panel.setAttribute(MODE_ATTR, mode);

  for (const cls of container.classList) {
    if (VARIANT_CLASS.test(cls)) panel.classList.add(cls);
  }

  // These panels scroll. `color-scheme` is what makes the browser paint the
  // scrollbar to match, and it is set per-container rather than tokenised.
  const scheme = container.style.getPropertyValue('color-scheme');
  if (scheme) panel.style.setProperty('color-scheme', scheme);
}
