/**
 * Mounts a popup editor above the grid, positioned against its cell.
 *
 * Inline editors live inside `.pg-cell__inner` and are clipped by the grid's
 * scroll container — which is correct for a text input and fatal for a calendar
 * or a searchable list. A popup editor is therefore portalled out of the grid
 * entirely and positioned in viewport coordinates.
 *
 * The portal host and the placement maths are the ones the rest of the grid
 * already uses ({@link portalHostFor}, {@link placeOverlay}), so a popup editor
 * inherits the active theme scope and the same flip/clamp behaviour as every
 * other overlay, rather than growing a third copy that drifts.
 *
 * @packageDocumentation
 */

import { portalHostFor } from '../../theme/overlay-portal';
import { placeOverlay } from '../../renderer/overlay-position';

/** Options for {@link PopupService.open}. */
export interface PopupOpenOptions {
  /** The editor's root element, as returned by `ICellEditor.getGui()`. */
  readonly gui: HTMLElement;
  /** The `.pg-cell` the editor belongs to; the popup is anchored to its rect. */
  readonly cellEl: HTMLElement;
  /**
   * Accessible name for the dialog — the column header, so a screen reader
   * announces "Price, dialog" rather than an anonymous group.
   */
  readonly ariaLabel: string;
  /**
   * Called when the user dismisses the popup — by clicking outside it, or by
   * scrolling the grid underneath it. The grid treats that as a commit, matching
   * what clicking away from an inline editor does; the manager decides, not this
   * service.
   */
  readonly onDismiss: () => void;
}

/** A live popup, returned by {@link PopupService.open}. */
export interface PopupHandle {
  /** The wrapper element actually inserted into the portal. */
  readonly element: HTMLElement;
  /** Re-runs placement — call after the editor's content changes size. */
  reposition(): void;
  /** Removes the popup and every listener it installed. Idempotent. */
  close(): void;
}

/** Wrapper class, kept in one place so the stylesheet and this file cannot drift. */
const POPUP_CLASS = 'pg-editor-popup';

/**
 * Floor on a popup's width, in px.
 *
 * A popup is as wide as its cell so it reads as part of the column rather than
 * as a floating panel that happens to be nearby. Taken literally that rule would
 * render a searchable list 60px wide on a narrow column — technically matching,
 * practically unusable — so a narrow column is the one case where the popup is
 * allowed to be wider than its anchor. Every ordinary column is well past this
 * and gets an exact match.
 */
const MIN_POPUP_WIDTH = 160;

/**
 * Height a popup editor must be able to claim before a side counts as usable,
 * in px.
 *
 * A dropdown is a list to read and search, and one squeezed into the 90px left
 * under a cell near the bottom of the window shows a option and a half — the
 * user scrolls a peephole instead of seeing their choices. Below this much
 * room the popup flips above the cell, and failing that centres.
 *
 * Sized to the list's own `max-height` plus its search field and padding, so
 * the reserved space is what a full list actually occupies rather than a
 * number picked to feel generous.
 */
const MIN_POPUP_HEIGHT = 260;

/**
 * Opens and tears down popup editors.
 *
 * Stateless between calls — each {@link open} returns its own handle — so one
 * instance is safely shared by a whole grid, and nothing leaks if a session is
 * abandoned without a matching `close()` (the handle owns all its listeners).
 */
