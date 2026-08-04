import type {
  BooleanRendererOptions,
  BuiltInRenderContext,
  BuiltInRendererDefinition,
  CheckboxRendererOptions,
} from '../../types/built-in-renderer.types';
import { buildBooleanCellCheckbox, syncBooleanCellCheckbox } from './checkbox-element';
import { renderText, valueSpan } from './shared';

/**
 * Boolean as text — `Yes` / `No`.
 *
 * The explicit opt-out from the interactive checkbox a `type: 'boolean'` column
 * gets by default. Matches the strings `formatValue` produces, so a column
 * using this renderer reads the same on screen, in an export and on the
 * clipboard.
 */
export const booleanRenderer: BuiltInRendererDefinition<BooleanRendererOptions> = {
  name: 'boolean',
  textOnly: true,
  render(ctx) {
    // No empty check: `false` is a value, not an absence, and must render.
    // A genuinely absent value is falsy and correctly reads as "No" — the same
    // thing `formatValue` has always done.
    renderText(ctx, ctx.value ? (ctx.options.trueText ?? 'Yes') : (ctx.options.falseText ?? 'No'));
  },
};

/**
 * Shared body for `checkbox` and `switch` — identical behaviour, different skin.
 *
 * Both delegate to {@link buildBooleanCellCheckbox}, so the enabled/disabled
 * rule lives in exactly one place and the delegated toggle handler in `GridCore`
 * finds either control through the same `[data-bool-cell]` marker.
 */
function renderToggle(
  ctx: BuiltInRenderContext<CheckboxRendererOptions>,
  modifier: 'bool' | 'switch',
): void {
  const checked = !!ctx.value;
  const box = buildBooleanCellCheckbox(checked, ctx.colDef, resolveEditing(ctx));
  if (modifier === 'switch') box.classList.add('pg-cell-checkbox--switch');

  const span = valueSpan(modifier, ctx.options.cssClass);
  span.classList.add(checked ? 'pg-cell--bool-true' : 'pg-cell--bool-false');
  span.appendChild(box);
  ctx.inner.appendChild(span);
}

/**
 * `readOnly` forces the control inert even on an editable column — for a
 * boolean that is derived rather than entered.
 */
function resolveEditing(ctx: BuiltInRenderContext<CheckboxRendererOptions>): boolean | undefined {
  return ctx.options.readOnly ? false : ctx.editingEnabled;
}

/** Flips an existing checkbox rather than replacing the element the user is clicking. */
function patchToggle(
  cellEl: HTMLElement,
  ctx: BuiltInRenderContext<CheckboxRendererOptions>,
): boolean {
  return syncBooleanCellCheckbox(cellEl, ctx.value, ctx.colDef, resolveEditing(ctx));
}

/**
 * Interactive checkbox — the default for `type: 'boolean'` columns.
 *
 * Editable and unlocked columns get a live control that commits through the
 * grid's normal edit pipeline; everything else gets a disabled one that still
 * shows the value.
 */
export const checkboxRenderer: BuiltInRendererDefinition<CheckboxRendererOptions> = {
  name: 'checkbox',
  textOnly: false,
  render: (ctx) => renderToggle(ctx, 'bool'),
  patch: patchToggle,
};

/** The same control as {@link checkboxRenderer}, styled as a sliding switch. */
export const switchRenderer: BuiltInRendererDefinition<CheckboxRendererOptions> = {
  name: 'switch',
  textOnly: false,
  render: (ctx) => renderToggle(ctx, 'switch'),
  patch: patchToggle,
};
