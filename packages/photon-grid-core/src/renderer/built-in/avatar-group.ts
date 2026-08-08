import type {
  AvatarGroupMember,
  AvatarGroupRendererOptions,
  BuiltInRendererDefinition,
} from '../../types/built-in-renderer.types';
import { createDiv } from '../dom-utils';
import { colorForText, initialsOf, isImageSource, renderIfEmpty, valueSpan } from './shared';

/**
 * A stack of member avatars, collapsing past a limit into a `+N` counter that
 * opens the full roster.
 *
 * @packageDocumentation
 */

/** Marks the counter so the grid's delegated click handler can find it. */
export const AVATAR_GROUP_MORE_ATTR = 'data-avatar-more';

/** Default number of avatars drawn before the counter takes over. */
const DEFAULT_MAX_VISIBLE = 3;

/**
 * Reads one raw item into the shape the cell and the overlay both draw from.
 *
 * Accepts a bare string (a name, or a URL) as well as an object, because a
 * `string[]` of names is the most common way this data actually arrives and
 * demanding objects for it would be friction with no benefit.
 */
function toMember(
  item: unknown,
  index: number,
  options: AvatarGroupRendererOptions,
): AvatarGroupMember {
  if (options.member) return options.member(item, index);

  if (item !== null && typeof item === 'object') {
    const record = item as Record<string, unknown>;
    const name = record[options.nameKey ?? 'name'];
    const image = record[options.imageKey ?? 'image'];
    const detail = options.detailKey ? record[options.detailKey] : undefined;
    return {
      name: name === null || name === undefined ? '' : String(name),
      image: typeof image === 'string' && image !== '' ? image : undefined,
      detail: detail === null || detail === undefined ? undefined : String(detail),
      source: item,
    };
  }

  const text = item === null || item === undefined ? '' : String(item);
  // A bare URL has no name to show, so it becomes the image and the tooltip
  // falls back to the URL itself rather than rendering an empty avatar.
  return isImageSource(text)
    ? { name: text, image: text, source: item }
    : { name: text, source: item };
}

/** Builds one avatar: the image when there is one, coloured initials otherwise. */
function buildAvatar(member: AvatarGroupMember, showTooltip: boolean): HTMLElement {
  const el = createDiv('pg-avatar-group__item');
  if (showTooltip && member.name) el.title = member.name;

  if (member.image) {
    const img = document.createElement('img');
    img.className = 'pg-avatar-group__img';
    img.setAttribute('src', member.image);
    // The name is in the title and in the overlay; announcing it again per
    // image would make a group of five read out five times.
    img.setAttribute('alt', '');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    el.appendChild(img);
    return el;
  }

  el.classList.add('pg-avatar-group__item--initials');
  el.textContent = initialsOf(member.name);
  // Per-value colour, so the same person is the same colour on every screen
  // without anything being stored. A custom property rather than a inline
  // background so a theme can still override the whole scale.
  el.style.setProperty('--pg-avatar-color', colorForText(member.name));
  return el;
}

/**
 * A row of overlapping member avatars.
 *
 * Past `maxVisible` the remainder collapse into a `+N` counter. The counter is
 * a real `<button>` — it is an interactive control, and a styled `<div>` would
 * mean reimplementing focus, Enter/Space activation and the accessible role by
 * hand, badly.
 *
 * Members beyond the limit are not drawn at all, so a cell holding a team of
 * two hundred costs the same DOM as one holding four. That is the whole reason
 * the roster is an overlay rather than a wider cell.
 */
export const avatarGroupRenderer: BuiltInRendererDefinition<AvatarGroupRendererOptions> = {
  name: 'avatarGroup',
  textOnly: false,
  render(ctx) {
    const { options } = ctx;
    const items = Array.isArray(ctx.value) ? ctx.value : [];
    if (items.length === 0) {
      renderIfEmpty({ ...ctx, value: null });
      return;
    }

    const maxVisible = Math.max(1, options.maxVisible ?? DEFAULT_MAX_VISIBLE);
    const showTooltip = options.showTooltip !== false;
    const members = items.map((item, i) => toMember(item, i, options));
    const visible = members.slice(0, maxVisible);
    const hidden = members.length - visible.length;

    const span = valueSpan('avatar-group', options.cssClass);
    const group = createDiv(`pg-avatar-group pg-avatar-group--${options.size ?? 'sm'}`);
    // The stack reads as one control, not as N images.
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', `${members.length} members`);

    for (const member of visible) group.appendChild(buildAvatar(member, showTooltip));

    if (hidden > 0) {
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'pg-avatar-group__item pg-avatar-group__more';
      more.textContent = `+${hidden}`;
      more.setAttribute(AVATAR_GROUP_MORE_ATTR, '');
      more.setAttribute('aria-haspopup', 'dialog');
      more.setAttribute('aria-expanded', 'false');
      more.setAttribute('aria-label', `Show all ${members.length} members`);
      // The grid owns focus through its roving cell model; a button per row
      // would otherwise put a stop in the tab order for every visible row.
      more.tabIndex = -1;
      if (options.expandable === false) more.disabled = true;
      group.appendChild(more);
    }

    span.appendChild(group);
    ctx.inner.appendChild(span);
  },
};

/** Resolves a cell's members again at click time, for the overlay to draw. */
export function readAvatarGroupMembers(
  value: unknown,
  options: AvatarGroupRendererOptions,
): AvatarGroupMember[] {
  const items = Array.isArray(value) ? value : [];
  return items.map((item, i) => toMember(item, i, options));
}
