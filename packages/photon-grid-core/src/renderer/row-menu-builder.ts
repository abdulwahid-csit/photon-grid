/**
 * DOM builder for row context-menu items.
 *
 * Kept separate from the selection engine that owns the menu so the item model
 * — kinds, icons, nesting, dynamic values, activation — is one small, testable
 * unit with no knowledge of clipboard ranges or charting.
 *
 * Items render with the same class names as the menu's built-in entries, so
 * custom actions inherit the menu's theming, hover behaviour, submenu fly-outs
 * and viewport-edge flipping without a single new positioning rule.
 *
 * @packageDocumentation
 */

import type { IconRenderer } from '../icons/icon-renderer';
import type {
  RowMenuCheckboxItem,
  RowMenuIcon,
  RowMenuInteractiveItem,
  RowMenuItem,
  RowMenuItemContext,
  RowMenuItemPredicate,
  RowMenuRadioItem,
  RowMenuSeparatorItem,
  RowMenuValue,
} from '../types/row-menu.types';
import { createDiv } from './dom-utils';

/** Icon size, matching the built-in menu entries. */
const ICON_SIZE = 13;

/**
 * Called when an item is activated.
 *
 * The builder resolves *which* item and *where*; the owner decides what
 * activation means — confirmation, async lifecycle, closing, events.
 *
 * @param item - The activated item.
 * @param ctx  - The context it was resolved against.
 * @param el   - The item's element, so the owner can flag it busy.
 */
export type RowMenuActivateHandler = (
  item: RowMenuInteractiveItem,
  ctx: RowMenuItemContext,
  el: HTMLElement,
) => void;

/**
 * Resolves a value that may be a literal or a function of the clicked row.
 *
 * @param value - The literal or function, or `undefined`.
 * @param ctx   - Context describing the row the menu was opened on.
 * @returns The resolved value, or `undefined` when nothing was supplied.
 */
export function resolveValue<T>(
  value: RowMenuValue<T> | undefined,
  ctx: RowMenuItemContext,
): T | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'function' ? (value as (c: RowMenuItemContext) => T)(ctx) : value;
}

/**
 * Resolves a predicate, treating an omitted value as `false`.
 *
 * @param value - The literal or predicate, or `undefined`.
 * @param ctx   - Context describing the row the menu was opened on.
 */
export function resolvePredicate(
  value: RowMenuItemPredicate | undefined,
  ctx: RowMenuItemContext,
): boolean {
  return resolveValue(value, ctx) === true;
}

/** `true` when the item is a separator rather than something interactive. */
function isSeparator(item: RowMenuItem): item is RowMenuSeparatorItem {
  return item.type === 'separator';
}

/** `true` when the item declares any children at all, visible or not. */
function declaresChildren(item: RowMenuInteractiveItem): boolean {
  return !!item.children && item.children.length > 0;
}

/** `true` when the item can do something when clicked. */
function hasAction(item: RowMenuInteractiveItem): boolean {
  return typeof item.action === 'function';
}

/** `true` for the two kinds that render a state indicator. */
function isToggle(
  item: RowMenuInteractiveItem,
): item is RowMenuCheckboxItem | RowMenuRadioItem {
  return item.type === 'checkbox' || item.type === 'radio';
}

/**
 * Builds the elements for a list of row-menu items.
 *
 * Resolution order per item: `hidden` → children → kind. An item with visible
 * children becomes a submenu parent (which is what draws the trailing chevron
 * and reveals the fly-out on hover); everything else becomes a leaf whose
 * indicator depends on its `type`.
 *
 * Separators are normalised rather than trusted: leading, trailing and
 * consecutive rules are dropped, so a separator adjacent to a hidden item never
 * leaves a stray line. The deprecated `separatorBefore` flag is folded into the
 * same pass, so the two styles can be mixed freely.
 *
 * @param items        - Items to render, in order.
 * @param ctx          - Context for dynamic values and handlers.
 * @param iconRenderer - Resolves registry icon names.
 * @param onActivate   - Invoked when an enabled item is clicked.
 * @returns The rendered elements, ready to append to a menu container.
 */
