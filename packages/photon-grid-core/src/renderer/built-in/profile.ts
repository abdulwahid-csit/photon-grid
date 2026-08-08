import type {
  BuiltInRenderContext,
  BuiltInRendererDefinition,
  ProfileAvatarOptions,
  ProfileRendererOptions,
  ProfileSource,
  ProfileTextOptions,
} from '../../types/built-in-renderer.types';
import { resolveFieldPath } from '../../engines/editing/value-accessor';
import { createDiv } from '../dom-utils';
import { appendIcon, colorForText, initialsOf, isImageSource, renderText, valueSpan } from './shared';

/**
 * Identity cell: an avatar beside a title and an optional subtitle.
 *
 * Distinct from `avatar` in that the three parts name their own sources, so one
 * column presents fields the column itself does not point at — the shape a
 * "who is this row about" cell actually needs, where the picture, the name and
 * the role are three sibling fields.
 *
 * @packageDocumentation
 */

/** Diameter used when the column does not specify one. Matches the `avatar` renderer. */
const DEFAULT_AVATAR_SIZE = 32;

/** Separator drawn between the lines in the `inline` layout. */
const DEFAULT_SEPARATOR = '·';

/** Custom property the avatar box sizes itself from. */
const AVATAR_SIZE_PROP = '--pg-profile-avatar-size';

/** Custom property the initials fallback takes its background from. */
const AVATAR_COLOR_PROP = '--pg-profile-avatar-color';

/** Custom property carrying the image's `object-fit`. */
const AVATAR_FIT_PROP = '--pg-profile-avatar-fit';

/** Root element class, and the anchor {@link profileRenderer.patch} re-finds. */
const ROOT_CLASS = 'pg-profile';

/**
 * Which of the three avatar forms a row resolved to.
 *
 * Recorded on the element as a data attribute so `patch` can tell in one read
 * whether the new value still wants the same form — swapping an `<img>` for a
 * pair of initials is a rebuild, not an update.
 */
enum AvatarKind {
  Image = 'image',
  Initials = 'initials',
  Icon = 'icon',
  None = 'none',
}

/** Attribute carrying the {@link AvatarKind} of a rendered avatar. */
const AVATAR_KIND_ATTR = 'data-avatar-kind';

/** Everything one cell's parts resolved to, computed once per render. */
interface ResolvedProfile {
  readonly title: string;
  readonly subtitle: string;
  readonly kind: AvatarKind;
  /** Image URL, when {@link kind} is {@link AvatarKind.Image}. */
  readonly image: string;
  /** Display initials, when {@link kind} is {@link AvatarKind.Initials}. */
  readonly initials: string;
  /** Icon-registry name, when {@link kind} is {@link AvatarKind.Icon}. */
  readonly icon: string;
  /** Background for the initials fallback. */
  readonly color: string;
  /** `alt` for the image; empty means decorative. */
  readonly alt: string;
}

/**
 * Reads one part off the row.
 *
 * `value` wins over `field`; a part declaring neither falls back to the
 * column's own cell value, which is what makes a bare `renderer: 'profile'`
 * render something sensible.
 */
function readSource(source: ProfileSource | undefined, ctx: BuiltInRenderContext): unknown {
  if (!source) return ctx.value;
  if (source.value) return source.value(ctx.row, ctx.value);
  if (source.field) return resolveFieldPath(ctx.row, source.field);
  return ctx.value;
}

