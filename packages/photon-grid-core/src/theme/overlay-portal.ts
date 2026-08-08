/**
 * Per-grid portal host for overlays rendered outside the grid container.
 *
 * ## Why this exists
 *
 * Context menus, dropdown panels, the column chooser, toasts and drag ghosts are
 * appended to `<body>` so they escape the grid's `overflow: hidden` viewport and
 * its stacking contexts. That places them *outside* the element `ThemeManager`
 * scopes its design tokens to, so they cannot inherit the palette of the grid
 * that opened them.
 *
 * The historical workaround was to mirror the active mode's tokens and the
 * `data-pg-mode` / `data-pg-variant` attributes onto `document.documentElement`.
 * That works for a single grid and breaks for two: every instance writes to the
 * same element, so the page ends up wearing whichever grid initialized *last*.
 * A light grid on a page that also hosts a dark one renders dark menus.
 *
 * ## The fix
 *
 * Each grid owns one host element in `<body>` carrying its own theme identity:
 *
 * ```html
 * <div class="pg-portal-host pg-classic-theme"
 *      data-pg-theme-scope="pg-scope-1"
 *      data-pg-mode="light"
 *      data-pg-variant="classic"></div>
 * ```
 *
 * Overlays are appended into that host rather than onto `<body>`, which buys
 * three things without touching a single theme stylesheet:
 *
 * - The host matches the grid's scoped token stylesheet
 *   (`[data-pg-theme-scope="pg-scope-1"] { --pg-…: … }`), so its subtree inherits
 *   the correct palette. A rule matching the host overrides the value inherited
 *   from `<html>` — they are different elements, so there is no cascade conflict
 *   with the inline mirror, which stays in place for backward compatibility.
 * - Existing variant selectors written as `[data-pg-variant="x"] .pg-context-menu`
 *   match, because the attribute now sits on the overlay's parent.
 * - Mode-qualified variant rules such as
 *   `[data-pg-mode="dark"][data-pg-variant="classic"] .pg-…` match too, since the
 *   host carries both attributes.
 *
 * `display: contents` (see `styles/base/root.css.ts`) is what makes the host
 * safe: it generates no box, so it adds no layout, establishes no containing
 * block, and can neither clip nor reposition a `position: fixed` overlay.
 * Custom properties and `color-scheme` still inherit through it because
 * inheritance follows the element tree, not the box tree.
 *
 * @see ThemeManager — owns host creation, attribute sync and teardown.
 */

/** Attribute carrying a grid's unique theme scope id. Mirrors `ThemeManager`. */
export const SCOPE_ATTR = 'data-pg-theme-scope';

/** Class applied to every portal host; styled `display: contents` in base CSS. */
export const PORTAL_HOST_CLASS = 'pg-portal-host';

/**
 * Live hosts, keyed by scope id.
 *
 * Keyed by the id *string* rather than by the container element on purpose: a
 * submenu opened from inside an already-portaled menu resolves its owner by
 * walking up the DOM, and that walk terminates on the host itself — which also
 * carries {@link SCOPE_ATTR}. Keying by id means both lookups land on the same
 * entry, so nested overlays stay with their grid instead of escaping to `<body>`.
 */
const hostsByScope = new Map<string, HTMLElement>();

/**
 * Registers a grid's portal host so {@link portalHostFor} can resolve it.
 * Replacing an existing entry is safe — `ThemeManager` reuses one host per scope
 * for the lifetime of the grid.
 *
 * @param scopeId - The grid's unique theme scope id.
 * @param host    - The host element, already appended to `<body>`.
 */
export function registerPortalHost(scopeId: string, host: HTMLElement): void {
  hostsByScope.set(scopeId, host);
}

/**
 * Unregisters and detaches a grid's portal host. Called from
 * `ThemeManager.destroy()`; safe to call for an unknown scope.
 *
 * Any overlay still parented to the host is removed with it, which is the
 * intended behaviour — a destroyed grid should not leave menus on the page.
 *
 * @param scopeId - The scope id passed to {@link registerPortalHost}.
 */
export function disposePortalHost(scopeId: string): void {
  const host = hostsByScope.get(scopeId);
  if (!host) return;
  host.remove();
  hostsByScope.delete(scopeId);
}

/**
 * Resolves the portal host of the grid that owns `originEl`.
 *
 * Pass the element that triggered the overlay — the anchor cell, header, ⋯
 * button or dragged node. The lookup walks up to the nearest element carrying
 * {@link SCOPE_ATTR}, which is either the grid container or (for an overlay
 * opened from inside another overlay) that grid's own host.
 *
 * Falls back to `document.body`, preserving the pre-portal behaviour whenever an
 * owner cannot be determined: a detached anchor, a grid whose theme has not been
 * applied yet, or a standalone renderer used outside a grid.
 *
 * @param originEl - Element the overlay is being opened from. `null` is accepted
 *                   so call sites need no guard of their own.
 * @returns The owning grid's host, or `document.body`.
 */
export function portalHostFor(originEl: Element | null | undefined): HTMLElement {
  // `closest` is missing on non-Element nodes and on detached shims in tests.
  const scoped = originEl?.closest?.(`[${SCOPE_ATTR}]`) ?? null;
  const scopeId = scoped?.getAttribute(SCOPE_ATTR);
  const host = scopeId ? hostsByScope.get(scopeId) : undefined;
  return host ?? (originEl?.ownerDocument ?? document).body;
}
