/**
 * Puts an editor's GUI on screen and takes it off again.
 *
 * Everything about *where* an editor lives — inline in the cell or portalled
 * into a popup — plus the accessibility wiring that has to follow it (the
 * invalid state, the error message, the live-region announcement) is owned
 * here, so {@link EditorManager} can stay a state machine and never touch the
 * DOM directly.
 *
 * @packageDocumentation
 */

import type { ICellEditor } from '../types/cell-editor.types';
import type { InvalidResult } from '../types/validation.types';
import { FocusManager } from './focus-manager';
import { PopupService, type PopupHandle } from './popup-service';

/** Class applied to the cell while one of its editors is open. */
const EDITING_CLASS = 'pg-cell--editing';
/**
 * Class that plays the one-shot red border flash on a rejected value.
 *
 * A *transient* signal, not a state: the cell pulses red and returns to normal,
 * while the reason travels to a toast. A persistent red border plus an inline
 * message competed with the editor for the same few pixels, pushed the row
 * around, and left the grid looking broken long after the user had understood
 * the problem.
 */
const INVALID_FLASH_CLASS = 'pg-cell--invalid-flash';
/** How long {@link INVALID_FLASH_CLASS} stays on, in ms. Matches the CSS animation. */
const INVALID_FLASH_MS = 600;
/** Class of the grid-wide polite live region used to announce failures. */
const LIVE_REGION_CLASS = 'pg-editor-live-region';

/**
 * Reports a validation failure to the user outside the cell.
 *
 * Wired to the grid's `ToastService` by `GridCore`. A function rather than the
 * service itself so this module keeps no dependency on the toast implementation
 * and stays trivially testable.
 */
export type InvalidReporter = (result: InvalidResult) => void;

/** Options for {@link EditorHost.mount}. */
export interface EditorMountOptions {
  readonly editor: ICellEditor;
  /** The `.pg-cell` element. */
  readonly cellEl: HTMLElement;
  /** The `.pg-cell__inner` element an inline editor replaces the contents of. */
  readonly innerEl: HTMLElement;
  /** Accessible name for the editor — the column header. */
  readonly label: string;
  /** Invoked when a popup editor is dismissed by an outside click. */
  readonly onDismiss: () => void;
}

/** A mounted editor, owning everything that has to be undone on teardown. */
export interface MountedEditor {
  /** The editor's root element, as returned by `getGui()`. */
  readonly gui: HTMLElement;
  /** `true` when the editor was portalled rather than placed inline. */
  readonly isPopup: boolean;
  /**
   * Signals a validation failure: flashes the cell, marks the control invalid
   * for assistive technology, and reports the message through the configured
   * {@link InvalidReporter}. Pass `null` to clear the invalid state.
   */
  setInvalid(result: InvalidResult | null): void;
  /** Removes the editor, restores the cell, and releases every listener. */
  unmount(): void;
}

/**
 * Mounts editors inline or in a popup.
 *
 * One instance per grid, composed from a {@link PopupService} and a
 * {@link FocusManager} rather than inheriting from or hard-coding either — the
 * service composition the architecture calls for, and what lets a host
 * application swap the popup implementation without touching this class.
 */
export class EditorHost {
  /**
   * The grid's single polite live region, created lazily.
   *
   * One per grid rather than one per session: a region has to be in the DOM
   * *before* text is written into it for assistive technology to announce the
   * change, so creating it per edit would silently announce nothing.
   */
  private liveRegion: HTMLElement | null = null;

  /** Where a rejected value's message is sent. See {@link setInvalidReporter}. */
  private report: InvalidReporter | null = null;