/** Coerces a resolved part to its display string, `''` for nothing. */
function stringify(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

/** Truncates to `maxLength`, appending an ellipsis. */
function truncate(text: string, maxLength: number | undefined): string {
  // Applied to the formatted string, matching the `text` renderer: the author's
  // formatter decides what gets truncated.
  return maxLength && maxLength > 0 && text.length > maxLength
    ? `${text.slice(0, maxLength)}…`
    : text;
}

/**
 * Resolves one text line: source, then formatter, then truncation.
 *
 * @param fallback - Used when the part names no source of its own. The title
 *   passes the column's formatted value so a `valueFormatter` still wins; the
 *   subtitle passes `''` so an unconfigured one simply does not exist.
 */
function readText(
  options: ProfileTextOptions | undefined,
  ctx: BuiltInRenderContext,
  fallback: string,
): string {
  if (!options) return fallback;

  // No source of its own: the line is the column's own value, already formatted
  // through `valueFormatter`. A `format` still gets the unformatted value —
  // formatting a formatted string twice is not what the option means.
  if (options.field === undefined && options.value === undefined) {
    return truncate(options.format ? options.format(ctx.value, ctx.row) : fallback, options.maxLength);
  }

  const raw = readSource(options, ctx);
  return truncate(
    options.format ? options.format(raw, ctx.row) : stringify(raw),
    options.maxLength,
  );
}

/** Resolves the avatar's colour option, which may be a literal or a row function. */
function readColor(
  options: ProfileAvatarOptions,
  ctx: BuiltInRenderContext,
  seed: string,
): string {
  const color =
    typeof options.color === 'function' ? options.color(ctx.row, ctx.value) : options.color;
  return color ?? colorForText(seed);
}

/**
 * Resolves every part of one cell in a single pass.
 *
 * Kept separate from the DOM work so `render` and `patch` agree by construction
 * rather than by two implementations staying in step.
 */
function resolveProfile(ctx: BuiltInRenderContext<ProfileRendererOptions>): ResolvedProfile {
  const { options } = ctx;
  const title = readText(options.title, ctx, ctx.formattedValue);
  const subtitle = readText(options.subtitle, ctx, '');

  if (options.showAvatar === false) {
    return { title, subtitle, kind: AvatarKind.None, image: '', initials: '', icon: '', color: '', alt: '' };
  }

  const avatar = options.avatar ?? {};
  const source = stringify(readSource(avatar, ctx));

  if (source !== '' && isImageSource(source)) {
    return {
      title,
      subtitle,
      kind: AvatarKind.Image,
      image: source,
      initials: '',
      icon: '',
      color: '',
      alt: avatar.alt ? avatar.alt(ctx.row, ctx.value) : '',
    };
  }

  // A non-URL avatar field is a name in its own right ("Amara Okafor" stored in
  // `avatar`), so it seeds the initials ahead of the title.
  const seed = avatar.initials
    ? avatar.initials(ctx.row, ctx.value)
    : source !== ''
      ? source
      : title;
  const initials = avatar.initials ? seed : initialsOf(seed);
  const fallback = avatar.fallback ?? 'initials';

  // `'icon'` needs both a name and a renderer to draw it; without either it
  // degrades to initials rather than leaving the cell short an element.
  if (fallback === 'icon' && avatar.icon && ctx.icons) {
    return {
      title,
      subtitle,
      kind: AvatarKind.Icon,
      image: '',
      initials: '',
      icon: avatar.icon,
      color: readColor(avatar, ctx, seed || title),
      alt: '',
    };
  }

  if (fallback === 'none' || initials === '') {
    return { title, subtitle, kind: AvatarKind.None, image: '', initials: '', icon: '', color: '', alt: '' };
  }

  return {
    title,
    subtitle,
    kind: AvatarKind.Initials,
    image: '',
    initials,
    icon: '',
    color: readColor(avatar, ctx, seed || title),
    alt: '',
  };
}

/** Builds the avatar box for a resolved profile, or `null` when there is none. */
function buildAvatar(
  resolved: ResolvedProfile,
  options: ProfileRendererOptions,
  ctx: BuiltInRenderContext<ProfileRendererOptions>,
): HTMLElement | null {
  if (resolved.kind === AvatarKind.None) return null;

  const avatar = options.avatar ?? {};
  const el = createDiv(`pg-profile__avatar pg-profile__avatar--${avatar.shape ?? 'circle'}`);
  el.setAttribute(AVATAR_KIND_ATTR, resolved.kind);

  if (resolved.kind === AvatarKind.Image) {
    const img = document.createElement('img');
    img.className = 'pg-profile__image';
    img.setAttribute('src', resolved.image);
    img.setAttribute('alt', resolved.alt);
    // Off-screen rows never fetch, and a fast scroll never blocks the main
    // thread decoding pictures the reader has already scrolled past.
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    if (avatar.fit) img.style.setProperty(AVATAR_FIT_PROP, avatar.fit);
    el.appendChild(img);
    return el;
  }

  el.style.setProperty(AVATAR_COLOR_PROP, resolved.color);
  // The title line names the person immediately after; announcing "AO" first
  // would make a screen reader read every row twice.
  el.setAttribute('aria-hidden', 'true');

  if (resolved.kind === AvatarKind.Icon) {
    el.classList.add('pg-profile__avatar--icon');
    appendIcon(ctx, el, resolved.icon, Math.round((avatar.size ?? DEFAULT_AVATAR_SIZE) * 0.5));
    return el;
  }

  el.classList.add('pg-profile__avatar--initials');
  el.textContent = resolved.initials;
  return el;
}

/** Builds one text line. */
function buildLine(
  text: string,
  modifier: 'title' | 'subtitle',
  options: ProfileTextOptions | undefined,
): HTMLElement {
  const el = document.createElement('span');
  el.className = options?.cssClass
    ? `pg-profile__${modifier} ${options.cssClass}`
    : `pg-profile__${modifier}`;
  el.textContent = text;
  // Mirrors the text so the truncation tooltip never disagrees with what is
  // shown, the same contract `renderText` keeps for plain cells.
  if (options?.tooltip !== false) el.title = text;
  return el;
}

/**
 * Avatar, title and subtitle, each read from its own source.
 *
 * ### Repainting
 * The Virtual DOM decides whether to repaint a cell from **the column's own
 * value**, so a profile column pointed at a field that never changes will not
 * notice an edit to `name` or `department`. Give such a column a `valueGetter`
 * composing the parts it displays (`` (row) => `${row.name}|${row.department}` ``)
 * and the diff sees the change like any other cell. Columns pointed at a real
 * field — the common case — need nothing.
 *
 * ### Cost
 * One element for the avatar, one wrapper and one span per line: five nodes at
 * most, no listeners, nothing retained. {@link profileRenderer.patch} keeps an
 * already-drawn `<img>` alive across value changes, so a streaming update never
 * makes the browser re-fetch and re-decode a picture it already has.
 */
export const profileRenderer: BuiltInRendererDefinition<ProfileRendererOptions> = {
  name: 'profile',
  textOnly: false,
  render(ctx) {
    const { options } = ctx;
    const resolved = resolveProfile(ctx);

    // Nothing resolved at all — an unpopulated row, not a broken one. The empty
    // text keeps the cell occupied so the row's columns stay aligned.
    if (resolved.title === '' && resolved.subtitle === '' && resolved.kind === AvatarKind.None) {
      renderText(ctx, options.emptyText ?? '', 'profile');
      return;
    }

    const span = valueSpan('profile', options.cssClass);
    const root = createDiv(`${ROOT_CLASS} ${ROOT_CLASS}--${options.layout ?? 'stacked'}`);

    const size = options.avatar?.size;
    if (size !== undefined && size > 0) root.style.setProperty(AVATAR_SIZE_PROP, `${size}px`);

    const avatarEl = buildAvatar(resolved, options, ctx);
    if (avatarEl) root.appendChild(avatarEl);

    const text = createDiv('pg-profile__text');
    text.appendChild(buildLine(resolved.title, 'title', options.title));

    if (resolved.subtitle !== '') {
      if ((options.layout ?? 'stacked') === 'inline') {
        const separator = document.createElement('span');
        separator.className = 'pg-profile__separator';
        separator.textContent = options.separator ?? DEFAULT_SEPARATOR;
        separator.setAttribute('aria-hidden', 'true');
        text.appendChild(separator);
      }
      text.appendChild(buildLine(resolved.subtitle, 'subtitle', options.subtitle));
    }

    root.appendChild(text);
    span.appendChild(root);
    ctx.inner.appendChild(span);
  },

  /**
   * Updates a drawn profile in place.
   *
   * Only the leaf writes — an `src`, two `textContent`s, one custom property —
   * so an `<img>` the browser has already fetched and decoded survives the
   * update. Any change to the cell's *shape* (an avatar appearing, a subtitle
   * arriving, initials becoming a picture) returns `false` and takes the normal
   * rebuild path: patching is an optimisation, never a second renderer.
   */
  patch(cellEl, ctx) {
    const root = cellEl.querySelector(`.${ROOT_CLASS}`) as HTMLElement | null;
    if (!root) return false;

    const resolved = resolveProfile(ctx);
    const avatarEl = root.querySelector('.pg-profile__avatar') as HTMLElement | null;
    const kind = avatarEl?.getAttribute(AVATAR_KIND_ATTR) ?? AvatarKind.None;
    if (kind !== resolved.kind) return false;

    const titleEl = root.querySelector('.pg-profile__title') as HTMLElement | null;
    if (!titleEl) return false;

    const subtitleEl = root.querySelector('.pg-profile__subtitle') as HTMLElement | null;
    // A subtitle appearing or disappearing changes the element count, and an
    // inline layout's separator with it.
    if ((resolved.subtitle !== '') !== (subtitleEl !== null)) return false;

    if (avatarEl) {
      if (resolved.kind === AvatarKind.Image) {
        const img = avatarEl.querySelector('img') as HTMLImageElement | null;
        if (!img) return false;
        // Guarded: assigning the same `src` is a no-op in most browsers, but
        // not in all of them, and a re-decode per tick is exactly what this
        // hook exists to avoid.
        if (img.getAttribute('src') !== resolved.image) img.setAttribute('src', resolved.image);
        if (img.getAttribute('alt') !== resolved.alt) img.setAttribute('alt', resolved.alt);
      } else if (resolved.kind === AvatarKind.Initials) {
        if (avatarEl.textContent !== resolved.initials) avatarEl.textContent = resolved.initials;
        avatarEl.style.setProperty(AVATAR_COLOR_PROP, resolved.color);
      } else {
        // An icon's glyph is value-independent here — only its colour can move.
        avatarEl.style.setProperty(AVATAR_COLOR_PROP, resolved.color);
      }
    }

    if (titleEl.textContent !== resolved.title) {
      titleEl.textContent = resolved.title;
      if (ctx.options.title?.tooltip !== false) titleEl.title = resolved.title;
    }

    if (subtitleEl && subtitleEl.textContent !== resolved.subtitle) {
      subtitleEl.textContent = resolved.subtitle;
      if (ctx.options.subtitle?.tooltip !== false) subtitleEl.title = resolved.subtitle;
    }

    return true;
  },
};
