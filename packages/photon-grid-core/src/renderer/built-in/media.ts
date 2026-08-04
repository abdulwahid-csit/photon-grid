import type {
  AvatarRendererOptions,
  BuiltInRenderContext,
  BuiltInRendererDefinition,
  ImageRendererOptions,
} from '../../types/built-in-renderer.types';
import { createDiv } from '../dom-utils';
import { colorForText, initialsOf, isImageSource, renderIfEmpty, valueSpan } from './shared';

/** Matches the size the `image` type has always rendered at. */
const DEFAULT_IMAGE_SIZE = 32;

/**
 * Builds the `<img>`.
 *
 * Dimensions are set as attributes *and* inline styles: the attributes reserve
 * the box before the image loads (so a row does not reflow when it arrives),
 * the styles enforce it afterwards regardless of the image's intrinsic size.
 */
function buildImage(ctx: BuiltInRenderContext, src: string, rounded: boolean): HTMLImageElement {
  const opts = ctx.options as ImageRendererOptions;
  const width = opts.width ?? DEFAULT_IMAGE_SIZE;
  const height = opts.height ?? width;

  const img = document.createElement('img');
  img.className = rounded ? 'pg-cell-image pg-cell-image--round' : 'pg-cell-image';
  img.setAttribute('src', src);
  img.setAttribute('width', String(width));
  img.setAttribute('height', String(height));
  img.setAttribute('loading', 'lazy');
  img.setAttribute('alt', opts.alt ? opts.alt(ctx.value, ctx.row) : '');
  img.style.width = `${width}px`;
  img.style.height = `${height}px`;
  img.style.objectFit = opts.fit ?? 'cover';
  return img;
}

/**
 * Image thumbnail.
 *
 * `CellPatcher` swaps the `src` in place on a value change rather than
 * rebuilding the element, so a streaming update never makes the browser
 * re-fetch and re-decode an image it already has.
 */
export const imageRenderer: BuiltInRendererDefinition = {
  name: 'image',
  textOnly: false,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;
    const opts = ctx.options as ImageRendererOptions;
    const span = valueSpan('image', opts.cssClass);
    span.appendChild(buildImage(ctx, String(ctx.value), false));
    ctx.inner.appendChild(span);
  },
};

/**
 * Round avatar, falling back to coloured initials.
 *
 * The fallback is the point: user tables are full of rows with no uploaded
 * picture, and a broken-image icon on every one of them is worse than no
 * avatar at all. The initials' colour is derived from the name, so the same
 * person is the same colour on every screen without any stored preference.
 */
export const avatarRenderer: BuiltInRendererDefinition = {
  name: 'avatar',
  textOnly: false,
  render(ctx) {
    const opts = ctx.options as AvatarRendererOptions;
    const rounded = opts.rounded !== false;
    const span = valueSpan('avatar', opts.cssClass);

    const raw = ctx.value === null || ctx.value === undefined ? '' : String(ctx.value);
    const name = opts.name ? opts.name(ctx.value, ctx.row) : raw;

    if (raw !== '' && isImageSource(raw)) {
      span.appendChild(buildImage(ctx, raw, rounded));
      ctx.inner.appendChild(span);
      return;
    }

    const initials = initialsOf(name);
    if (initials === '') {
      if (renderIfEmpty(ctx)) return;
    }

    const size = opts.width ?? DEFAULT_IMAGE_SIZE;
    const fallback = createDiv(
      rounded ? 'pg-cell-avatar pg-cell-avatar--round' : 'pg-cell-avatar',
    );
    fallback.textContent = initials;
    fallback.title = name;
    fallback.style.width = `${size}px`;
    fallback.style.height = `${size}px`;
    fallback.style.backgroundColor = colorForText(name || raw);
    span.appendChild(fallback);
    ctx.inner.appendChild(span);
  },
};
