import type {
  ActionIconConfig,
  ActionVariant,
  ActionsRendererOptions,
  CellActionController,
  CellActionParams,
  CellActionValue,
  GridAction,
} from '../../../types/cell-action.types';
import type { ColumnDef } from '../../../types/column.types';
import type { RowNode } from '../../../types/row.types';

/**
 * Turns an action's declaration into facts about one row.
 *
 * Pure and DOM-free on purpose. The cell renderer, the overflow menu and the
 * grid's click handler all need the same answers — "is this action visible for
 * this row, what does it say, is it enabled" — and they must agree exactly, or
 * a button drawn from one code path would invoke an action resolved by another.
 * One resolver, three callers.
 *
 * @packageDocumentation
 */

/** Shared empty context — avoids allocating one per cell for the common case. */
const EMPTY_CONTEXT: Record<string, unknown> = Object.freeze({});

/**
 * The controller handed to render-time resolution, where there is nothing to
 * drive: predicates run while the cell is being built, so closing a menu or
 * repainting from inside one would be re-entrant.
 */
const INERT_CONTROLLER: CellActionController = Object.freeze({
  close: () => undefined,
  refresh: () => undefined,
  setLoading: () => undefined,
});

/** The subset of `GridApi` this module uses, structurally — no import cycle. */
interface ContextHost {
  getContext?: () => Record<string, unknown>;
  refreshCells?: (params: { rowNodes?: readonly RowNode[] }) => void;
}

/** Everything needed to build params for one cell, independent of the action. */
export interface ActionParamsSource {
  readonly row: Record<string, unknown>;
  readonly node: RowNode | null;
  readonly rowIndex: number;
  readonly value: unknown;
  readonly colDef: ColumnDef;
  readonly api: unknown;
  readonly event?: MouseEvent | null;
  readonly controller?: CellActionController;
}

/**
 * One action, resolved against one row.
 *
 * The shape both the button and the menu item are built from, so the two
 * layouts cannot drift in what they show.
 */
export interface ResolvedAction {
  readonly action: GridAction;
  readonly id: string;
  /** Visible text. `''` for an icon-only control. */
  readonly label: string;
  /** Accessible name — never empty, so no control is unlabelled. */
  readonly ariaLabel: string;
  readonly icon: ActionIconConfig | null;
  readonly variant: ActionVariant;
  readonly disabled: boolean;
  /** Native tooltip text. `''` when there is none to show. */
  readonly tooltip: string;
}

/** Reads the host's shared application state, or `{}` when it set none. */
export function readGridContext(api: unknown): Record<string, unknown> {
  const host = api as ContextHost | null | undefined;
  return host?.getContext?.() ?? EMPTY_CONTEXT;
}

/**
 * Builds the params object handed to one action's callbacks.
 *
 * One per action rather than one per cell because `action` and `id` are on it —
 * a predicate that logs which action it is deciding about should not have to be
 * told separately.
 */
export function createActionParams(
  source: ActionParamsSource,
  action: GridAction,
): CellActionParams {
  return {
    action,
    id: action.id,
    row: source.row,
    node: source.node,
    rowIndex: source.rowIndex,
    value: source.value,
    colDef: source.colDef,
    api: source.api,
    context: readGridContext(source.api),
    event: source.event ?? null,
    actions: source.controller ?? INERT_CONTROLLER,
  };
}

/** Resolves a literal-or-function option against the row. */
export function resolveValue<T>(
  value: CellActionValue<T> | undefined,
  params: CellActionParams,
): T | undefined {
  return typeof value === 'function'
    ? (value as (p: CellActionParams) => T)(params)
    : value;
}

/** Normalises the three icon forms into one, or `null` when there is no icon. */
function resolveIcon(action: GridAction, params: CellActionParams): ActionIconConfig | null {
  const raw = typeof action.icon === 'function' ? action.icon(params) : action.icon;
  if (raw === undefined || raw === null) return null;
  return typeof raw === 'string' ? { name: raw } : raw;
}

/**
 * Resolves one action against one row.
 *
 * ### Why a throwing predicate does not propagate
 * These callbacks are the host's, they run once per action per rendered cell,
 * and `render` must not throw — a renderer error blanks the row and, on a
 * scrolling grid, every row after it. So an action whose own resolution fails
 * is dropped and the rest of the column still paints. Dropped rather than
 * offered-but-broken, deliberately: a `visible` predicate that could not decide
 * has not granted permission, and a Delete button drawn on that basis is the
 * expensive kind of wrong. The failure is reported to the console once per
 * action, so the bug stays visible without flooding the log per row.
 *
 * @returns The resolved action, or `null` when it is not offered for this row —
 *   invisible, disabled in a column that hides disabled actions, or failed to
 *   resolve. A `null` here is what makes an action uninvokable, not just
 *   undrawn: the click handler resolves through this same function.
 */
