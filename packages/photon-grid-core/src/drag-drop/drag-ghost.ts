/**
 * Transform-based positioning for the floating chip that follows the cursor
 * during a drag.
 *
 * Positioning a fixed element with `style.left` / `style.top` dirties layout and
 * paint on every write. Because the drag handlers then read geometry back in the
 * same handler, that write also forces a *synchronous* layout flush — the single
 * most expensive thing a pointer handler can do.
 *
 * Writing a translation instead keeps the chip on the compositor: no layout, no
 * paint, just a transfer. The translation is published as two CSS custom
 * properties so the composed transform stays in the theme stylesheet, where the
 * chip's other offsets (such as the row ghost's vertical centring) already live
 * and can be preserved. This mirrors the `--pg-drag-x` / `--pg-scroll-x` idiom
 * used throughout the renderer.
 *
 * @packageDocumentation
 */

/** Custom property carrying the ghost's horizontal position, in CSS pixels. */
export const GHOST_X_VAR = '--pg-ghost-x';

/** Custom property carrying the ghost's vertical position, in CSS pixels. */
export const GHOST_Y_VAR = '--pg-ghost-y';

/**
 * Positions and state-flags a drag chip without touching layout.
 *
 * Deliberately does **not** build the chip: each drag path composes its own
 * content (icons, label, badges) from its own renderers. This class owns only
 * the parts that run on the hot path — the position write and the state-class
 * toggles — and guards both so an unchanged frame performs no DOM work at all.
 *
 * @example
 * ```ts
 * const ghost = new DragGhost();
 * ghost.attach(chipEl, 14, 0);      // 14px to the right of the cursor
 *
 * // per frame:
 * ghost.moveTo(x, y);               // no-op when the position is unchanged
 * ghost.setFlag('pg-col-drag-ghost--hide', isOutside);
 *
 * ghost.detach();                   // on drag end
 * ```
 */
export class DragGhost {
  private el: HTMLElement | null = null;
  private offsetX = 0;
  private offsetY = 0;
  /** `NaN` until the first {@link moveTo}, so the initial write is never elided. */
  private lastX = NaN;
  private lastY = NaN;
  /** Live state-class values, mirrored so redundant `classList` writes are skipped. */
  private readonly flags = new Map<string, boolean>();

  /** The element currently being positioned, or `null`. */
  get element(): HTMLElement | null { return this.el; }

  /** `true` while an element is attached. */
  get isAttached(): boolean { return this.el !== null; }

  /**
   * Takes ownership of a chip element's position.
   *
   * @param el      - The chip. It must be `position: fixed` with `top: 0; left: 0`
   *                  and a transform composed from {@link GHOST_X_VAR} /
   *                  {@link GHOST_Y_VAR} in the theme stylesheet.
   * @param offsetX - Horizontal distance from the cursor, in CSS pixels.
   * @param offsetY - Vertical distance from the cursor, in CSS pixels.
   */
  attach(el: HTMLElement, offsetX = 0, offsetY = 0): void {
    this.el = el;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.lastX = NaN;
    this.lastY = NaN;
    this.flags.clear();
  }

  /**
   * Moves the chip to a cursor position, applying the attach-time offsets.
   *
   * Sub-pixel changes are written as-is; only an exactly-unchanged position is
   * skipped. Rounding here would visibly quantise the chip against a smoothly
   * moving pointer.
   *
   * @param x - Client x coordinate of the cursor.
   * @param y - Client y coordinate of the cursor.
   */
  moveTo(x: number, y: number): void {
    if (!this.el) return;
    const px = x + this.offsetX;
    const py = y + this.offsetY;
    if (px === this.lastX && py === this.lastY) return;
    this.lastX = px;
    this.lastY = py;
    this.el.style.setProperty(GHOST_X_VAR, `${px}px`);
    this.el.style.setProperty(GHOST_Y_VAR, `${py}px`);
  }

  /**
   * Toggles a state class, writing to `classList` only when the value changes.
   *
   * The drag handlers re-assert several of these every frame ("outside the grid",
   * "no drop", "scrolling left"); guarding them keeps a steady-state frame free
   * of style invalidation.
   *
   * @param className - The class to toggle.
   * @param on        - Desired presence.
   */
  setFlag(className: string, on: boolean): void {
    if (!this.el) return;
    if (this.flags.get(className) === on) return;
    this.flags.set(className, on);
    this.el.classList.toggle(className, on);
  }

  /**
   * Clears a set of state classes in one pass.
   *
   * @param classNames - Classes to remove.
   */
  clearFlags(...classNames: string[]): void {
    for (const cls of classNames) this.setFlag(cls, false);
  }

  /**
   * Removes the chip from the document and releases the reference.
   *
   * Always removes rather than pooling: a chip's content is rebuilt per gesture
   * anyway (the label and icons differ), so retaining a detached node across
   * drags would hold DOM alive for no reuse.
   */
  detach(): void {
    this.el?.remove();
    this.el = null;
    this.lastX = NaN;
    this.lastY = NaN;
    this.flags.clear();
  }
}
