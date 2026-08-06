/**
 * The state of one open edit.
 *
 * A plain, mutable record rather than a class: it holds no behaviour, and
 * keeping it inert is what lets {@link EditorManager} remain the single place
 * where session transitions happen.
 *
 * @packageDocumentation
 */

import type { ColumnDef } from '../../types/column.types';
import type { RowNode } from '../../types/row.types';
import type { EditTrigger, ICellEditor } from '../types/cell-editor.types';
import type { MountedEditor } from '../services/editor-host';

/**
 * Monotonic session counter.
 *
 * Every session takes the next number, and any deferred work — an async `init`,
 * an async validator, a debounced change-validation — captures it and checks it
 * again before acting. That is the whole race guard: a response that arrives
 * after the user moved on belongs to a session that is no longer current, and is
 * dropped rather than applied to whichever cell happens to be open now.
 */
let nextSessionId = 0;

/** Allocates the next session id. See {@link nextSessionId}. */
export function allocateSessionId(): number {
  return ++nextSessionId;
}

/** One open edit. */
export interface EditSession {
  /** Identity used to discard stale asynchronous work. */
  readonly id: number;
  readonly rowNode: RowNode;
  readonly colDef: ColumnDef;
  /** Column header, or field — the name used in validation messages and ARIA. */
  readonly label: string;
  /** What opened the session. */
  readonly trigger: EditTrigger;
  /** The value the cell held when the session opened. */
  readonly originalValue: unknown;
  /**
   * The most recent value the editor reported through `onValueChange`.
   *
   * Advisory only: {@link ICellEditor.getValue} is read at commit time and wins.
   * This exists so `validateOn: 'change'` has something to validate.
   */
  currentValue: unknown;
  /** The editor instance. `null` between resolution and a successful async `init`. */
  editor: ICellEditor | null;
  /** The mounted GUI. `null` until the editor is on screen. */
  mounted: MountedEditor | null;
  readonly cellEl: HTMLElement;
  readonly innerEl: HTMLElement;
  /** Teardown callbacks registered while the session was open. */
  readonly disposers: Array<() => void>;
  /** `true` once teardown has begun, so re-entrant commits are ignored. */
  closing: boolean;
  /** Pending debounce handle for `validateOn: 'change'`. */
  validationTimer: ReturnType<typeof setTimeout> | null;
}
