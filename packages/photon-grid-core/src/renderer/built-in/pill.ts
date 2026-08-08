import type { ColumnDef } from '../../types/column.types';
import type {
  BadgeRendererOptions,
  BuiltInRenderContext,
  BuiltInRendererDefinition,
  ChipRendererOptions,
  ListRendererOptions,
  TagRendererOptions,
} from '../../types/built-in-renderer.types';
import { appendIcon, colorForText, pill, renderIfEmpty, renderText, resolveOption, valueSpan } from './shared';

/**
 * The value used to match against `dropdownOptions`.
 *
 * An `object` column stores the whole option; the property naming its value is
 * `objectValueKey`, defaulting to `value`. Ported from `CellRenderer`.
 */
function optionKey(value: unknown, colDef: ColumnDef): unknown {
  if (typeof value === 'object' && value !== null) {
    return (value as Record<string, unknown>)[colDef.objectValueKey ?? 'value'];
  }
  return value;
}

/** The `dropdownOptions` entry matching a value, if any. */
function findOption(
  value: unknown,
  colDef: ColumnDef,
): { label: string; color?: string } | undefined {
  const key = optionKey(value, colDef);
  return colDef.dropdownOptions?.find((o) => String(o.value) === String(key ?? ''));
}

/** Resolves the pill's text and colour from options, then the column's dropdown list. */
function resolveLabelAndColor(
  ctx: BuiltInRenderContext,
  value: unknown,
): { label: string; color?: string } {
  const opts = ctx.options as BadgeRendererOptions;
  const option = findOption(value, ctx.colDef);
  return {
    label: opts.label ? opts.label(value) : (option?.label ?? String(optionKey(value, ctx.colDef) ?? '')),
    color: resolveOption(opts.color, value) ?? option?.color,
  };
}

/**
 * A single pill.
 *
 * The default for `dropdown` and `object` columns, and a direct port of the
 * behaviour those types already had: the label and colour come from
 * `dropdownOptions`, and a value with no matching option renders as plain text
 * rather than an unstyled pill.
 */
export const badgeRenderer: BuiltInRendererDefinition = {
  name: 'badge',
  textOnly: false,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const opts = ctx.options as BadgeRendererOptions;
    const { label, color } = resolveLabelAndColor(ctx, ctx.value);

    // Preserving the original rule: no colour means no pill. A pill exists to
    // encode a status, and a colourless one is just text in a box.
    if (!color) return renderText(ctx, label);

    const span = valueSpan('badge', opts.cssClass);
    span.appendChild(pill(label, color));
    span.title = label;
    ctx.inner.appendChild(span);
  },
};

/** A pill with a leading icon. */
export const chipRenderer: BuiltInRendererDefinition = {
  name: 'chip',
  textOnly: false,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const opts = ctx.options as ChipRendererOptions;
    const { label, color } = resolveLabelAndColor(ctx, ctx.value);

    const span = valueSpan('chip', opts.cssClass);
    const el = pill(label, color, 'chip');
    const iconName = resolveOption(opts.icon, ctx.value);
    if (iconName) {
      // Before the text node the pill already holds.
      const icon = appendIcon(ctx, el, iconName, 12, color);
      if (icon) el.insertBefore(icon, el.firstChild);
    }
    span.appendChild(el);
    span.title = label;
    ctx.inner.appendChild(span);
  },
};

/**
 * A pill whose colour is derived from its own text.
 *
 * The difference from `badge` is where the colour comes from: `badge` needs the
 * author to enumerate `dropdownOptions`, `tag` hashes the value. That makes it
 * the right choice for open-ended vocabularies — labels, teams, tags — where
 * the set is not known in advance but the same value should look the same
 * everywhere.
 */
export const tagRenderer: BuiltInRendererDefinition = {
  name: 'tag',
  textOnly: false,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const opts = ctx.options as TagRendererOptions;
    const { label, color } = resolveLabelAndColor(ctx, ctx.value);
    const resolved = color ?? (opts.autoColor === false ? undefined : colorForText(label));

    const span = valueSpan('tag', opts.cssClass);
    span.appendChild(pill(label, resolved, 'tag'));
    span.title = label;
    ctx.inner.appendChild(span);
  },
};

/**
 * Several values in one cell.
 *
 * The default for `array` columns and a port of that type's behaviour: the
 * first few entries as pills, the remainder collapsed into a `+N` counter so a
 * long list cannot blow out the row. The full list is in the `title`, which is
 * what makes the truncation safe.
 */
export const listRenderer: BuiltInRendererDefinition = {
  name: 'list',
  textOnly: false,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;

    const opts = ctx.options as ListRendererOptions;
    const values = Array.isArray(ctx.value) ? ctx.value : [ctx.value];
    // An empty array is an absence of values, not a list of none.
    if (values.length === 0) return renderText(ctx, opts.emptyText ?? '');

    const labels = values.map((v) => resolveLabelAndColor(ctx, v).label);

    if (opts.variant === 'text') {
      return renderText(ctx, labels.join(opts.separator ?? ', '), 'list');
    }

    const maxVisible = opts.maxVisible ?? 3;
    const span = valueSpan('tags', opts.cssClass);
    for (let i = 0; i < Math.min(values.length, maxVisible); i++) {
      const { color } = resolveLabelAndColor(ctx, values[i]);
      span.appendChild(pill(labels[i], color));
    }
    if (values.length > maxVisible) {
      span.appendChild(pill(`+${values.length - maxVisible}`, undefined, 'overflow'));
    }
    span.title = labels.join(', ');
    ctx.inner.appendChild(span);
  },
};
