/**
 * Answers one question for the cell-selection engine: *did that pointer event
 * land outside the grid?*
 *
 * A focused cell is the grid's claim on the user's attention — arrow keys move
 * it, Ctrl+C copies from it, Delete clears it. Once the user has clicked away
 * onto the page, that claim is stale, so the engine drops the focus ring (see
 * `CellSelectionEngine.attach`). Getting the boundary right is the whole
 * problem: too tight and every context-menu item click destroys the selection
 * it was about to act on; too loose and the ring never clears.
 *
 * ### What counts as "inside"
 *
 * 1. **The grid container.** Resolved from the theme-scope host so the header,
 *    toolbar, filters panel, footer and any padding the host put around
 *    `.pg-grid` are all inside — not just the body viewport.
 * 2. **Photon's portaled UI.** Context menus, the column menu, the column
 *    chooser, dropdown editor panels, toasts and drag ghosts are appended to
 *    `document.body`, so containment against the container can never see them.
 *    They are recognised structurally instead: a body-level element whose class
 *    is `pg-`-prefixed is Photon's own. That is a namespace check rather than a
 *    hardcoded list, so an overlay added later is covered without editing this
 *    file — the alternative, enumerating every portal root, is a list that goes
 *    stale silently and shows up as "the menu closes my selection".
 * 3. **Anything the host opted out.** A custom cell renderer that portals its
 *    own popup (a framework `Select`, a date picker) marks it with
 *    {@link KEEP_FOCUS_ATTR} and clicks inside it leave the selection alone.
 *
 * Everything else is outside.
 *
 * @packageDocumentation
 */

/**
 * Marker attribute a host can put on any element to have clicks inside it treated
 * as clicks inside the grid.
 *
 * Intended for popups a custom cell renderer portals out of the grid's DOM,
 * which would otherwise read as "the user clicked away". The attribute is
 * inherited by the subtree — it is matched with `closest`, so it only has to be
 * set on the popup's root.
 *
 * ```ts
 * panel.setAttribute(KEEP_FOCUS_ATTR, '');
 * document.body.appendChild(panel);
 * ```
 */
export const KEEP_FOCUS_ATTR = 'data-pg-keep-focus';

/** Attribute `ThemeManager` puts on the grid's host container. @see resolveGridRoot */
const SCOPE_ATTR = 'data-pg-theme-scope';

/** Photon's CSS namespace. Every class the library emits starts with this. */
const CLASS_PREFIX = 'pg-';

/**
 * Widens an element inside the grid to the outermost element that still *is* the
 * grid, so containment tests cover the whole widget rather than one panel.
 *
 * Prefers the theme-scope host (the element the integrator handed to
 * `GridCore`), falling back to the `.pg-grid` wrapper and finally to `el`
 * itself. The fallback chain matters because the scope attribute is written when
 * the theme is applied, which need not have happened when a renderer attaches.
 *
 * @param el - Any element inside the grid.
 * @returns The grid's outermost element, never `null`.
 */
export function resolveGridRoot(el: HTMLElement): HTMLElement {
  return el.closest<HTMLElement>(`[${SCOPE_ATTR}]`)
    ?? el.closest<HTMLElement>('.pg-grid')
    ?? el;
}

/**
 * Whether a pointer event landed on the grid or on Photon UI belonging to it.
 *
 * Deliberately fails *closed*: an unusable target (a non-element, or a node
 * already detached by the time the handler runs, as happens when a click
 * re-renders the row under the cursor) reports `true` and the selection
 * survives. Wrongly keeping a focus ring is a cosmetic annoyance; wrongly
 * dropping one loses the range the user was about to copy.
 *
 * Cost is a `closest` walk plus one walk to `<body>` — both bounded by DOM
 * depth, run once per pointerdown, so it is off the hot path entirely.
 *
 * @param target   - `event.target`, as delivered.
 * @param gridRoot - The grid's outermost element, from {@link resolveGridRoot}.
 * @returns `true` when the event belongs to the grid.
 */
export function isInsideGridUi(target: EventTarget | null, gridRoot: HTMLElement): boolean {
  if (!(target instanceof Element)) return true;
  if (!target.isConnected) return true;
  if (gridRoot.contains(target)) return true;
  if (target.closest(`[${KEEP_FOCUS_ATTR}]`)) return true;
  return isPortaledPhotonUi(target, gridRoot.ownerDocument ?? document);
}

/**
 * Whether `el` sits inside an overlay Photon portaled to `<body>`.
 *
 * Walks to the body-level ancestor and tests its classes for the Photon prefix.
 * The walk stops at `<body>` rather than at `documentElement`, so a click on the
 * page background or the document scrollbar — where the target *is* `<body>` or
 * `<html>` — is correctly outside.
 */
function isPortaledPhotonUi(el: Element, doc: Document): boolean {
  const body = doc.body;
  if (!body) return false;

  let node: Element | null = el;
  while (node && node.parentElement && node.parentElement !== body) {
    node = node.parentElement;
  }
  if (!node || node.parentElement !== body) return false;

  for (const cls of node.classList) {
    if (cls.startsWith(CLASS_PREFIX)) return true;
  }
  return false;
}
