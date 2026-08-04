import type {
  AvatarGroupMember,
  AvatarGroupRendererOptions,
} from '../../types/built-in-renderer.types';
import { createDiv } from '../dom-utils';
import { adoptGridTheme } from '../overlay-theme';
import { placeOverlay } from '../overlay-position';
import { colorForText, initialsOf } from './shared';

/**
 * The roster panel an avatar group's `+N` counter opens.
 *
 * ### Why a module singleton
 * At most one roster is open at a time — opening a second implicitly closes the
 * first — so one panel is created lazily, reused, and kept out of the DOM until
 * something asks for it. A panel per cell would mean thousands of detached
 * subtrees in a scrolled grid. `SparklineTooltip` uses the same shape for the
 * same reason.
 *
 * ### Why `position: fixed`
 * The panel lives on `document.body`, not inside the cell. A panel positioned
 * within the grid would be clipped by the scroll container it sits in, and
 * would scroll away from its own trigger.
 *
 * @packageDocumentation
 */

/** Called when a member row is activated. */
export type AvatarGroupMemberHandler = (member: AvatarGroupMember, event: MouseEvent) => void;

export interface AvatarGroupOverlayRequest {
  /** The `+N` button. Anchors the panel and receives focus back on close. */
  readonly trigger: HTMLElement;
  readonly members: readonly AvatarGroupMember[];
  readonly options: AvatarGroupRendererOptions;
  readonly onSelect?: AvatarGroupMemberHandler;
}

/** Panel width, in px. Matched by `--pg-avatar-overlay-width` in the stylesheet. */
const PANEL_WIDTH = 240;

/** Height used for placement before the panel has been measured. */
const ESTIMATED_ROW_HEIGHT = 34;
const ESTIMATED_CHROME = 16;

let panelEl: HTMLElement | null = null;
let listEl: HTMLElement | null = null;
/**
 * The optional heading above the roster.
 *
 * Built once with the panel and reused, rather than created per open: it lives
 * outside `listEl`, so the `while (list.firstChild)` clear in `open` never saw
 * it and every open used to prepend another copy.
 */
let titleEl: HTMLElement | null = null;
let activeTrigger: HTMLElement | null = null;
let activeRequest: AvatarGroupOverlayRequest | null = null;

/** Builds the panel once. Subsequent opens refill it. */
function ensurePanel(): HTMLElement {
  if (panelEl) return panelEl;

  const panel = createDiv('pg-avatar-overlay');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Members');
  // Not focusable itself, but it must be reachable by a programmatic focus so
  // Escape has somewhere sensible to return from.
  panel.tabIndex = -1;

  const title = createDiv('pg-avatar-overlay__title');

  const list = createDiv('pg-avatar-overlay__list');
  list.setAttribute('role', 'list');
  panel.appendChild(list);

  document.body.appendChild(panel);
  panelEl = panel;
  listEl = list;
  // Detached until an open supplies a title — attaching it empty would leave the
  // heading's padding as a stray gap above the first member.
  titleEl = title;
  return panel;
}

/** One roster row: avatar, name, optional detail line. */
function buildRow(member: AvatarGroupMember, interactive: boolean): HTMLElement {
  const row = interactive ? document.createElement('button') : createDiv('');
  row.className = 'pg-avatar-overlay__row';
  row.setAttribute('role', 'listitem');
  if (interactive) {
    (row as HTMLButtonElement).type = 'button';
    row.classList.add('pg-avatar-overlay__row--interactive');
  }

  const avatar = createDiv('pg-avatar-overlay__avatar');
  if (member.image) {
    const img = document.createElement('img');
    img.className = 'pg-avatar-overlay__img';
    img.setAttribute('src', member.image);
    img.setAttribute('alt', '');
    img.setAttribute('loading', 'lazy');
    avatar.appendChild(img);
  } else {
    avatar.classList.add('pg-avatar-overlay__avatar--initials');
    avatar.textContent = initialsOf(member.name);
    avatar.style.setProperty('--pg-avatar-color', colorForText(member.name));
  }
  row.appendChild(avatar);

  const text = createDiv('pg-avatar-overlay__text');
  const name = createDiv('pg-avatar-overlay__name');
  name.textContent = member.name;
  text.appendChild(name);

  if (member.detail) {
    const detail = createDiv('pg-avatar-overlay__detail');
    detail.textContent = member.detail;
    text.appendChild(detail);
  }
  row.appendChild(text);
  return row;
}

/**
 * Positions the panel against its trigger.
 *
 * Split from `open` because it also runs on resize: the panel is anchored to a
 * cell, and a cell moves when the window changes shape.
 *
 * The two coordinates are written as custom properties rather than `top`/`left`
 * declarations. Position is genuinely dynamic and cannot live in a stylesheet,
 * and routing it through variables keeps the panel's own rule — including
 * whether it is even positioned this way — in the theme's hands.
 */
function position(panel: HTMLElement, trigger: HTMLElement, rowCount: number): void {
  const measured = panel.offsetHeight;
  const height = measured > 0 ? measured : rowCount * ESTIMATED_ROW_HEIGHT + ESTIMATED_CHROME;

  const placed = placeOverlay({
    anchor: trigger.getBoundingClientRect(),
    width: PANEL_WIDTH,
    height,
    align: 'end',
  });

  panel.style.setProperty('--pg-overlay-x', `${placed.x}px`);
  panel.style.setProperty('--pg-overlay-y', `${placed.y}px`);
  panel.style.setProperty('--pg-overlay-max-height', `${placed.maxHeight}px`);
  panel.classList.toggle('pg-avatar-overlay--above', placed.placement === 'above');
}

