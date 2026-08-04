import type {
  CellActionConfirmHandler,
  CellActionConfirmOptions,
  CellActionParams,
  GridAction,
} from '../../../types/cell-action.types';
import { openConfirmDialog } from '../../confirm-dialog';
import { resolveValue } from './action-resolver';

/**
 * Runs one action: confirm, invoke, settle.
 *
 * Split out of both the renderer and `GridCore` because all three entry points
 * into an action — a button, a menu item, and (in future) a keyboard shortcut —
 * must treat it identically. A confirmation that only guarded the button, or a
 * busy state only the menu applied, is the kind of divergence that ships.
 *
 * DOM-aware but grid-agnostic: it knows how to disable the control it was
 * invoked from, and nothing about rows, columns or the event bus.
 *
 * @packageDocumentation
 */

/** Class marking a control whose async handler is still in flight. */
export const ACTION_BUSY_CLASS = 'pg-action--busy';

/** What one invocation needs to run to completion. */
export interface CellActionRequest {
  readonly action: GridAction;
  /** Params for this action, with `node` and `event` populated. */
  readonly params: CellActionParams;
  /** Replaces the built-in confirmation dialog for this column. */
  readonly confirmHandler?: CellActionConfirmHandler;
  /**
   * The control that was activated. Carries the busy state while an async
   * handler runs, and is re-enabled when it settles.
   */
  readonly trigger?: HTMLElement | null;
  /** Called once the user has confirmed, immediately before `onClick` runs. */
  readonly onRun?: () => void;
  /** Called with whatever an `onClick` promise rejected with. */
  readonly onError?: (error: unknown) => void;
}

/** Fallback dialog text, so a `confirm` needs only a `message`. */
const DEFAULT_TITLE = 'Are you sure?';
const DEFAULT_CONFIRM_LABEL = 'Confirm';
const DEFAULT_CANCEL_LABEL = 'Cancel';

/** Resolves a declared confirmation against the row it was raised for. */
function buildConfirmRequest(
  confirm: CellActionConfirmOptions,
  params: CellActionParams,
): {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  params: CellActionParams;
} {
  return {
    title: resolveValue(confirm.title, params) ?? DEFAULT_TITLE,
    message: resolveValue(confirm.message, params) ?? '',
    confirmLabel: resolveValue(confirm.confirmLabel, params) ?? DEFAULT_CONFIRM_LABEL,
    cancelLabel: resolveValue(confirm.cancelLabel, params) ?? DEFAULT_CANCEL_LABEL,
    // A destructive action carries its warning into the dialog without having
    // to be told twice.
    danger: confirm.danger ?? resolveValue(params.action.variant, params) === 'danger',
    params,
  };
}

/** Applies or clears the busy state on a control. */
export function setActionBusy(trigger: HTMLElement | null | undefined, busy: boolean): void {
  if (!trigger) return;
  trigger.classList.toggle(ACTION_BUSY_CLASS, busy);
  // `aria-busy` alone would leave the control clickable; disabling is what
  // actually stops a second invocation while the first is in flight.
  trigger.setAttribute('aria-busy', busy ? 'true' : 'false');
  // Duck-typed rather than `instanceof HTMLButtonElement`: an element from
  // another realm (an iframe, a portal) fails the identity check even though it
  // is a button, and the core must not assume DOM globals exist at all.
  if ('disabled' in trigger) (trigger as HTMLButtonElement).disabled = busy;
}

/**
 * Confirms and runs an action.
 *
 * Every dismissal route — Cancel, Escape, a click on the backdrop — abandons
 * the action silently, so `onClick` never runs on a "no".
 *
 * An `onClick` returning a promise keeps the control busy until it settles and
 * routes a rejection to {@link CellActionRequest.onError} instead of leaving an
 * unhandled rejection. A control removed from the DOM mid-flight (its row
 * repainted, scrolled out of the viewport) is simply not re-enabled — the check
 * is `isConnected`, not a stored flag, so a recycled element is never touched.
 *
 * @returns `true` when the action ran, `false` when the confirmation was
 *   dismissed.
 */
export async function runCellAction(request: CellActionRequest): Promise<boolean> {
  const { action, params, trigger } = request;

  if (action.confirm) {
    const confirmRequest = buildConfirmRequest(action.confirm, params);
    const confirmed = request.confirmHandler
      ? await request.confirmHandler(confirmRequest)
      : await openConfirmDialog({
          title: confirmRequest.title,
          message: confirmRequest.message,
          confirmLabel: confirmRequest.confirmLabel,
          cancelLabel: confirmRequest.cancelLabel,
          danger: confirmRequest.danger,
        });
    if (!confirmed) return false;
  }

  request.onRun?.();

  if (!action.onClick) return true;

  let result: void | Promise<void>;
  try {
    result = action.onClick(params);
  } catch (error) {
    // A synchronous throw is reported exactly like a rejection; the caller
    // should not have to handle two failure shapes for one callback.
    request.onError?.(error);
    return true;
  }

  if (!isPromise(result)) return true;

  setActionBusy(trigger, true);
  try {
    await result;
  } catch (error) {
    request.onError?.(error);
  } finally {
    if (trigger?.isConnected) setActionBusy(trigger, false);
  }

  return true;
}

/** Structural promise check — a thenable from any realm or library counts. */
function isPromise(value: unknown): value is Promise<void> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  );
}
