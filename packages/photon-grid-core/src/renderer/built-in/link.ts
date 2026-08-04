import type {
  BuiltInRenderContext,
  BuiltInRendererDefinition,
  LinkRendererOptions,
} from '../../types/built-in-renderer.types';
import { renderIfEmpty, valueSpan } from './shared';

/** URI scheme prepended when the value carries none. */
type Scheme = 'mailto:' | 'tel:' | null;

/**
 * Characters stripped from a phone number before it becomes a `tel:` href.
 *
 * Dialling agents want digits, `+` and extension separators; the spacing and
 * bracketing a human number is written with are noise to them.
 */
const PHONE_NOISE = /[^\d+;,*#]/g;

/** `true` when the string already carries a URI scheme (`https:`, `mailto:`, …). */
function hasScheme(value: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Schemes that execute rather than navigate.
 *
 * A `url` column is row data, and row data is untrusted. Without this check a
 * stored `javascript:…` value becomes script execution behind a single click —
 * stored XSS with the grid as the delivery mechanism. The author-supplied
 * `href` option is validated too: it is a function over row data, so its
 * *output* is what has to be safe, not its input.
 */
const UNSAFE_SCHEME = /^\s*(javascript|data|vbscript)\s*:/i;

/** Neutralises an href that would execute. */
function safeHref(href: string): string {
  return UNSAFE_SCHEME.test(href) ? '' : href;
}

/**
 * Shared body for `link`, `email` and `phone`.
 *
 * The three differ only in how a bare value becomes an `href` and whether the
 * anchor opens a new tab, so they share one implementation rather than three
 * near-copies.
 */
function renderAnchor(ctx: BuiltInRenderContext, scheme: Scheme, modifier: string): void {
  if (renderIfEmpty(ctx)) return;

  const opts = ctx.options as LinkRendererOptions;
  const raw = String(ctx.value);
  const label = opts.label ? opts.label(ctx.value, ctx.row) : ctx.formattedValue;

  let href: string;
  if (opts.href) {
    href = opts.href(ctx.value, ctx.row);
  } else if (scheme === 'tel:') {
    href = `tel:${raw.replace(PHONE_NOISE, '')}`;
  } else if (scheme === 'mailto:') {
    href = hasScheme(raw) ? raw : `mailto:${raw}`;
  } else {
    // A bare domain is a URL the user means to open; without a scheme the
    // browser would resolve it against the current page instead.
    href = hasScheme(raw) ? raw : `https://${raw}`;
  }

  const span = valueSpan(modifier, opts.cssClass);
  const anchor = document.createElement('a');
  anchor.className = 'pg-cell-link';
  anchor.setAttribute('href', safeHref(href));
  anchor.textContent = label;
  anchor.title = label;

  // `mailto:`/`tel:` hand off to another application rather than navigating, so
  // a new tab would leave an empty one behind.
  const target = opts.target ?? (scheme ? undefined : '_blank');
  if (target) {
    anchor.setAttribute('target', target);
    // Never let an opened page reach back through `window.opener`.
    if (target === '_blank') anchor.setAttribute('rel', opts.rel ?? 'noopener noreferrer');
    else if (opts.rel) anchor.setAttribute('rel', opts.rel);
  }

  // The grid selects a cell on pointerdown; without this, clicking a link both
  // navigates and moves the selection, and a drag-select starting on a link
  // becomes a link drag instead.
  anchor.setAttribute('data-cell-link', '');

  span.appendChild(anchor);
  ctx.inner.appendChild(span);
}

/** An anchor. Bare values are given an `https://` scheme and open in a new tab. */
export const linkRenderer: BuiltInRendererDefinition = {
  name: 'link',
  textOnly: false,
  render: (ctx) => renderAnchor(ctx, null, 'link'),
};

/** A `mailto:` anchor. */
export const emailRenderer: BuiltInRendererDefinition = {
  name: 'email',
  textOnly: false,
  render: (ctx) => renderAnchor(ctx, 'mailto:', 'email'),
};

/** A `tel:` anchor. The displayed text keeps its human formatting; the href does not. */
export const phoneRenderer: BuiltInRendererDefinition = {
  name: 'phone',
  textOnly: false,
  render: (ctx) => renderAnchor(ctx, 'tel:', 'phone'),
};