export class PopupService {
  /**
   * Portals `gui` into an anchored, dismissible popup.
   *
   * The popup is positioned before it is made visible, so it never appears at
   * the origin for a frame and slides into place.
   *
   * @returns A handle owning the popup's lifetime.
   */
  open(options: PopupOpenOptions): PopupHandle {
    const wrapper = document.createElement('div');
    wrapper.className = POPUP_CLASS;
    // A dialog rather than a bare div: it is a focus-trapping surface that
    // appeared in response to a user action, and assistive tech should announce
    // it as such. `aria-modal` is deliberately absent — the grid behind stays
    // readable, and claiming modality would lie to a screen reader.
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-label', options.ariaLabel);
    wrapper.appendChild(options.gui);

    const host = portalHostFor(options.cellEl);
    host.appendChild(wrapper);

    const reposition = (): void => {
      const anchor = options.cellEl.getBoundingClientRect();
      // Width is pinned to the cell *before* placement, so the popup lines up
      // with its column edge to edge and `placeOverlay` flips and clamps
      // against the real width rather than a shrink-wrapped guess. Setting it
      // rather than only raising `min-width` is what makes a wide list stop
      // overflowing its column, which a minimum alone could never do.
      const width = Math.max(anchor.width, MIN_POPUP_WIDTH);
      wrapper.style.width = `${width}px`;

      // Measured with the previous cap released. `offsetHeight` reports the
      // *clamped* height, so re-placing a popup that had been squeezed into a
      // sliver would report that sliver as its natural size, conclude it fits
      // anywhere, and leave it squeezed for the rest of the session.
      wrapper.style.maxHeight = '';
      const naturalHeight = wrapper.offsetHeight;

      const { x, y, maxHeight, placement } = placeOverlay({
        anchor,
        width,
        height: naturalHeight,
        // A side has to be able to hold a usable list, not merely *a* list —
        // otherwise a cell near the bottom of the window keeps a two-line
        // peephole rather than flipping to the room above it.
        minHeight: MIN_POPUP_HEIGHT,
        // No room below means open upwards, full stop. A list that opens
        // downwards off the bottom edge cannot be read however it is clamped.
        fallback: 'opposite',
      });
      // Positioning is geometry, not theming: these are computed viewport
      // coordinates that no stylesheet could know, which is why they are the
      // one legitimate use of inline style in this module. Everything visual —
      // colour, radius, shadow, padding — lives in `editors.css.ts`.
      wrapper.style.left = `${x}px`;
      wrapper.style.top = `${y}px`;
      wrapper.style.maxHeight = `${maxHeight}px`;
      wrapper.dataset.placement = placement;
    };

    reposition();
    // Revealed only once placed — see the note on `reposition` above.
    wrapper.classList.add(`${POPUP_CLASS}--visible`);

    let closed = false;

    /**
     * A second placement once the browser has laid the content out.
     *
     * The first one runs in the same task that built the editor, when a list
     * whose options are still being appended — or whose fonts and flex sizing
     * have not resolved — measures shorter than it will ever render. Placement
     * decided from that measurement puts a full list in the gap a nearly-empty
     * one would have fitted. Re-running a frame later costs one reflow per
     * popup and is the difference between a flipped dropdown and a clipped one.
     */
    const settle = requestAnimationFrame(() => {
      if (closed) return;
      reposition();
    });

    /**
     * Outside-click dismissal, on the capture phase so it sees the press before
     * any grid handler can act on it, and on `pointerdown` rather than `click`
     * so a drag that starts outside dismisses immediately.
     */
    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null;
      if (target && (wrapper.contains(target) || options.cellEl.contains(target))) return;
      options.onDismiss();
    };

    /**
     * Scrolling the grid dismisses the popup.
     *
     * Following the anchor was the obvious behaviour and the wrong one: the
     * popup is portalled out of the grid, so it does not clip at the viewport
     * edge the way its cell does. Scrolled far enough, a repositioned popup
     * sails over the header, the toolbar and out of the grid entirely while
     * still claiming to belong to a cell nobody can see. Dismissing is also a
     * commit, so the user's choice is kept either way.
     *
     * The popup's own scrolling — a long option list under the cursor — is
     * explicitly not the grid moving, and must not close the editor the user is
     * reading. A document-level scroll reports `document` as its target, which
     * `contains` correctly rejects.
     */
    const onScroll = (event: Event): void => {
      const target = event.target as Node | null;
      if (target && wrapper.contains(target)) return;
      options.onDismiss();
    };
    const onResize = (): void => reposition();

    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);

    return {
      element: wrapper,
      reposition,
      close: (): void => {
        if (closed) return;
        closed = true;
        cancelAnimationFrame(settle);
        document.removeEventListener('pointerdown', onPointerDown, true);
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onResize);
        wrapper.remove();
      },
    };
  }
}
