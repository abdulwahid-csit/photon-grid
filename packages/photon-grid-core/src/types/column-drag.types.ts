/**
 * Public configuration surface for column drag-and-drop reordering.
 *
 * Lives in `src/types` (alongside `autofill.types.ts` and the other subsystem
 * configs) so it can be referenced by {@link GridOptions} without pulling the
 * drag engine into the grid's type graph. Every field is optional; the header
 * renderer applies the documented defaults.
 *
 * @packageDocumentation
 */

/**
 * Grid-level options controlling how a column reorder drag behaves. Supplied as
 * `GridOptions.columnDrag`.
 *
 * Per-column opt-out remains `ColumnDef.draggable: false`; this config tunes the
 * gesture itself for every draggable column.
 */
export interface ColumnDragConfig {
  /**
   * Fraction of a neighbouring column the dragged preview must cover before the
   * two exchange places.
   *
   * `0.5` swaps as soon as the preview passes the neighbour's midpoint (the
   * AG Grid / Excel feel); `1` requires the preview to cover the neighbour
   * completely, making reordering more deliberate.
   *
   * Values below `0.5` are clamped: the swap threshold and its mirror image
   * would overlap, letting a stationary pointer satisfy both and flip the order
   * on every frame.
   *
   * @defaultValue 0.5
   */
  enterRatio?: number;

  /**
   * Duration in milliseconds of the slide animation played by the columns that
   * move aside for the preview. The grabbed column always tracks the pointer
   * with no easing.
   *
   * @defaultValue 180
   */
  animationMs?: number;

  /**
   * Disables the slide animation entirely — displaced columns jump straight to
   * their new slot. Useful for reduced-motion presets and automated tests.
   *
   * @defaultValue false
   */
  suppressAnimation?: boolean;
}
