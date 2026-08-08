/**
 * Builds the editing subsystem for one grid.
 *
 * A single factory rather than six `new` calls scattered through `GridCore`:
 * the wiring between resolver, registry, adapters, validation, host, keyboard
 * and manager is a fact about *this module*, not about the grid, and keeping it
 * here means `GridCore` asks for an editing system and receives one.
 *
 * @packageDocumentation
 */

import type { GridStore } from '../core/grid-store';
import type { EventBus } from '../event-bus/event-bus';

import { EditorRegistry } from './registry/editor-registry';
import { EditorAdapterRegistry } from './registry/editor-adapter-registry';
import {
  EditorResolver,
  createDefaultStrategies,
  type EditorResolutionStrategy,
} from './registry/default-editor-resolver';
import { ValidationEngine } from './validation/validation-engine';
import { EditorHost, type InvalidReporter } from './services/editor-host';
import { FocusManager } from './services/focus-manager';
import { KeyboardManager } from './services/keyboard-manager';
import { PopupService } from './services/popup-service';
import { EditorManager } from './session/editor-manager';
import { createDefaultEditors } from './editors';
import { legacyDropdownStrategy, legacySlotStrategy } from './compat/legacy-editors';

/** What {@link createEditingServices} needs from the grid. */
export interface EditingServicesDeps {
  readonly store: GridStore;
  readonly eventBus: EventBus;
  /** Supplies the live `GridApi`, which does not exist yet at construction time. */
  readonly getApi: () => unknown;
  /**
   * Surfaces a rejected value to the user — pointed at the grid's
   * `ToastService` by `GridCore`.
   *
   * Optional so the editing system stays constructible on its own (tests, a
   * headless embedding); without it a failure still flashes the cell and is
   * announced to assistive technology, and only the toast is skipped.
   */
  readonly reportInvalid?: InvalidReporter;
}

/** The editing subsystem, as handed to `GridContext`. */
export interface EditingServices {
  readonly editorRegistry: EditorRegistry;
  readonly editorAdapters: EditorAdapterRegistry;
  readonly editorResolver: EditorResolver;
  readonly validationEngine: ValidationEngine;
  readonly editorManager: EditorManager;
  readonly keyboardManager: KeyboardManager;
}

/**
 * Inserts the backward-compatibility strategies into the default chain.
 *
 * Placement is the whole point, so it is asserted here rather than left to the
 * order of a spread:
 *
 * - the legacy `renderer.editor` slot goes **immediately after** `editable`, so
 *   it keeps the absolute priority it had before `cellEditor` existed;
 * - the legacy dropdown goes **immediately before** `byType`, so an explicit
 *   `cellEditor` still wins but an unconfigured `dropdown` column keeps the rich
 *   list it has today.
 *
 * @param base - The default chain from `createDefaultStrategies()`.
 * @returns A new array; the input is not mutated.
 */
function withCompatStrategies(
  base: readonly EditorResolutionStrategy[],
): EditorResolutionStrategy[] {
  const chain = [...base];

  const afterEditable = chain.findIndex((s) => s.name === 'editable');
  chain.splice(afterEditable === -1 ? 0 : afterEditable + 1, 0, legacySlotStrategy);

  const beforeByType = chain.findIndex((s) => s.name === 'byType');
  chain.splice(beforeByType === -1 ? chain.length : beforeByType, 0, legacyDropdownStrategy);

  return chain;
}

/**
 * Constructs and wires every editing service.
 *
 * The registry is seeded with the built-in editors; the adapter registry starts
 * empty, because a vanilla grid has no framework to adapt and a wrapper
 * registers its own during setup.
 */
export function createEditingServices(deps: EditingServicesDeps): EditingServices {
  const editorRegistry = new EditorRegistry(createDefaultEditors());
  const editorAdapters = new EditorAdapterRegistry();
  const validationEngine = new ValidationEngine();

  const editorResolver = new EditorResolver(
    { registry: editorRegistry, adapters: editorAdapters },
    withCompatStrategies(createDefaultStrategies()),
  );

  const keyboardManager = new KeyboardManager();
  const host = new EditorHost(new PopupService(), new FocusManager());
  if (deps.reportInvalid) host.setInvalidReporter(deps.reportInvalid);

  const editorManager = new EditorManager({
    store: deps.store,
    eventBus: deps.eventBus,
    resolver: editorResolver,
    validation: validationEngine,
    host,
    keyboard: keyboardManager,
    getApi: deps.getApi,
  });

  return {
    editorRegistry,
    editorAdapters,
    editorResolver,
    validationEngine,
    editorManager,
    keyboardManager,
  };
}
