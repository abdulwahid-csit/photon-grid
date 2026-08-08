import type {
  ActionsRendererOptions,
  ActionsSize,
} from '../../../types/cell-action.types';
import type {
  BuiltInRenderContext,
  BuiltInRendererDefinition,
} from '../../../types/built-in-renderer.types';
import type { IconRenderer } from '../../../icons/icon-renderer';
import { createDiv } from '../../dom-utils';
import { renderText, valueSpan } from '../shared';
import type { ResolvedAction } from './action-resolver';
import { resolveActions, splitActions } from './action-resolver';

/**
 * Row-scoped commands in a cell — buttons, an overflow menu, or both.
 *
 * ### Why the DOM carries only ids
 * A button stores its action's `id` and nothing else. The click handler
 * re-resolves the declaration from the column and re-runs every predicate
 * against current data, so an action that became invisible or disabled between
 * paint and click cannot be invoked from a stale button. Parking the callback
 * on the element would also retain it for as long as the element lives, which
 * in a recycled viewport is a leak with no upper bound.
 *
 * ### Why no listeners here
 * `GridCore` delegates one click listener on the grid root. A viewport can hold
 * an actions cell in every visible row; per-button listeners would be
 * re-attached on every scroll, sort and column reorder. Same reason the
 * `button` renderer and the boolean checkbox are wired that way.
 *
 * ### Repainting
 * Actions are resolved from **row data**, but the Virtual DOM decides whether
 * to repaint a cell from the column's own value. An action that mutates the row
 * must call `params.actions.refresh()`, which repaints the row and re-resolves
 * every predicate — that is what turns Archive into Unarchive on the row that
 * was just archived.
 *
 * @packageDocumentation
 */

/** Marks an action control so the delegated click handler can find it. */
export const CELL_ACTION_ATTR = 'data-cell-action';

/** Marks the overflow trigger. Carries the column's `group`, for symmetry. */
export const CELL_ACTION_MENU_ATTR = 'data-cell-action-menu';

/** Root class of a rendered actions cell. */
export const ACTIONS_ROOT_CLASS = 'pg-actions';

/** Icon size used when an action names none, by control density. */
const ICON_SIZE: Record<ActionsSize, number> = { sm: 13, md: 15 };

/** Icon-registry name used by the overflow trigger when the column names none. */
const DEFAULT_MENU_ICON = 'menuHorizontal';

/**
 * Builds one action control.
 *
 * A real `<button>`, not a styled `<div>`: focus, Enter/Space activation, the
 * disabled state and the accessible role all come for free, and reimplementing
 * them per action is exactly how a grid ends up with commands a keyboard user
 * cannot reach.
 *
 * @param className - Base class, so the menu can reuse this for its items.
 * @param showLabel - `false` renders icon-only, falling back to the label when
 *   the action has no icon — an unlabelled, iconless button is a dead control.
 */
export function buildActionControl(
  resolved: ResolvedAction,
  icons: IconRenderer | null,
  size: ActionsSize,
  showLabel: boolean,
  className = 'pg-action',
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `${className} ${className}--${resolved.variant}`;
  if (resolved.action.cssClass) button.classList.add(resolved.action.cssClass);
  button.setAttribute(CELL_ACTION_ATTR, resolved.id);
  // The grid owns focus through its roving cell model; a tab stop per action
  // per row would put thousands of them in the tab order.
  button.tabIndex = -1;
  button.disabled = resolved.disabled;
  if (resolved.disabled) button.setAttribute('aria-disabled', 'true');
  button.setAttribute('aria-label', resolved.ariaLabel);

  const tooltip = resolved.tooltip || (showLabel ? '' : resolved.label);
  if (tooltip) button.title = tooltip;

  const iconEl =
    resolved.icon && icons
      ? icons.render(resolved.icon.name, {
          size: resolved.icon.size ?? ICON_SIZE[size],
          color: resolved.icon.color,
        })
      : null;

  // No icon to fall back on, so the label has to show whatever the column asked
  // for — otherwise this button renders as an empty box.
  const withLabel = showLabel || !iconEl;

  if (iconEl && resolved.icon?.position !== 'suffix') button.appendChild(iconEl);
  if (withLabel && resolved.label) {
    const text = document.createElement('span');
    text.className = `${className}__label`;
    text.textContent = resolved.label;
    button.appendChild(text);
  }
  if (iconEl && resolved.icon?.position === 'suffix') button.appendChild(iconEl);

  return button;
}

/** Builds the overflow trigger. */
function buildMenuTrigger(
  options: ActionsRendererOptions,
  icons: IconRenderer | null,
  size: ActionsSize,
  hiddenCount: number,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pg-action pg-action--ghost pg-action--menu';
  button.setAttribute(CELL_ACTION_MENU_ATTR, options.group ?? '');
  button.tabIndex = -1;
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');

  const label = options.menuLabel ?? 'Actions';
  button.setAttribute('aria-label', label);
  button.title = label;

  const icon = icons?.render(options.menuIcon ?? DEFAULT_MENU_ICON, { size: ICON_SIZE[size] });
  if (icon) {
    button.appendChild(icon);
  } else {
    // No icon renderer (a slim embedding, or a registry without the name):
    // a counter still tells the reader there is more behind this control.
    const text = document.createElement('span');
    text.className = 'pg-action__label';
    text.textContent = `${hiddenCount}`;
    button.appendChild(text);
  }

  return button;
}

/**
 * A cell of row-scoped commands.
 *
 * Declares no `patch`: an actions cell holds no state the DOM cannot cheaply
 * recreate — no fetched image, no open editor, no canvas — so the Virtual DOM's
 * content rebuild is both correct and cheap, and a `patch` here would only be a
 * second implementation of `render` to keep in step.
 */
export const actionsRenderer: BuiltInRendererDefinition<ActionsRendererOptions> = {
  name: 'actions',
  textOnly: false,
  render(ctx: BuiltInRenderContext<ActionsRendererOptions>) {
    const { options } = ctx;
    const size = options.size ?? 'sm';

    const resolved = resolveActions(
      {
        row: ctx.row,
        // Rendering is driven by row data; see `CellActionParams.node`.
        node: null,
        rowIndex: ctx.rowIndex,
        value: ctx.value,
        colDef: ctx.colDef,
        api: ctx.api,
      },
      options,
    );

    // No command applies to this row — a permission the user lacks, a state
    // that offers nothing. The cell still has to be occupied or the row's
    // columns fall out of alignment.
    if (resolved.length === 0) {
      renderText(ctx, options.emptyText ?? '', 'actions');
      return;
    }

    const { inline, overflow } = splitActions(resolved, options);

    const span = valueSpan('actions', options.cssClass);
    const root = createDiv(
      `${ACTIONS_ROOT_CLASS} ${ACTIONS_ROOT_CLASS}--${size} ${ACTIONS_ROOT_CLASS}--${options.align ?? 'start'}`,
    );
    // The row of controls reads as one group rather than as N unrelated
    // buttons repeated down the column.
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', options.groupLabel ?? 'Row actions');

    const showLabels = options.showLabels !== false;
    for (const action of inline) {
      root.appendChild(buildActionControl(action, ctx.icons, size, showLabels));
    }

    // Overflowed actions are not built here at all: the menu resolves them at
    // click time, so a row offering twelve commands costs the DOM of one
    // offering two.
    if (overflow.length > 0) {
      root.appendChild(buildMenuTrigger(options, ctx.icons, size, overflow.length));
    }

    span.appendChild(root);
    ctx.inner.appendChild(span);
  },
};
