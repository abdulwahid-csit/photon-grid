import type {
  BuiltInRendererDefinition,
  MultilineRendererOptions,
  TextRendererOptions,
} from '../../types/built-in-renderer.types';
import { renderIfEmpty, renderText, valueSpan } from './shared';

/**
 * Plain text — the default for `string` columns, and the fallback whenever a
 * more specific renderer cannot be resolved.
 *
 * `textOnly`, so the Virtual DOM updates these cells with a single
 * `textContent` write.
 */
export const textRenderer: BuiltInRendererDefinition = {
  name: 'text',
  textOnly: true,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const { maxLength } = ctx.options as TextRendererOptions;
    const text = ctx.formattedValue;
    // Truncation is applied to the formatted string, not the raw value, so a
    // `valueFormatter` decides what gets truncated.
    renderText(ctx, maxLength && text.length > maxLength ? `${text.slice(0, maxLength)}…` : text);
  },
};

/**
 * Text that keeps its line breaks.
 *
 * Wrapping is done with `white-space: pre-line` rather than `<br>` elements
 * precisely so the renderer stays `textOnly`: the Virtual DOM's text patch
 * writes `textContent`, which would destroy any child elements. CSS gets the
 * same result and survives patching.
 *
 * Row height is not adjusted — pair this with `rowHeightMode: 'auto'` when the
 * content should drive it.
 */
export const multilineRenderer: BuiltInRendererDefinition = {
  name: 'multiline',
  textOnly: true,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const opts = ctx.options as MultilineRendererOptions;
    const span = valueSpan('multiline', opts.cssClass);
    span.textContent = ctx.formattedValue;
    span.title = ctx.formattedValue;
    if (opts.maxLines && opts.maxLines > 0) {
      span.style.setProperty('--pg-cell-max-lines', String(opts.maxLines));
      span.classList.add('pg-cell__value--clamped');
    }
    ctx.inner.appendChild(span);
  },
};
