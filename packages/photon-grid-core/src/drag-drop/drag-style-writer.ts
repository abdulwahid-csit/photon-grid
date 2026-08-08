/**
 * Change-guarded ownership of a drag's injected `<style>` element.
 *
 * Every reorder drag drives its live preview by writing CSS rules into a
 * `<style>` node — the cheapest way to shift a header cell, its filter cell, and
 * all of its body cells in one operation. But assigning `textContent` is not
 * cheap: the browser re-parses the sheet and recalculates style for every element
 * the new rules could match. During a column drag the grid deliberately renders
 * *all* columns (so every drop target stays hit-testable), so a single rewrite
 * touches the entire header, filter row, and body.
 *
 * The rules only actually change when the drop slot changes — a handful of times
 * across a whole gesture — yet the previous implementations rewrote the sheet on
 * every pointer event. `DragStyleWriter` compares the generated text against what
 * is already live and skips the assignment when they match, turning an unchanged
 * frame from a full style recalculation into one string comparison.
 *
 * @packageDocumentation
 */

/**
 * Owns one `<style>` element for the lifetime of a drag and writes to it only
 * when its content would actually change.
 *
 * @example
 * ```ts
 * const writer = new DragStyleWriter('data-pg-drag');
 * writer.mount();
 *
 * // per frame — a no-op unless `css` differs from the live text:
 * writer.write(css);
 *
 * writer.dispose();   // on drag end
 * ```
 */
export class DragStyleWriter {
  private el: HTMLStyleElement | null = null;
  /**
   * Mirror of the element's current `textContent`.
   *
   * Held in JS rather than read back off the node: reading `textContent` is a
   * DOM access on the hot path, and this class is the only writer.
   */
  private live = '';
  /** Number of assignments actually performed. Exposed for tests and profiling. */
  private writes = 0;

  /**
   * @param marker - Attribute stamped on the element so it is identifiable in
   *                 DevTools and by any cleanup pass (e.g. `'data-pg-drag'`).
   */
  constructor(private readonly marker: string) {}

  /** `true` once {@link mount} has run and {@link dispose} has not. */
  get isMounted(): boolean { return this.el !== null; }

  /**
   * How many times `textContent` has actually been assigned since construction.
   *
   * A well-behaved drag reports a count close to the number of drop-slot changes,
   * not the number of pointer events — which is exactly what this class exists to
   * guarantee, and what the unit tests assert.
   */
  get writeCount(): number { return this.writes; }

  /** The CSS text currently applied. */
  get content(): string { return this.live; }

  /**
   * Creates the `<style>` element and appends it to `document.head`.
   *
   * Idempotent — calling it on an already-mounted writer does nothing, so a
   * re-entrant drag start cannot leak a second node.
   */
  mount(): void {
    if (this.el) return;
    const el = document.createElement('style');
    el.setAttribute(this.marker, '');
    document.head.appendChild(el);
    this.el = el;
    this.live = '';
  }

  /**
   * Applies `css` if and only if it differs from what is already live.
   *
   * @param css - The complete rule text for this frame. Callers build the whole
   *              sheet rather than patching it, which keeps the comparison a
   *              single string equality check.
   * @returns `true` when the DOM was written, `false` when the call was elided.
   */
  write(css: string): boolean {
    if (!this.el || css === this.live) return false;
    this.el.textContent = css;
    this.live = css;
    this.writes++;
    return true;
  }

  /**
   * Empties the sheet, removing every drag transform.
   *
   * @returns `true` when the DOM was written, `false` when it was already empty.
   */
  clear(): boolean {
    return this.write('');
  }

  /**
   * Removes the element from the document and resets the writer.
   *
   * Safe to call more than once; a writer that has been disposed can be
   * {@link mount}ed again for the next gesture.
   */
  dispose(): void {
    this.el?.remove();
    this.el = null;
    this.live = '';
  }
}
