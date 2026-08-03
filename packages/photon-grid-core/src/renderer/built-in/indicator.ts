import type {
  BuiltInRendererDefinition,
  IconRendererOptions,
  ProgressRendererOptions,
  RatingRendererOptions,
} from '../../types/built-in-renderer.types';
import { createDiv } from '../dom-utils';
import { renderIfEmpty, resolveOption, toNumber, valueSpan } from './shared';

/**
 * An icon, optionally with a label.
 *
 * The icon is named, never inline SVG: it resolves through `IconRenderer` so a
 * consumer can replace the whole icon set without touching column definitions,
 * which is what the icon registry exists for.
 */
export const iconRenderer: BuiltInRendererDefinition<IconRendererOptions> = {
  name: 'icon',
  textOnly: false,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;

    const { options } = ctx;
    // Falling back to the value lets a column store icon names directly.
    const name = resolveOption(options.icon, ctx.value) ?? String(ctx.value);
    const color = resolveOption(options.color, ctx.value);
    const label = options.label?.(ctx.value);

    const span = valueSpan('icon', options.cssClass);
    if (ctx.icons) {
      span.appendChild(ctx.icons.render(name, { size: options.size ?? 16, color }));
    }
    if (label !== undefined) {
      const text = document.createElement('span');
      text.className = 'pg-cell-icon__label';
      text.textContent = label;
      span.appendChild(text);
    }
    span.title = label ?? String(ctx.value);
    ctx.inner.appendChild(span);
  },
};

/** Icon used for a rating symbol when the column names none. */
const DEFAULT_RATING_ICON = 'sparkle';

/**
 * A score drawn as filled and empty symbols.
 *
 * Every symbol is always present — the filled ones carry a class rather than
 * the empty ones being omitted — so the row's width does not shift as values
 * change, and {@link ratingRenderer.patch} can re-score in place by toggling
 * classes instead of rebuilding.
 */
export const ratingRenderer: BuiltInRendererDefinition<RatingRendererOptions> = {
  name: 'rating',
  textOnly: false,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;

    const { options } = ctx;
    const max = options.max ?? 5;
    const score = Math.round(toNumber(ctx.value) ?? 0);

    const span = valueSpan('rating', options.cssClass);
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', `${score} out of ${max}`);

    for (let i = 1; i <= max; i++) {
      const symbol = createDiv(
        i <= score ? 'pg-cell-rating__item pg-cell-rating__item--on' : 'pg-cell-rating__item',
      );
      if (ctx.icons) symbol.appendChild(ctx.icons.render(options.icon ?? DEFAULT_RATING_ICON, { size: 13 }));
      span.appendChild(symbol);
    }

    if (options.showValue) {
      const text = document.createElement('span');
      text.className = 'pg-cell-rating__value';
      text.textContent = String(score);
      span.appendChild(text);
    }
    ctx.inner.appendChild(span);
  },

  patch(cellEl, ctx) {
    const span = cellEl.querySelector<HTMLElement>('.pg-cell__value--rating');
    if (!span) return false;

    const max = ctx.options.max ?? 5;
    const score = Math.round(toNumber(ctx.value) ?? 0);
    const items = span.querySelectorAll<HTMLElement>('.pg-cell-rating__item');
    if (items.length !== max) return false; // `max` changed — a rebuild is correct

    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('pg-cell-rating__item--on', i < score);
    }
    span.setAttribute('aria-label', `${score} out of ${max}`);

    const valueEl = span.querySelector<HTMLElement>('.pg-cell-rating__value');
    if (valueEl) valueEl.textContent = String(score);
    return true;
  },
};

/** Resolves the bar's bounds: renderer options, then the column's, then 0–100. */
function bounds(ctx: { options: ProgressRendererOptions; colDef: { min?: number | null; max?: number | null } }): {
  min: number;
  max: number;
} {
  return {
    min: ctx.options.min ?? ctx.colDef.min ?? 0,
    max: ctx.options.max ?? ctx.colDef.max ?? 100,
  };
}

/** Fraction of the bar filled, clamped to 0–1. */
function fractionOf(value: unknown, min: number, max: number): number {
  const n = toNumber(value);
  if (n === null || max === min) return 0;
  return Math.min(1, Math.max(0, (n - min) / (max - min)));
}

/**
 * A progress bar.
 *
 * Width and colour are driven through CSS custom properties rather than inline
 * `style.width`/`style.background`, which keeps the visual language themeable
 * (per Photon's styling rules) and makes {@link progressRenderer.patch} a
 * single property write — cheap enough to run on a streaming feed.
 */
export const progressRenderer: BuiltInRendererDefinition<ProgressRendererOptions> = {
  name: 'progress',
  textOnly: false,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;

    const { options } = ctx;
    const { min, max } = bounds({ options, colDef: ctx.colDef });
    const fraction = fractionOf(ctx.value, min, max);

    const span = valueSpan('progress', options.cssClass);
    const track = createDiv('pg-cell-progress');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', String(min));
    track.setAttribute('aria-valuemax', String(max));
    track.setAttribute('aria-valuenow', String(toNumber(ctx.value) ?? min));

    const fill = createDiv('pg-cell-progress__fill');
    track.appendChild(fill);
    span.appendChild(track);
    applyProgress(span, fraction, options, ctx.value);

    if (options.showLabel !== false) {
      const label = document.createElement('span');
      label.className = 'pg-cell-progress__label';
      label.textContent = `${Math.round(fraction * 100)}%`;
      span.appendChild(label);
    }
    ctx.inner.appendChild(span);
  },

  patch(cellEl, ctx) {
    const span = cellEl.querySelector<HTMLElement>('.pg-cell__value--progress');
    if (!span) return false;

    const { min, max } = bounds({ options: ctx.options, colDef: ctx.colDef });
    const fraction = fractionOf(ctx.value, min, max);
    applyProgress(span, fraction, ctx.options, ctx.value);

    const track = span.querySelector<HTMLElement>('.pg-cell-progress');
    track?.setAttribute('aria-valuenow', String(toNumber(ctx.value) ?? min));

    const label = span.querySelector<HTMLElement>('.pg-cell-progress__label');
    if (label) label.textContent = `${Math.round(fraction * 100)}%`;
    return true;
  },
};

/** Writes the two custom properties the progress CSS reads. */
function applyProgress(
  span: HTMLElement,
  fraction: number,
  options: ProgressRendererOptions,
  value: unknown,
): void {
  span.style.setProperty('--pg-progress-fraction', String(fraction));
  const color =
    typeof options.color === 'function' ? options.color(fraction, value) : options.color;
  if (color) span.style.setProperty('--pg-progress-color', color);
}
