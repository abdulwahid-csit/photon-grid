import type { IconRenderer } from '../../icons/icon-renderer';
import type {
  BaseRendererOptions,
  BuiltInRenderContext,
} from '../../types/built-in-renderer.types';
import { createDiv } from '../dom-utils';

/**
 * Helpers shared by the built-in renderers.
 *
 * Everything here is deliberately allocation-light: these run once per rendered
 * cell, and a viewport can hold a few thousand of them during a fast scroll.
 *
 * @packageDocumentation
 */

/** Class on the element every renderer's output hangs off. */
export const VALUE_CLASS = 'pg-cell__value';

/**
 * Builds the `.pg-cell__value` wrapper.
 *
 * Every renderer emits one, and for `textOnly` renderers it must be the *first*
 * child of `.pg-cell__inner` — that is what `findValueEl` looks for when the
 * Virtual DOM decides whether a cell can be patched with a single `textContent`
 * write.
 *
 * @param modifier - Optional BEM modifier suffix, e.g. `'bool'` → `pg-cell__value--bool`.
 * @param extra - Extra class from the renderer's `cssClass` option.
 */
export function valueSpan(modifier?: string, extra?: string): HTMLElement {
  const el = document.createElement('span');
  let cls = VALUE_CLASS;
  if (modifier) cls += ` ${VALUE_CLASS}--${modifier}`;
  if (extra) cls += ` ${extra}`;
  el.className = cls;
  return el;
}

/**
 * Writes a plain-text cell.
 *
 * `title` mirrors the text so the browser's truncation tooltip never disagrees
 * with what is shown — the same thing `CellPatcher` does when it patches.
 */
export function renderText(ctx: BuiltInRenderContext, text: string, modifier?: string): void {
  const opts = ctx.options as BaseRendererOptions;
  const span = valueSpan(modifier, opts.cssClass);
  span.textContent = text;
  span.title = text;
  ctx.inner.appendChild(span);
}

/** `true` when a value has nothing to show — `null`, `undefined`, or an empty/blank string. */
export function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

/**
 * Renders the empty state and reports whether it did.
 *
 * Every renderer calls this first. Returning a boolean rather than throwing or
 * writing nothing keeps the "no value" decision in one place instead of each
 * renderer inventing its own.
 *
 * @returns `true` when the value was empty and the cell has been filled.
 */
export function renderIfEmpty(ctx: BuiltInRenderContext): boolean {
  if (!isEmptyValue(ctx.value)) return false;
  const opts = ctx.options as BaseRendererOptions;
  renderText(ctx, opts.emptyText ?? '');
  return true;
}

/**
 * Resolves an option that may be a literal or a function of the cell value.
 *
 * Lets `{ color: '#f00' }` and `{ color: (v) => v > 90 ? 'red' : 'green' }` be
 * the same option rather than two.
 */
export function resolveOption<T>(
  option: T | ((value: unknown) => T | undefined) | undefined,
  value: unknown,
): T | undefined {
  return typeof option === 'function'
    ? (option as (value: unknown) => T | undefined)(value)
    : option;
}

/** The context's icon renderer, or `null` when the caller supplied none. */
export function icons(ctx: BuiltInRenderContext): IconRenderer | null {
  return (ctx.icons as IconRenderer | null) ?? null;
}

/**
 * Appends an icon by registry name.
 *
 * Goes through `IconRenderer` rather than inlining SVG so every icon stays
 * replaceable through the icon registry.
 *
 * @returns The mounted element, or `null` when no icon renderer is available.
 */
export function appendIcon(
  ctx: BuiltInRenderContext,
  parent: HTMLElement,
  name: string,
  size?: number,
  color?: string,
): HTMLElement | null {
  const renderer = icons(ctx);
  if (!renderer) return null;
  const el = renderer.render(name, { size: size ?? 14, color });
  parent.appendChild(el);
  return el;
}

/**
 * Builds a pill element, the shape `badge`, `chip`, `tag` and `list` share.
 *
 * A colour is applied as a translucent fill plus solid text, matching the
 * convention the grid already used for `dropdownOptions[].color`.
 */
export function pill(label: string, color?: string, modifier?: string): HTMLElement {
  const el = createDiv(modifier ? `pg-badge pg-badge--${modifier}` : 'pg-badge');
  el.textContent = label;
  if (color) {
    // Two hex digits of alpha — the existing badge convention, kept so a colour
    // that looked right before still looks right.
    el.style.backgroundColor = `${color}20`;
    el.style.color = color;
  }
  return el;
}

/**
 * A stable colour for an arbitrary string.
 *
 * Used by the `tag` renderer so repeated values are consistently coloured
 * without the author enumerating every one. HSL with fixed saturation and
 * lightness keeps every generated colour legible against the cell background
 * and in the same visual family, which a raw hash-to-RGB would not.
 */
export function colorForText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0; // force 32-bit, avoiding unbounded growth on long strings
  }
  return `hsl(${Math.abs(hash) % 360}, 62%, 45%)`;
}

/** Coerces to a finite number, or `null` when the value is not numeric. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** `true` when the value looks like something an `<img src>` can load. */
export function isImageSource(value: string): boolean {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('/') ||
    value.startsWith('./') ||
    /\.(png|jpe?g|gif|webp|svg|avif)(\?|#|$)/i.test(value)
  );
}

/**
 * Derives display initials from a name.
 *
 * First and last word rather than the first two, so "Maria del Carmen Sanchez"
 * reads as "MS" — the pair a reader actually uses to identify someone.
 */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