export function buildRowMenuItems(
  items: ReadonlyArray<RowMenuItem>,
  ctx: RowMenuItemContext,
  iconRenderer: IconRenderer,
  onActivate: RowMenuActivateHandler,
): HTMLElement[] {
  const out: HTMLElement[] = [];
  // Tracks whether a rule is pending, so runs of separators collapse and a
  // leading one is discarded — emitted lazily, only once real content follows.
  let separatorPending = false;

  for (const item of items) {
    if (resolvePredicate(item.hidden, ctx)) continue;

    if (isSeparator(item)) { separatorPending = out.length > 0; continue; }

    const children = visibleChildren(item, ctx);
    const parent = children.length > 0;
    // Drop only what was *declared* as a grouping parent and has nothing left
    // to show — an empty fly-out is a dead end the user can open but never use.
    // A leaf with no `action` is still rendered: activation is also observable
    // through `ROW_MENU_ITEM_CLICKED`, so the event bus is a valid handler.
    if (!parent && declaresChildren(item) && !hasAction(item)) continue;

    if ((separatorPending || item.separatorBefore === true) && out.length > 0) {
      out.push(buildSeparator());
    }
    separatorPending = false;

    out.push(
      parent
        ? buildParent(item, children, ctx, iconRenderer, onActivate)
        : buildLeaf(item, ctx, iconRenderer, onActivate),
    );
  }

  return out;
}

/** Children that survive their `hidden` predicate. */
function visibleChildren(
  item: RowMenuInteractiveItem,
  ctx: RowMenuItemContext,
): ReadonlyArray<RowMenuItem> {
  if (!item.children || item.children.length === 0) return [];
  return item.children.filter((child) => !resolvePredicate(child.hidden, ctx));
}

/** A horizontal rule between item groups. */
function buildSeparator(): HTMLElement {
  const sep = createDiv('pg-context-menu__sep');
  sep.setAttribute('role', 'separator');
  return sep;
}

/**
 * Applies the fields every interactive item shares: identity, label, icon,
 * tooltip, host class, and disabled state.
 *
 * @returns `true` when the item is enabled and may receive a click listener.
 */
function applyCommon(
  el: HTMLElement,
  item: RowMenuInteractiveItem,
  ctx: RowMenuItemContext,
  iconRenderer: IconRenderer,
): boolean {
  if (item.id) el.setAttribute('data-item-id', item.id);
  if (item.cssClass) el.classList.add(item.cssClass);

  const disabled = resolvePredicate(item.disabled, ctx);
  if (disabled) {
    el.classList.add('pg-context-menu__item--disabled');
    el.setAttribute('aria-disabled', 'true');
  }

  el.appendChild(buildIcon(item.icon, ctx, iconRenderer));
  el.appendChild(buildLabel(resolveValue(item.label, ctx) ?? ''));

  const tooltip = resolveValue(item.tooltip, ctx);
  if (tooltip) el.title = tooltip;

  return !disabled;
}

/**
 * A clickable leaf: icon, label, state indicator, keyboard hint.
 *
 * Rendered as a `<button>` so it is focusable and keyboard-activatable for
 * free, matching the built-in entries. Checkbox and radio items additionally
 * carry the ARIA role and `aria-checked` state that make them announce
 * correctly to screen readers.
 */