export function resolveAction(
  action: GridAction,
  source: ActionParamsSource,
  options: ActionsRendererOptions,
): ResolvedAction | null {
  try {
    return resolveActionOrThrow(action, source, options);
  } catch (error) {
    reportResolutionFailure(source.colDef, action, error);
    return null;
  }
}

/** The resolution itself. Split out so the guard above reads as one decision. */
function resolveActionOrThrow(
  action: GridAction,
  source: ActionParamsSource,
  options: ActionsRendererOptions,
): ResolvedAction | null {
  const params = createActionParams(source, action);

  if (resolveValue(action.visible, params) === false) return null;

  const disabled = resolveValue(action.disabled, params) === true;
  if (disabled && options.hideDisabled) return null;

  const label = resolveValue(action.label, params) ?? '';
  const icon = resolveIcon(action, params);
  // An icon-only control still needs a name; the label is the best one, and the
  // id is a poor but honest last resort — better than an unnamed button.
  const ariaLabel = resolveValue(action.ariaLabel, params) ?? label ?? '';

  return {
    action,
    id: action.id,
    label,
    ariaLabel: ariaLabel === '' ? action.id : ariaLabel,
    icon,
    variant: resolveValue(action.variant, params) ?? 'secondary',
    disabled,
    tooltip: resolveValue(action.tooltip, params) ?? '',
  };
}

/**
 * Column/action pairs already reported, so a bad predicate logs once rather
 * than once per row per repaint.
 *
 * Bounded by the number of declared actions, not by the dataset.
 */
const reportedFailures = new Set<string>();

/** Reports a host callback that threw, once. */
function reportResolutionFailure(colDef: ColumnDef, action: GridAction, error: unknown): void {
  const key = `${colDef.colId}::${action.id}`;
  if (reportedFailures.has(key)) return;
  reportedFailures.add(key);
  console.error(
    `[PhotonGrid] The "${action.id}" action in column "${colDef.colId}" threw while resolving, ` +
      `so it is not being offered. Check its visible/disabled/label callbacks — ` +
      `params.context is {} unless GridOptions.context was set.`,
    error,
  );
}

/** Clears the reported-failure log. Test seam; not part of the public API. */
export function resetActionFailureReports(): void {
  reportedFailures.clear();
}

/**
 * Resolves every action a row offers, in declaration order.
 *
 * Allocates one array per rendered cell. That is the honest cost of a column
 * whose contents depend on the row; it is bounded by the number of actions
 * declared, not by the dataset.
 */
export function resolveActions(
  source: ActionParamsSource,
  options: ActionsRendererOptions,
): ResolvedAction[] {
  const resolved: ResolvedAction[] = [];
  for (const action of options.actions ?? []) {
    const item = resolveAction(action, source, options);
    if (item) resolved.push(item);
  }
  return resolved;
}

/** How the resolved actions divide between buttons and the overflow menu. */
export interface ActionSplit {
  /** Drawn as buttons in the cell. */
  readonly inline: readonly ResolvedAction[];
  /** Reached through the overflow trigger. Never rendered until it is opened. */
  readonly overflow: readonly ResolvedAction[];
}

/**
 * Divides resolved actions between the cell and its overflow menu.
 *
 * Pure, and shared by the renderer and the click handler, so the menu opened by
 * a trigger contains exactly the actions the cell decided not to draw — without
 * either side storing that decision in the DOM.
 */
export function splitActions(
  resolved: readonly ResolvedAction[],
  options: ActionsRendererOptions,
): ActionSplit {
  const layout = options.layout ?? 'buttons';

  const limit =
    options.maxVisible !== undefined
      ? Math.max(0, options.maxVisible)
      : layout === 'menu'
        ? 0
        : layout === 'split'
          ? 1
          : resolved.length;

  if (limit >= resolved.length) return { inline: resolved, overflow: [] };

  // One more action than fits means drawing the last one costs the same as the
  // trigger that would hide it, and reads better — no menu holding one item.
  if (limit === resolved.length - 1 && limit > 0) return { inline: resolved, overflow: [] };

  return { inline: resolved.slice(0, limit), overflow: resolved.slice(limit) };
}

/** Finds a declared action by id, or `null`. Used when a click arrives. */
export function findAction(
  options: ActionsRendererOptions,
  id: string,
): GridAction | null {
  for (const action of options.actions ?? []) {
    if (action.id === id) return action;
  }
  return null;
}
