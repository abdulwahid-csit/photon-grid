import type {
  ButtonRendererOptions,
  BuiltInRendererDefinition,
  HtmlRendererOptions,
  JsonRendererOptions,
  SparklineRendererOptions,
} from '../../types/built-in-renderer.types';
import { SparklineRenderer } from '../../chart/sparkline/sparkline-renderer';
import { createDiv } from '../dom-utils';
import { renderIfEmpty, renderText, valueSpan } from './shared';

/** A `<canvas>` carrying the sparkline instance drawing into it. */
type SparklineCanvas = HTMLCanvasElement & { _pgSparkline?: SparklineRenderer };

/**
 * Mini chart. Configuration comes from `ColumnDef.sparkline`.
 *
 * The first draw is deferred to the next animation frame because
 * `SparklineRenderer` measures the canvas to size its backing buffer, and a
 * canvas that is not laid out yet measures zero.
 */
export const sparklineRenderer: BuiltInRendererDefinition<SparklineRendererOptions> = {
  name: 'sparkline',
  textOnly: false,
  render(ctx) {
    const span = valueSpan('sparkline', ctx.options.cssClass);
    const wrapper = createDiv('pg-sparkline-wrapper');
    const canvas = document.createElement('canvas');
    canvas.className = 'pg-sparkline';
    // Decorative: the series is available as the cell's value, and reading out
    // a chart point by point helps nobody.
    canvas.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(canvas);
    span.appendChild(wrapper);
    ctx.inner.appendChild(span);

    const config = ctx.colDef.sparkline ?? {};
    const value = ctx.value;
    requestAnimationFrame(() => {
      if (!canvas.isConnected) return;
      if (canvas.clientWidth > 0 && canvas.clientHeight > 0) {
        // Parked on the element so a live feed can reach the instance without
        // the grid having to track it — this is also how `patch` finds it.
        (canvas as SparklineCanvas)._pgSparkline = new SparklineRenderer(canvas, value, config);
      }
    });
  },

  patch(cellEl, ctx) {
    const canvas = cellEl.querySelector<SparklineCanvas>('canvas.pg-sparkline');
    const renderer = canvas?._pgSparkline;
    if (!renderer) return false;
    // Redrawing into the mounted canvas has no blank frame; rebuilding would
    // defer the first paint by a frame on every tick, which reads as flicker.
    renderer.setData(ctx.value);
    return true;
  },
};

/**
 * A structured value as compact JSON.
 *
 * `textOnly`, so the patcher owns `title` — which is why the pretty-printed
 * form is not offered as a tooltip: it would be overwritten on the first value
 * change, and a tooltip that silently stops matching is worse than none.
 */
export const jsonRenderer: BuiltInRendererDefinition<JsonRendererOptions> = {
  name: 'json',
  textOnly: true,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    let text: string;
    try {
      text = JSON.stringify(ctx.value) ?? '';
    } catch {
      // Circular structures are real in row data joined from an ORM.
      text = String(ctx.value);
    }
    renderText(ctx, text, 'json');
  },
};

/**
 * Raw HTML from the cell value.
 *
 * The column-level equivalent of `ColumnDef.renderHtml`, and carries the same
 * warning: the value is written with `innerHTML` and **is not sanitised**. Only
 * point a column at this when the markup is yours. `trusted: true` is required
 * rather than optional so that acknowledgement is visible at the call site.
 */
export const htmlRenderer: BuiltInRendererDefinition<HtmlRendererOptions> = {
  name: 'html',
  textOnly: false,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const span = valueSpan('html', ctx.options.cssClass);
    span.innerHTML = String(ctx.value);
    ctx.inner.appendChild(span);
  },
};

/** Marker the delegated click handler in `GridCore` looks for. */
export const CELL_BUTTON_ATTR = 'data-cell-button';

/**
 * An action button in a cell.
 *
 * Carries no listener of its own: `GridCore` delegates one click handler on the
 * grid root and emits `CELL_BUTTON_CLICKED`, so a viewport of a thousand button
 * cells costs one listener rather than a thousand. The same reason the boolean
 * checkbox is wired that way.
 */
export const buttonRenderer: BuiltInRendererDefinition<ButtonRendererOptions> = {
  name: 'button',
  textOnly: false,
  render(ctx) {
    const { options } = ctx;
    const label =
      typeof options.label === 'function'
        ? options.label(ctx.value, ctx.row)
        : (options.label ?? ctx.formattedValue);

    const span = valueSpan('button', options.cssClass);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pg-cell-button pg-cell-button--${options.variant ?? 'secondary'}`;
    button.setAttribute(CELL_BUTTON_ATTR, options.action ?? '');
    // The grid owns focus through its roving cell model; a button per row would
    // otherwise put thousands of stops in the tab order.
    button.tabIndex = -1;
    button.disabled = options.disabled?.(ctx.value, ctx.row) ?? false;

    if (options.icon && ctx.icons) button.appendChild(ctx.icons.render(options.icon, { size: 13 }));
    if (label) {
      const text = document.createElement('span');
      text.textContent = label;
      button.appendChild(text);
    }

    span.appendChild(button);
    ctx.inner.appendChild(span);
  },

  patch(cellEl, ctx) {
    const button = cellEl.querySelector<HTMLButtonElement>(`button[${CELL_BUTTON_ATTR}]`);
    if (!button) return false;
    // `disabled` is value-dependent, so it must be re-evaluated or a row whose
    // state changed keeps a button it should no longer offer.
    button.disabled = ctx.options.disabled?.(ctx.value, ctx.row) ?? false;
    if (typeof ctx.options.label === 'function') {
      const text = button.querySelector('span');
      if (text) text.textContent = ctx.options.label(ctx.value, ctx.row);
    }
    return true;
  },
};