function buildLeaf(
  item: RowMenuInteractiveItem,
  ctx: RowMenuItemContext,
  iconRenderer: IconRenderer,
  onActivate: RowMenuActivateHandler,
): HTMLElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'pg-context-menu__item';

  const toggle = item.type === 'checkbox' || item.type === 'radio';
  el.setAttribute('role', item.type === 'checkbox' ? 'menuitemcheckbox'
    : item.type === 'radio' ? 'menuitemradio'
    : 'menuitem');

  const enabled = applyCommon(el, item, ctx, iconRenderer);
  if (!enabled) el.disabled = true;

  if (toggle) {
    const checked = resolvePredicate((item as { checked?: RowMenuItemPredicate }).checked, ctx);
    el.setAttribute('aria-checked', checked ? 'true' : 'false');
    el.classList.add('pg-context-menu__item--toggle');
    if (checked) el.classList.add('pg-context-menu__item--checked');
    // The indicator sits after the label so it right-aligns with the keyboard
    // hints of neighbouring items rather than shifting their text.
    const mark = createDiv(`pg-context-menu__mark pg-context-menu__mark--${item.type}`);
    if (checked && item.type === 'checkbox') {
      mark.innerHTML = iconRenderer.renderToString('check', 12);
    }
    el.appendChild(mark);
  }

  if (item.kbd) {
    const kbd = createDiv('pg-context-menu__kbd');
    kbd.textContent = item.kbd;
    el.appendChild(kbd);
  }

  if (enabled) {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      onActivate(item, ctx, el);
    });
  }

  return el;
}

/**
 * A submenu parent: icon, label, trailing chevron, and a nested fly-out.
 *
 * The chevron and hover reveal come from `.pg-context-menu__item--has-sub`,
 * which the menu owner also uses for its built-in submenus — so a custom
 * fly-out is indistinguishable from a built-in one, including the
 * viewport-edge flip that repositions it near the screen border.
 *
 * A parent that also defines `action` stays clickable; one that does not is a
 * pure grouping element.
 */
function buildParent(
  item: RowMenuInteractiveItem,
  children: ReadonlyArray<RowMenuItem>,
  ctx: RowMenuItemContext,
  iconRenderer: IconRenderer,
  onActivate: RowMenuActivateHandler,
): HTMLElement {
  const el = createDiv('pg-context-menu__item pg-context-menu__item--has-sub');
  el.setAttribute('role', 'menuitem');
  el.setAttribute('aria-haspopup', 'true');

  const enabled = applyCommon(el, item, ctx, iconRenderer);

  const sub = createDiv('pg-context-menu__sub');
  sub.setAttribute('role', 'menu');
  for (const child of buildRowMenuItems(children, ctx, iconRenderer, onActivate)) {
    sub.appendChild(child);
  }
  el.appendChild(sub);

  if (enabled && hasAction(item)) {
    el.addEventListener('click', (e) => {
      // Ignore clicks that bubbled up from a child item — those are the child's.
      if ((e.target as HTMLElement).closest('.pg-context-menu__sub')) return;
      e.stopPropagation();
      onActivate(item, ctx, el);
    });
  }

  return el;
}

/**
 * The leading icon slot.
 *
 * Always rendered, even without an icon, so labels line up in a menu that
 * mixes icon-bearing and plain items. A function icon may return either an
 * element to mount or a markup string.
 */
function buildIcon(
  icon: RowMenuIcon | undefined,
  ctx: RowMenuItemContext,
  iconRenderer: IconRenderer,
): HTMLElement {
  const el = createDiv('pg-context-menu__icon');
  el.setAttribute('aria-hidden', 'true');
  if (!icon) return el;

  const resolved = typeof icon === 'function' ? icon(ctx) : icon;
  // Duck-typed rather than `instanceof HTMLElement`: the constructor is not a
  // global in every environment the core is loaded in (SSR, workers, test
  // runners), and an element is identified perfectly well by its node type.
  if (isElement(resolved)) el.appendChild(resolved);
  else if (typeof resolved === 'string' && resolved.length > 0) {
    // A registry name resolves to markup; anything already containing a tag is
    // treated as markup itself, so a custom renderer can return either.
    el.innerHTML = resolved.includes('<')
      ? resolved
      : iconRenderer.renderToString(resolved, ICON_SIZE);
  }
  return el;
}

/** `true` when `value` is a DOM element, without touching browser globals. */
function isElement(value: unknown): value is HTMLElement {
  return typeof value === 'object'
    && value !== null
    && (value as { nodeType?: number }).nodeType === 1;
}

/** The item's text. */
function buildLabel(label: string): HTMLElement {
  const el = createDiv('pg-context-menu__label');
  el.textContent = label;
  return el;
}