  /** Pending flash timers, so teardown cannot leave a class stuck on a cell. */
  private readonly flashTimers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly popups: PopupService,
    private readonly focus: FocusManager,
  ) {}

  /**
   * Registers where validation failures are surfaced.
   *
   * `GridCore` points this at the grid's `ToastService`. Left unset — in a
   * bare-bones embedding or a unit test — the failure still flashes the cell
   * and is announced to assistive technology; only the toast is skipped.
   */
  setInvalidReporter(report: InvalidReporter): void {
    this.report = report;
  }

  /**
   * Places `editor` on screen.
   *
   * The cell's rendered content is hidden rather than removed for an inline
   * editor, so cancelling an edit restores the original cell without asking the
   * renderer to run again — which matters for a cell holding an `<img>` mid-load
   * or a painted `<canvas>`.
   */
  mount(options: EditorMountOptions): MountedEditor {
    const { editor, cellEl, innerEl, label } = options;
    const gui = editor.getGui();
    const isPopup = editor.isPopup?.() === true;

    gui.classList.add('pg-editor-root');
    // The editor is the cell's control now, so it carries the column's name.
    // Without this a screen reader announces an unlabelled text box.
    if (!gui.hasAttribute('aria-label') && !gui.hasAttribute('aria-labelledby')) {
      gui.setAttribute('aria-label', label);
    }

    this.focus.capture();
    cellEl.classList.add(EDITING_CLASS);

    let popup: PopupHandle | null = null;
    let releaseTrap: (() => void) | null = null;
    /** Children hidden to make room for an inline editor, restored on unmount. */
    const hidden: ChildNode[] = [];

    if (isPopup) {
      popup = this.popups.open({
        gui,
        cellEl,
        ariaLabel: label,
        onDismiss: options.onDismiss,
      });
      releaseTrap = this.focus.trap(popup.element);
    } else {
      // Detached into an array rather than cleared, so the exact nodes the
      // renderer produced come back on cancel.
      while (innerEl.firstChild) {
        hidden.push(innerEl.firstChild);
        innerEl.removeChild(innerEl.firstChild);
      }
      innerEl.appendChild(gui);
    }

    // Focus *after* the GUI is in the document, and as part of mounting rather
    // than left to each editor: `focus()` on a detached element is a no-op and
    // `select()` on one silently selects nothing, so an editor that focused
    // itself in `buildGui` would open with the caret nowhere. Doing it here is
    // what gives every editor the spreadsheet opening state — the existing text
    // presented selected, so the first keystroke replaces it — instead of only
    // the handful that happen to focus themselves in `afterGuiAttached`.
    //
    // Editors that *do* focus in `afterGuiAttached` (the native pickers) are
    // unaffected: re-focusing an already-focused element fires no events.
    this.focus.focusInitial(editor, gui);

    const setInvalid = (result: InvalidResult | null): void => {
      if (!result) {
        gui.removeAttribute('aria-invalid');
        return;
      }
      // `aria-invalid` is the only *persistent* mark: it is state, not
      // notification, and a screen-reader user re-reading the field must still
      // learn it is rejected after the flash and the toast have gone.
      gui.setAttribute('aria-invalid', 'true');
      this.flashInvalid(cellEl);
      this.announce(result.message);
      this.report?.(result);
    };

    /** Guards against a second `unmount`, which a cancel racing a commit produces. */
    let unmounted = false;

    return {
      gui,
      isPopup,
      setInvalid,
      unmount: (): void => {
        if (unmounted) return;
        unmounted = true;

        releaseTrap?.();
        editor.destroy?.();

        if (popup) {
          popup.close();
        } else {
          // Restored only while the editor is still what the cell contains. If
          // something repainted the cell underneath the open editor, the nodes
          // hidden at mount are stale — appending them next to freshly rendered
          // content is how a cell ends up displaying its value twice.
          const ownsCell = gui.parentNode === innerEl;
          gui.remove();
          if (ownsCell) for (const node of hidden) innerEl.appendChild(node);
        }
        hidden.length = 0;

        cellEl.classList.remove(EDITING_CLASS);
        this.clearFlash(cellEl);
        this.focus.restore(cellEl);
      },
    };
  }

  /**
   * Pulses the cell's border red once.
   *
   * The class is removed and re-added across a reflow so a second rejection in
   * a row replays the animation instead of being swallowed by the first one
   * still running — the same restart technique the commit flash uses.
   */
  private flashInvalid(cellEl: HTMLElement): void {
    this.clearFlash(cellEl);
    cellEl.classList.remove(INVALID_FLASH_CLASS);
    void cellEl.offsetWidth;
    cellEl.classList.add(INVALID_FLASH_CLASS);

    this.flashTimers.set(
      cellEl,
      setTimeout(() => {
        cellEl.classList.remove(INVALID_FLASH_CLASS);
        this.flashTimers.delete(cellEl);
      }, INVALID_FLASH_MS),
    );
  }

  /** Cancels a pending flash timer for `cellEl`, if any. */
  private clearFlash(cellEl: HTMLElement): void {
    const timer = this.flashTimers.get(cellEl);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.flashTimers.delete(cellEl);
    cellEl.classList.remove(INVALID_FLASH_CLASS);
  }

  /**
   * Announces `message` politely.
   *
   * The text is cleared and re-set on the next frame when it repeats, because a
   * live region whose content does not change produces no announcement — so
   * failing the same rule twice in a row would be silent.
   */
  private announce(message: string): void {
    const region = this.ensureLiveRegion();
    if (region.textContent === message) {
      region.textContent = '';
      requestAnimationFrame(() => { region.textContent = message; });
      return;
    }
    region.textContent = message;
  }

  /** Creates the grid's live region on first use. See {@link liveRegion}. */
  private ensureLiveRegion(): HTMLElement {
    if (this.liveRegion?.isConnected) return this.liveRegion;
    const region = document.createElement('div');
    region.className = LIVE_REGION_CLASS;
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
    this.liveRegion = region;
    return region;
  }

  /** Removes the live region and cancels any pending flash. Called on grid destroy. */
  destroy(): void {
    for (const timer of this.flashTimers.values()) clearTimeout(timer);
    this.flashTimers.clear();
    this.liveRegion?.remove();
    this.liveRegion = null;
  }
}
