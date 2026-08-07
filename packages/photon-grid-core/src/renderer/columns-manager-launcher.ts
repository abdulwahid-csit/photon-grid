/**
 * The **Columns Manager** launcher — an icon button in the tools strip that
 * opens the grid's Column Chooser.
 *
 * Deliberately thin. It owns a button and nothing else: the dialog, the
 * show/hide behaviour and the visibility writes all belong to
 * {@link import('./column-chooser').ColumnChooser}, which the column menu's
 * "Column Chooser…" item already opens. Reusing that component rather than
 * growing a second one is the whole point — two dialogs doing the same job
 * drift, and a user who hid a column from the toolbar would find the header
 * menu disagreeing about it.
 *
 * Pure UI, like every other launcher: it holds no grid state and mutates
 * nothing directly, delegating the open to {@link ColumnsManagerDeps.onOpen}.
 * Every visual is class-driven — all colours, spacing, radii and typography
 * come from theme CSS variables (see `toolbar.css.ts`); the component sets no
 * inline styles.
 *
 * @packageDocumentation
 */

import type { IconRenderer } from '../icons/icon-renderer';
import type { ColumnsManagerConfig } from '../types/toolbar.types';
import { createDiv, createElement } from './dom-utils';

/** Collaborators the {@link ColumnsManagerLauncher} needs, injected as a DI bag. */
export interface ColumnsManagerDeps {
  /** Renders themed, registry-backed icons. */
  readonly iconRenderer: IconRenderer;
  /**
   * Opens the Column Chooser. Wired by `GridRenderer` to the same chooser
   * instance the header menu uses, so both entry points share one dialog.
   */
  readonly onOpen: () => void;
}

/** Tooltip and accessible name when the column supplies none. */
const DEFAULT_TOOLTIP = 'Columns Manager';

/** Icon-registry name when the column supplies none. Present in `coreIcons`, so every theme resolves it. */
const DEFAULT_ICON = 'columns';

/** Glyph edge length, matching the Filters funnel it sits beside. */
const ICON_SIZE = 16;

/**
 * Icon button that opens the Column Chooser.
 *
 * Opt-in via `GridOptions.columnsManager`; mounted by
 * {@link import('./grid-renderer').GridRenderer} into the tools strip's right
 * region, where CSS `order` places it ahead of the Filters funnel.
 */
export class ColumnsManagerLauncher {
  private launcherEl: HTMLButtonElement | null = null;

  constructor(private readonly deps: ColumnsManagerDeps) {}

  /**
   * Builds the button and docks it into the tools strip. Call once per grid.
   *
   * @param toolsRightEl - The `.pg-grid__tools__right` region, so the launcher
   *   lays out beside the other launchers instead of stacking.
   * @param config - Resolved `GridOptions.columnsManager`; only the presentation
   *   fields are read, since a disabled feature never reaches this call.
   */
  mount(toolsRightEl: HTMLElement, config: ColumnsManagerConfig): void {
    this.launcherEl = this.buildLauncher(config);
    toolsRightEl.appendChild(this.launcherEl);
  }

  /** Opens the Column Chooser, as a click would. */
  open(): void {
    this.deps.onOpen();
  }

  /** Removes the button. The dialog is owned elsewhere and is not touched. */
  destroy(): void {
    this.launcherEl?.remove();
    this.launcherEl = null;
  }

  // ── DOM construction ───────────────────────────────────────────────────────

  private buildLauncher(config: ColumnsManagerConfig): HTMLButtonElement {
    const tooltip = config.tooltip ?? DEFAULT_TOOLTIP;

    const btn = createElement('button', {
      class: 'pg-columns-launcher',
      type: 'button',
      // A dialog, not a menu — the chooser is a modal surface with its own
      // heading and close button, and announcing it as a menu would promise
      // arrow-key navigation it does not provide.
      'aria-haspopup': 'dialog',
      'aria-label': tooltip,
      // The native tooltip, which is what the request asked for: no custom
      // layer to position, dismiss or keep out of the way of the dialog it
      // opens.
      title: tooltip,
    });

    const icon = createDiv('pg-columns-launcher__icon');
    // Decorative: the button is already named by aria-label, and announcing the
    // glyph as well would say the same thing twice.
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = this.deps.iconRenderer.renderToString(config.icon ?? DEFAULT_ICON, ICON_SIZE);
    btn.appendChild(icon);

    btn.addEventListener('click', () => this.open());
    return btn;
  }
}

/**
 * Normalises `GridOptions.columnsManager` into a config object, or `null` when
 * the feature is off.
 *
 * One place for the shorthand, so `true`, `{ enabled: true }` and an explicit
 * `{ enabled: false }` cannot be read three different ways by three callers.
 *
 * @param option - The raw option, in any of its accepted forms.
 * @returns The resolved config, or `null` when the launcher must not be built.
 */
export function resolveColumnsManagerConfig(
  option: boolean | ColumnsManagerConfig | undefined,
): ColumnsManagerConfig | null {
  if (option === true) return { enabled: true };
  if (typeof option === 'object' && option !== null && option.enabled) return option;
  return null;
}
