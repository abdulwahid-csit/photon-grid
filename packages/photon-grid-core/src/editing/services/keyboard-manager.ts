/**
 * Keyboard bindings for an open editor.
 *
 * A registry rather than a `switch (event.key)` for a concrete reason: an
 * application shipping a custom editor frequently needs a key the grid does not
 * know about — `Ctrl+Enter` to commit a multi-line value, `Alt+ArrowDown` to
 * open a picker, `Ctrl+Z` scoped to the editor rather than the grid. With a
 * registry that is one `register()` call; with a switch it is a fork of the
 * grid.
 *
 * @packageDocumentation
 */

/** What a binding may ask the session to do. */
export interface EditorKeyActions {
  /** Commit the current value and close. */
  readonly commit: () => void;
  /** Abandon the session, restoring the original value. */
  readonly cancel: () => void;
  /** Commit, then move to the adjacent editable cell. */
  readonly commitAndMove: (backwards: boolean) => void;
}

/**
 * A keyboard binding.
 *
 * Matching is by `key` plus optional modifier requirements. A modifier left
 * `undefined` means "don't care", so `{ key: 'Enter' }` matches Enter with or
 * without Shift — which is what makes the plain-Enter binding work everywhere
 * while a more specific `{ key: 'Enter', ctrl: true }` binding can still be
 * registered alongside it and win by being checked first.
 */
export interface EditorKeyBinding {
  /** Diagnostic name, and the key under which a later registration replaces it. */
  readonly name: string;
  /** `KeyboardEvent.key` to match, e.g. `'Enter'`, `'Escape'`, `'Tab'`. */
  readonly key: string;
  /** Require Ctrl (or Cmd on Apple platforms) to be held / not held. */
  readonly ctrl?: boolean;
  /** Require Shift to be held / not held. */
  readonly shift?: boolean;
  /** Require Alt to be held / not held. */
  readonly alt?: boolean;
  /**
   * Runs when the binding matches.
   *
   * @returns `false` to decline the event after all — the manager then keeps
   *   looking for a later binding and, failing that, lets the event through.
   *   This is how a popup editor makes Escape close its own list first and only
   *   cancel the session on a second press.
   */
  readonly run: (event: KeyboardEvent, actions: EditorKeyActions) => boolean | void;
}

/**
 * The bindings every editor gets unless a column or an editor overrides them.
 *
 * Order matters: the first match wins, so the modifier-qualified bindings are
 * listed before their bare counterparts.
 */
export function createDefaultKeyBindings(): EditorKeyBinding[] {
  return [
    {
      name: 'commit',
      key: 'Enter',
      ctrl: false,
      run: (event, actions) => {
        event.preventDefault();
        actions.commit();
      },
    },
    {
      name: 'cancel',
      key: 'Escape',
      run: (event, actions) => {
        event.preventDefault();
        actions.cancel();
      },
    },
    {
      name: 'commit-and-move',
      key: 'Tab',
      run: (event, actions) => {
        // The browser would move focus to the next focusable element in the
        // document; the grid moves it to the next editable *cell* instead, which
        // is the only thing that makes sense in a data grid.
        event.preventDefault();
        actions.commitAndMove(event.shiftKey);
      },
    },
  ];
}

/**
 * Dispatches keyboard events to bindings for the duration of an edit session.
 *
 * One instance per grid. Bindings registered here apply to every editor; an
 * editor that needs something bespoke handles the key itself and stops
 * propagation before it reaches this listener.
 */
export class KeyboardManager {
  private readonly bindings: EditorKeyBinding[] = createDefaultKeyBindings();

  /**
   * Adds a binding, or replaces the one registered under the same
   * {@link EditorKeyBinding.name}.
   *
   * New bindings are inserted at the **front**, so a registration always takes
   * precedence over the defaults — the behaviour an application overriding
   * `Enter` expects, without having to first remove anything.
   *
   * @returns Disposer that removes the binding again.
   */
  register(binding: EditorKeyBinding): () => void {
    this.remove(binding.name);
    this.bindings.unshift(binding);
    return () => this.remove(binding.name);
  }

  /** Removes the binding registered under `name`. */
  remove(name: string): void {
    const index = this.bindings.findIndex((b) => b.name === name);
    if (index !== -1) this.bindings.splice(index, 1);
  }

  /** The bindings in match order. */
  all(): readonly EditorKeyBinding[] {
    return this.bindings;
  }

  /**
   * Listens on `gui` for the session's lifetime.
   *
   * Events are handled on the editor's own root, and propagation is stopped for
   * anything a binding consumed, so the grid's cell-navigation handler never
   * also sees the keystroke — otherwise Enter would commit *and* move the
   * selection down.
   *
   * @returns Disposer that detaches the listener.
   */
  attach(gui: HTMLElement, actions: EditorKeyActions): () => void {
    const onKeyDown = (event: KeyboardEvent): void => {
      for (const binding of this.bindings) {
        if (!this.matches(binding, event)) continue;
        if (binding.run(event, actions) === false) continue;
        event.stopPropagation();
        return;
      }
      // Not ours. Still stopped from reaching the grid's navigation handler:
      // while an editor is open, arrow keys belong to the text caret, not to
      // cell selection.
      event.stopPropagation();
    };

    gui.addEventListener('keydown', onKeyDown);
    return () => gui.removeEventListener('keydown', onKeyDown);
  }

  /**
   * Whether `binding` applies to `event`.
   *
   * An unspecified modifier matches either state — see {@link EditorKeyBinding}.
   * Ctrl and Meta are treated as the same modifier so a binding works unchanged
   * on Windows and macOS.
   */
  private matches(binding: EditorKeyBinding, event: KeyboardEvent): boolean {
    if (binding.key !== event.key) return false;
    const ctrl = event.ctrlKey || event.metaKey;
    if (binding.ctrl !== undefined && binding.ctrl !== ctrl) return false;
    if (binding.shift !== undefined && binding.shift !== event.shiftKey) return false;
    if (binding.alt !== undefined && binding.alt !== event.altKey) return false;
    return true;
  }
}