/** Opens the roster for one cell, replacing any panel already showing. */
export function openAvatarGroupOverlay(request: AvatarGroupOverlayRequest): void {
  const panel = ensurePanel();
  const list = listEl!;

  closeAvatarGroupOverlay({ restoreFocus: false });

  // The panel sits on `document.body`, outside the container the owning grid's
  // token stylesheet is scoped to — without this it renders in light-mode
  // fallbacks regardless of the grid's actual mode.
  adoptGridTheme(panel, request.trigger);

  while (list.firstChild) list.removeChild(list.firstChild);

  // One reused heading, attached only while a title exists. Creating one per
  // open and inserting it before `list` meant it escaped the clear above, so
  // the panel accumulated a heading every time it was reopened.
  const title = titleEl!;
  if (request.options.overlayTitle) {
    title.textContent = request.options.overlayTitle;
    if (title.parentNode !== panel) panel.insertBefore(title, list);
    panel.setAttribute('aria-label', request.options.overlayTitle);
  } else {
    title.remove();
    panel.setAttribute('aria-label', 'Members');
  }

  for (const member of request.members) {
    list.appendChild(buildRow(member, request.onSelect !== undefined));
  }

  activeTrigger = request.trigger;
  activeRequest = request;
  request.trigger.setAttribute('aria-expanded', 'true');

  panel.classList.add('pg-avatar-overlay--open');
  // Two passes: the first mounts it so the browser can lay it out, the second
  // places it against a real measured height rather than an estimate.
  position(panel, request.trigger, request.members.length);
  requestAnimationFrame(() => {
    if (activeTrigger === request.trigger) position(panel, request.trigger, request.members.length);
  });

  attachDismissListeners();
  panel.focus();
}

/** Closes the roster, if one is open. */
export function closeAvatarGroupOverlay(opts: { restoreFocus?: boolean } = {}): void {
  if (!panelEl || !activeTrigger) return;

  panelEl.classList.remove('pg-avatar-overlay--open');
  activeTrigger.setAttribute('aria-expanded', 'false');

  const trigger = activeTrigger;
  activeTrigger = null;
  activeRequest = null;
  detachDismissListeners();

  // Only when the panel actually held focus — stealing it back after the user
  // has clicked elsewhere would yank them out of whatever they moved to.
  if (opts.restoreFocus !== false && panelEl.contains(document.activeElement)) {
    trigger.focus();
  }
}

/** Tears the panel out of the document entirely. */
export function destroyAvatarGroupOverlay(): void {
  closeAvatarGroupOverlay({ restoreFocus: false });
  panelEl?.remove();
  panelEl = null;
  listEl = null;
  titleEl = null;
}

// ─── Dismissal ───────────────────────────────────────────────────────────────

function onDocumentPointerDown(e: PointerEvent): void {
  const target = e.target;
  if (!(target instanceof Node)) return;
  // A click on the trigger is the toggle, handled by the grid's own delegate —
  // dismissing here too would close and immediately reopen.
  if (panelEl?.contains(target) || activeTrigger?.contains(target)) return;
  closeAvatarGroupOverlay({ restoreFocus: false });
}

function onDocumentKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.stopPropagation();
    closeAvatarGroupOverlay();
  }
}

/**
 * Any scroll that moves the panel away from its anchor dismisses it.
 *
 * Capture phase, because the grid's own scroll container does not bubble its
 * scroll events to the document. Closing rather than repositioning is
 * deliberate: a panel that chases a scrolling row is harder to read than one
 * that gets out of the way.
 *
 * The panel's *own* overflow scrolling is exempt. `.pg-avatar-overlay` is itself
 * the scroll container (`overflow-y: auto` against `--pg-overlay-max-height`),
 * so a roster long enough to scroll fired this listener and dismissed itself the
 * moment the user tried to reach the members at the bottom.
 */
function onScroll(e: Event): void {
  const target = e.target;
  if (target instanceof Node && panelEl?.contains(target)) return;
  closeAvatarGroupOverlay({ restoreFocus: false });
}

function onResize(): void {
  if (panelEl && activeTrigger && activeRequest) {
    position(panelEl, activeTrigger, activeRequest.members.length);
  }
}

function onListClick(e: MouseEvent): void {
  const handler = activeRequest?.onSelect;
  if (!handler) return;
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  const row = target.closest<HTMLElement>('.pg-avatar-overlay__row');
  if (!row || !listEl?.contains(row)) return;

  const index = [...listEl.children].indexOf(row);
  const member = activeRequest?.members[index];
  if (member) handler(member, e);
}

let listening = false;

function attachDismissListeners(): void {
  if (listening) return;
  listening = true;
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  document.addEventListener('keydown', onDocumentKeyDown, true);
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize);
  panelEl?.addEventListener('click', onListClick);
}

function detachDismissListeners(): void {
  if (!listening) return;
  listening = false;
  document.removeEventListener('pointerdown', onDocumentPointerDown, true);
  document.removeEventListener('keydown', onDocumentKeyDown, true);
  document.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', onResize);
  panelEl?.removeEventListener('click', onListClick);
}
