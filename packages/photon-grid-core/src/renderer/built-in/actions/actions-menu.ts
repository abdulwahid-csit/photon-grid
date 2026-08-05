import type { ActionsRendererOptions } from '../../../types/cell-action.types';
import type { IconRenderer } from '../../../icons/icon-renderer';
import { createDiv, clearChildren } from '../../dom-utils';
import { MenuKeyboardController } from '../../menu-keyboard-controller';
import { placeOverlay } from '../../overlay-position';
import { portalHostFor } from '../../../theme/overlay-portal';
import type { ResolvedAction } from './action-resolver';
import { CELL_ACTION_ATTR } from './actions';

/**
 * The dropdown an actions cell's overflow trigger opens.
 *
 * ### Why a module singleton
 * At most one menu is open at a time — opening a second implicitly closes the
 * first — so one panel is created lazily, reused, and kept out of the DOM until
 * something asks for it. A panel per cell would mean thousands of detached
 * subtrees in a scrolled grid. `long-text-overlay.ts` and
 * `avatar-group-overlay.ts` use the same shape for the same reason.
 *
 * ### Why `position: fixed` on `document.body`
 * A panel positioned inside the grid would be clipped by the scroll container
 * it sits in, and would scroll away from its own trigger.
 *
 * @packageDocumentation
 */

/** What the grid hands over when a trigger is pressed. */
export interface ActionsMenuRequest {
  /** The overflow trigger. Toggles the menu and receives focus back on close. */
  readonly trigger: HTMLElement;
  /** Actions to offer, already resolved against the row. */
  readonly items: readonly ResolvedAction[];
  readonly options: ActionsRendererOptions;
  /** Icon renderer, so menu icons resolve through the same registry as the cell's. */
  readonly icons: IconRenderer | null;
  /** Invoked when an item is activated. Closing is the caller's decision. */
  readonly onSelect: (item: ResolvedAction, itemEl: HTMLElement, event: MouseEvent) => void;
}

/** Panel width bounds — narrow enough to sit beside a cell, wide enough to read. */
const MIN_WIDTH = 160;
const MAX_WIDTH = 280;

/** Rough per-item height, used to place the panel before it has been measured. */
const ESTIMATED_ITEM_HEIGHT = 30;
const ESTIMATED_CHROME = 10;

let panelEl: HTMLElement | null = null;
let listEl: HTMLElement | null = null;
let titleEl: HTMLElement | null = null;
let activeTrigger: HTMLElement | null = null;
let activeItemCount = 0;
let keyboard: MenuKeyboardController | null = null;

/** Builds the panel once. Subsequent opens refill it. */
function ensurePanel(): HTMLElement {
  if (panelEl) return panelEl;

  const panel = createDiv('pg-actions-menu');
  panel.setAttribute('role', 'menu');
  panel.tabIndex = -1;

  const title = createDiv('pg-actions-menu__title');
  const list = createDiv('pg-actions-menu__list');
  panel.appendChild(title);
  panel.appendChild(list);

  panelEl = panel;
  titleEl = title;
  listEl = list;
  return panel;
}

/** Builds one menu row. Shares the action control's shape, styled as a menu item. */
function buildItem(
  item: ResolvedAction,
  icons: IconRenderer | null,
  onSelect: ActionsMenuRequest['onSelect'],
): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `pg-actions-menu__item pg-actions-menu__item--${item.variant}`;
  if (item.action.cssClass) button.classList.add(item.action.cssClass);
  button.setAttribute(CELL_ACTION_ATTR, item.id);
  button.setAttribute('role', 'menuitem');
  button.tabIndex = -1;
  button.disabled = item.disabled;
  if (item.disabled) button.setAttribute('aria-disabled', 'true');
  if (item.tooltip) button.title = item.tooltip;

  const iconEl = item.icon && icons
    ? icons.render(item.icon.name, { size: item.icon.size ?? 14, color: item.icon.color })
    : null;
  // A slot is reserved even without an icon, so labels line up down the menu
  // rather than stepping in and out with each item.
  const iconSlot = createDiv('pg-actions-menu__icon');
  if (iconEl) iconSlot.appendChild(iconEl);
  button.appendChild(iconSlot);

  const label = document.createElement('span');
  label.className = 'pg-actions-menu__label';
  label.textContent = item.label || item.ariaLabel;
  button.appendChild(label);

  // Per-item listeners are fine here and delegation is not: the menu holds a
  // handful of items and is torn down on close, unlike the cells themselves.
  button.addEventListener('click', (e) => {
    if (button.disabled) return;
    onSelect(item, button, e);
  });

  return button;
}

/**
 * Positions the panel against its trigger.
 *
 * Coordinates go in as custom properties rather than `top`/`left` declarations:
 * all of them are genuinely dynamic and cannot live in a stylesheet, and
 * routing them through variables keeps the panel's own rule — including whether
 * it is positioned this way at all — in the theme's hands.
 */
