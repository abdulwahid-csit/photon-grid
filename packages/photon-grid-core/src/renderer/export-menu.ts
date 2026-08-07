/**
 * The **Export Menu** — an *Export ▾* launcher in the grid's tools strip that
 * opens a dropdown of output formats (CSV / JSON / Excel / PDF).
 *
 * The exact counterpart of {@link import('./import-menu').ImportMenu}, and a
 * **pure UI** component in the same mould: it owns no export logic, never
 * touches grid data, and forwards a chosen format to its host through
 * {@link ExportMenuDeps.onSelectFormat}. The host (the grid) runs the actual
 * export through the {@link import('../export/export-service').ExportService}.
 *
 * One deliberate behaviour: **every configured format is shown, whether or not
 * an exporter is registered for it.** Hiding Excel because the host has not
 * installed `xlsx` would present an incomplete product as a complete one and
 * leave nobody any way to discover the capability; showing it and explaining the
 * one-time setup when it is clicked is the honest version. Formats that need
 * setup are marked with a small "Setup" hint rather than being disabled, so the
 * click that produces the explanation is still available.
 *
 * Every visual is class-driven — all colours, spacing, radii and typography come
 * from theme CSS variables (see `export-menu.css.ts`); the component sets no
 * inline styles.
 *
 * @packageDocumentation
 */

import type { IconRenderer } from '../icons/icon-renderer';
import type { ExportFeatureConfig, ExportFormat } from '../export/export.types';
import { BuiltInExportFormat } from '../export/export.types';
import { createDiv, createElement } from './dom-utils';

/** Collaborators the {@link ExportMenu} needs from the grid, injected as a DI bag. */
export interface ExportMenuDeps {
  /** Renders themed, registry-backed icons. */
  readonly iconRenderer: IconRenderer;
  /** The formats to offer, in order (from `GridOptions.export.formats`). */
  readonly getFormats: () => readonly ExportFormat[];
  /**
   * Whether an exporter is currently registered for a format. Drives only the
   * "Setup" hint — never whether the entry is rendered.
   */
  readonly isAvailable: (format: ExportFormat) => boolean;
  /** Invoked with the chosen format. The host runs the export. */
  readonly onSelectFormat: (format: ExportFormat) => void;
}

/** Static per-format presentation metadata. */
interface FormatMeta {
  readonly label: string;
  readonly icon: string;
}

/** Presentation for the built-in formats. Unknown formats fall back to a generic file glyph. */
const FORMAT_META: Readonly<Record<string, FormatMeta>> = {
  [BuiltInExportFormat.Csv]: { label: 'CSV', icon: 'fileText' },
  [BuiltInExportFormat.Json]: { label: 'JSON', icon: 'fileJson' },
  [BuiltInExportFormat.Excel]: { label: 'Excel', icon: 'fileExcel' },
  [BuiltInExportFormat.Pdf]: { label: 'PDF', icon: 'filePdf' },
};

const DEFAULT_LAUNCHER_LABEL = 'Export';
const DEFAULT_LAUNCHER_ICON = 'download';
const LAUNCHER_ICON_SIZE = 16;
const ITEM_ICON_SIZE = 16;
const CARET_ICON_SIZE = 14;

/**
 * Floating Export launcher + dropdown. Opt-in via `GridOptions.export.enabled`,
 * and vetoed by the toolbar's `showExportButton: false`.
 */
export class ExportMenu {
  private wrapperEl: HTMLElement | null = null;
  private launcherEl: HTMLButtonElement | null = null;
  private menuEl: HTMLElement | null = null;
  private itemEls: HTMLButtonElement[] = [];

  private isOpen = false;

  private readonly boundOutsideDown: (e: MouseEvent) => void;
  private readonly boundKeydown: (e: KeyboardEvent) => void;

