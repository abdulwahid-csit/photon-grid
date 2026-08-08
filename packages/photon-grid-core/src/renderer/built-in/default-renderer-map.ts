import type { ColumnDataType } from '../../types/column.types';
import type { BuiltInRenderer } from '../../types/built-in-renderer.types';

/**
 * The renderer a column gets when it declares no `renderer` of its own.
 *
 * This is the single authoritative statement of "what does a `type: 'currency'`
 * column look like". Before renderers were named, the same information lived as
 * a `switch` inside `CellRenderer.renderDefaultCell` and, drifted, in
 * `GridCore.renderCellValue`; a table cannot drift from itself.
 *
 * `Record<ColumnDataType, …>` rather than a partial map on purpose: adding a
 * member to {@link ColumnDataType} without deciding how it renders is then a
 * compile error rather than a column that silently falls back to raw text.
 *
 * An author overrides any of these by setting `renderer` explicitly.
 */
export const DEFAULT_RENDERER_BY_TYPE: Record<ColumnDataType, BuiltInRenderer> = {
  string: 'text',
  number: 'number',
  // The interactive checkbox, not the textual Yes/No — `renderer: 'boolean'` is
  // the explicit opt-out to text.
  boolean: 'checkbox',
  date: 'date',
  datetime: 'datetime',
  time: 'time',
  duration: 'duration',
  dropdown: 'badge',
  object: 'badge',
  array: 'list',
  image: 'image',
  currency: 'currency',
  percentage: 'percentage',
  email: 'email',
  phone: 'phone',
  url: 'link',
  color: 'color',
  sparkline: 'sparkline',
  // `custom` means "the author is supplying a renderer"; text is the honest
  // fallback for the case where they have not (yet).
  custom: 'text',
};
