/**
 * Focus custody for an edit session.
 *
 * Editing takes keyboard focus away from the grid and must give it back, or the
 * user's next arrow key goes nowhere and the cell they were on is lost. That
 * hand-off is easy to get subtly wrong in a dozen places, so it lives here: one
 * object captures focus on the way in and restores it on the way out.
 *
 * @packageDocumentation
 */

import type { ICellEditor } from '../types/cell-editor.types';

/**
 * Elements that can hold keyboard focus, as a selector.
 *
 * Deliberately excludes `[tabindex="-1"]`: such an element is programmatically
 * focusable but explicitly removed from tab order, so treating it as "the first
 * thing to focus" would put the caret somewhere the author opted out of.
 */
const FOCUSABLE_SELECTOR = [
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Moves focus into an editor and returns it afterwards.
 *
 * One instance per grid; a session calls {@link capture} then
 * {@link focusInitial}, and {@link restore} on teardown.
 */
export class FocusManager {
  /** Where focus was when the session opened, so it can be handed back. */
  private previous: HTMLElement | null = null;

  /**
   * Remembers the currently-focused element.
   *
   * Call before mounting an editor. Records `null` for `<body>` — restoring
   * focus *to the body* is the same as not restoring it, and pretending
   * otherwise would steal focus from wherever it legitimately moved on.
   */
  capture(): void {
    const active = document.activeElement;
    this.previous = active instanceof HTMLElement && active !== document.body ? active : null;
  }

  /**
   * Gives focus back to the element {@link capture} recorded.
   *
   * Skipped when that element has since left the document — a recycled cell, a
   * collapsed row — because focusing a detached node silently moves focus to
   * `<body>` and breaks grid keyboard navigation until the user clicks again.
   *
   * @param fallback - Focused instead when the captured element is gone;
   *   typically the `.pg-cell` the session belonged to.
   */
  restore(fallback?: HTMLElement | null): void {
    const target = this.previous?.isConnected ? this.previous : fallback ?? null;
    this.previous = null;
    if (target?.isConnected) target.focus({ preventScroll: true });
  }

  /**
   * Puts the caret where the user expects it when an editor opens.
   *
   * Prefers the editor's own {@link ICellEditor.focus} — only the editor knows
   * that, say, its search box matters and its option list does not. Falls back
   * to the first focusable descendant, then to the root itself.
   */
  focusInitial(editor: ICellEditor, gui: HTMLElement): void {
    if (typeof editor.focus === 'function') {
      editor.focus();
      return;
    }
    const target = gui.matches(FOCUSABLE_SELECTOR)
      ? gui
      : gui.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (target ?? gui).focus({ preventScroll: true });
  }

  /**
   * Keeps Tab inside `container` until the returned disposer is called.
   *
   * Applied to popup editors only. An inline editor deliberately lets Tab
   * escape — that is how Tab-to-commit-and-move works — but a popup is a
   * self-contained surface, and tabbing out of one into the page behind it
   * leaves an orphaned editor open over content the user is now typing into.
   *
   * @returns Disposer that removes the trap.
   */
  trap(container: HTMLElement): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        // Nothing to cycle between; swallow Tab so focus cannot leak out to the
        // page behind the popup.
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }
}