  constructor(private readonly deps: ExportMenuDeps) {
    this.boundKeydown = (e: KeyboardEvent): void => this.onKeydown(e);
    this.boundOutsideDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (this.isOpen && this.menuEl && !this.menuEl.contains(target) && !this.launcherEl?.contains(target)) {
        this.close();
      }
    };
  }

  /**
   * Builds the launcher and dropdown and docks them into the grid. Call once
   * per grid instance.
   *
   * @param wrapperEl - The `.pg-grid` root element the dropdown floats over.
   * @param toolsRightEl - The `.pg-grid__tools__right` region the launcher docks
   *   into, so it lays out beside the other launchers instead of stacking.
   * @param config - The resolved `GridOptions.export` configuration.
   */
  mount(wrapperEl: HTMLElement, toolsRightEl: HTMLElement, config: ExportFeatureConfig): void {
    this.wrapperEl = wrapperEl;
    this.launcherEl = this.buildLauncher(config);
    this.menuEl = this.buildMenu();

    toolsRightEl.appendChild(this.launcherEl);
    wrapperEl.appendChild(this.menuEl);
  }

  /**
   * Opens the dropdown. Idempotent.
   *
   * The items are rebuilt on every open so the "Setup" hints reflect exporters
   * registered *after* the grid was created — a host that lazy-loads `xlsx`
   * should not need a re-render for Excel to stop advertising setup.
   */
  open(): void {
    if (this.isOpen || !this.menuEl || !this.launcherEl) return;
    this.rebuildItems();
    this.isOpen = true;
    this.menuEl.classList.add('pg-export-menu--open');
    this.launcherEl.setAttribute('aria-expanded', 'true');
    this.itemEls[0]?.focus();
    // Deferred so the opening click does not immediately trip the outside handler.
    setTimeout(() => {
      document.addEventListener('mousedown', this.boundOutsideDown, true);
      document.addEventListener('keydown', this.boundKeydown, true);
    }, 0);
  }

  /** Closes the dropdown. Idempotent. */
  close(): void {
    if (!this.isOpen || !this.menuEl || !this.launcherEl) return;
    this.isOpen = false;
    this.menuEl.classList.remove('pg-export-menu--open');
    this.launcherEl.setAttribute('aria-expanded', 'false');
    document.removeEventListener('mousedown', this.boundOutsideDown, true);
    document.removeEventListener('keydown', this.boundKeydown, true);
  }

  /** Toggles the dropdown. */
  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Tears down DOM and listeners. */
  destroy(): void {
    this.close();
    this.launcherEl?.remove();
    this.menuEl?.remove();
    this.launcherEl = null;
    this.menuEl = null;
    this.itemEls = [];
    this.wrapperEl = null;
  }

  // ── DOM construction ───────────────────────────────────────────────────────

  private buildLauncher(config: ExportFeatureConfig): HTMLButtonElement {
    const label = config.buttonLabel ?? DEFAULT_LAUNCHER_LABEL;
    const tooltip = config.tooltip ?? label;

    const btn = createElement('button', {
      class: 'pg-export-launcher',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-label': `${tooltip} data`,
      title: tooltip,
    });

    const icon = createDiv('pg-export-launcher__icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = this.deps.iconRenderer.renderToString(
      config.icon ?? DEFAULT_LAUNCHER_ICON,
      LAUNCHER_ICON_SIZE,
    );

    const labelEl = createDiv('pg-export-launcher__label');
    labelEl.textContent = label;

    const caret = createDiv('pg-export-launcher__caret');
    caret.setAttribute('aria-hidden', 'true');
    caret.innerHTML = this.deps.iconRenderer.renderToString('chevronDown', CARET_ICON_SIZE);

    btn.appendChild(icon);
    btn.appendChild(labelEl);
    btn.appendChild(caret);
    btn.addEventListener('click', () => this.toggle());
    return btn;
  }

  private buildMenu(): HTMLElement {
    const menu = createDiv('pg-export-menu');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Export formats');
    return menu;
  }

  /** Rebuilds the dropdown's entries against the current formats and availability. */
  private rebuildItems(): void {
    const menu = this.menuEl;
    if (!menu) return;

    while (menu.firstChild) menu.removeChild(menu.firstChild);
    this.itemEls = [];

    for (const format of this.deps.getFormats()) {
      const item = this.buildItem(format);
      menu.appendChild(item);
      this.itemEls.push(item);
    }
  }

  private buildItem(format: ExportFormat): HTMLButtonElement {
    const meta = FORMAT_META[String(format).toLowerCase()] ?? {
      label: String(format).toUpperCase(),
      icon: 'fileText',
    };
    const available = this.deps.isAvailable(format);

    const item = createElement('button', {
      class: `pg-export-menu__item${available ? '' : ' pg-export-menu__item--needs-setup'}`,
      type: 'button',
      role: 'menuitem',
      tabindex: -1,
      'data-format': String(format),
    });

    const iconEl = createDiv('pg-export-menu__item-icon');
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.innerHTML = this.deps.iconRenderer.renderToString(meta.icon, ITEM_ICON_SIZE);

    const labelEl = createDiv('pg-export-menu__item-label');
    labelEl.textContent = meta.label;

    item.appendChild(iconEl);
    item.appendChild(labelEl);

    if (!available) {
      // A hint, not a disabled state: the entry must stay clickable so the click
      // can produce the toast that explains how to enable it.
      const hint = createDiv('pg-export-menu__item-hint');
      hint.textContent = 'Setup';
      item.appendChild(hint);
      item.title = `${meta.label} export needs a one-time setup — select it to see how.`;
    }

    item.addEventListener('click', () => {
      this.close();
      this.deps.onSelectFormat(format);
    });
    return item;
  }

  // ── Interaction ────────────────────────────────────────────────────────────

  private onKeydown(e: KeyboardEvent): void {
    if (!this.isOpen) return;
    const items = this.itemEls;
    if (items.length === 0) return;
    const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.close();
        this.launcherEl?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        items[(activeIndex + 1 + items.length) % items.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        items[(activeIndex - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      default:
        break;
    }
  }
}

/**
 * Normalises `GridOptions.export` into a config object, or `null` when the
 * toolbar dropdown must not be built.
 *
 * One place for the shorthand, so `true`, `{ enabled: true }` and an explicit
 * `{ enabled: false }` cannot be read three different ways by three callers —
 * the same contract {@link import('./columns-manager-launcher').resolveColumnsManagerConfig}
 * provides for the Columns Manager.
 *
 * @param option - The raw option, in any of its accepted forms.
 */
export function resolveExportConfig(
  option: boolean | ExportFeatureConfig | undefined,
): ExportFeatureConfig | null {
  if (option === true) return { enabled: true };
  if (typeof option === 'object' && option !== null && option.enabled) return option;
  return null;
}