function position(panel: HTMLElement, trigger: HTMLElement, itemCount: number): void {
  const measured = panel.offsetHeight;
  const height = measured > 0 ? measured : itemCount * ESTIMATED_ITEM_HEIGHT + ESTIMATED_CHROME;
  const width = Math.min(Math.max(panel.offsetWidth || MIN_WIDTH, MIN_WIDTH), MAX_WIDTH);

  const placed = placeOverlay({
    anchor: trigger.getBoundingClientRect(),
    width,
    height,
    // Right-aligned: an actions column sits at the end of a row, so a menu
    // hanging left of its trigger stays over the grid instead of the margin.
    align: 'end',
  });

  panel.style.setProperty('--pg-overlay-x', `${placed.x}px`);
  panel.style.setProperty('--pg-overlay-y', `${placed.y}px`);
  panel.style.setProperty('--pg-overlay-max-height', `${placed.maxHeight}px`);
  panel.classList.toggle('pg-actions-menu--above', placed.placement === 'above');
}

/** Opens the menu for one cell, replacing any menu already showing. */
export function openActionsMenu(request: ActionsMenuRequest): void {
  const panel = ensurePanel();

  closeActionsMenu({ restoreFocus: false });

  // A module singleton shared by every grid on the page: re-parent it into the
  // triggering grid's portal host so it resolves that grid's tokens and skin
  // rather than whichever grid last wrote to the document root.
  portalHostFor(request.trigger).appendChild(panel);

  const title = request.options.menuTitle;
  titleEl!.textContent = title ?? '';
  titleEl!.classList.toggle('pg-actions-menu__title--hidden', !title);
  panel.setAttribute('aria-label', title ?? request.options.menuLabel ?? 'Actions');

  // Rebuilt per open rather than cached: the items are resolved against the row
  // that was clicked, and reusing elements across rows is how a menu ends up
  // offering the previous row's commands.
  clearChildren(listEl!);
  for (const item of request.items) {
    listEl!.appendChild(buildItem(item, request.icons, request.onSelect));
  }

  activeTrigger = request.trigger;
  activeItemCount = request.items.length;
  request.trigger.setAttribute('aria-expanded', 'true');

  panel.classList.add('pg-actions-menu--open');
  // Two passes: the first mounts it so the browser can lay it out, the second
  // places it against a real measured height rather than an estimate.
  position(panel, request.trigger, activeItemCount);
  requestAnimationFrame(() => {
    if (activeTrigger === request.trigger) position(panel, request.trigger, activeItemCount);
  });

  attachDismissListeners();

  // Arrow keys, Home/End, type-ahead and Escape, from the same controller the
  // column and row context menus use — one implementation of the WAI-ARIA menu
  // pattern, not a third partial copy of it.
  keyboard = new MenuKeyboardController({
    getRootEl: () => panelEl,
    getActiveSubmenuEl: () => null,
    openSubmenu: () => null,
    closeSubmenu: () => undefined,
    getSubmenuParent: () => null,
    closeAll: (restoreFocus) => closeActionsMenu({ restoreFocus }),
  });
  keyboard.attach();
}

/** Closes the menu, if one is open. */
export function closeActionsMenu(opts: { restoreFocus?: boolean } = {}): void {
  if (!panelEl || !activeTrigger) return;

  keyboard?.destroy();
  keyboard = null;

  panelEl.classList.remove('pg-actions-menu--open');
  activeTrigger.setAttribute('aria-expanded', 'false');

  const trigger = activeTrigger;
  activeTrigger = null;
  detachDismissListeners();

  // Only when the menu actually held focus — stealing it back after the user
  // has clicked elsewhere would yank them out of whatever they moved to. The
  // trigger may also have been recycled out of the DOM by a repaint.
  if (opts.restoreFocus !== false && panelEl.contains(document.activeElement) && trigger.isConnected) {
    trigger.focus();
  }

  // Each item closes over the row it was built for. Dropping them here means a
  // closed menu retains nothing — a menu left populated would pin the last row
  // it was opened on until the next open.
  if (listEl) clearChildren(listEl);
}

/** `true` when this trigger's menu is the one currently showing. */
export function isActionsMenuOpenFor(trigger: HTMLElement): boolean {
  return activeTrigger === trigger;
}

/** The element an open menu is anchored to, or `null`. */
export function getActionsMenuTrigger(): HTMLElement | null {
  return activeTrigger;
}

/** Tears the menu out of the document entirely. */
export function destroyActionsMenu(): void {
  closeActionsMenu({ restoreFocus: false });
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
  closeActionsMenu({ restoreFocus: false });
}

/**
 * Any scroll detaches the menu from its trigger, so the menu goes.
 *
 * Capture phase, because the grid's own scroll container does not bubble its
 * scroll events to the document. Closing rather than repositioning is
 * deliberate: a menu chasing a scrolling row is harder to hit than one that
 * gets out of the way. The menu's own scrollbar is exempt.
 */
function onScroll(e: Event): void {
  if (e.target instanceof Node && panelEl?.contains(e.target)) return;
  closeActionsMenu({ restoreFocus: false });
}

function onResize(): void {
  if (panelEl && activeTrigger) position(panelEl, activeTrigger, activeItemCount);
}

let listening = false;

function attachDismissListeners(): void {
  if (listening) return;
  listening = true;
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize);
}

function detachDismissListeners(): void {
  if (!listening) return;
  listening = false;
  document.removeEventListener('pointerdown', onDocumentPointerDown, true);
  document.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', onResize);
}
