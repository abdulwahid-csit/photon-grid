/**
 * The **Import Menu** — a floating *Import ▾* launcher button anchored to the
 * grid's top-right corner that opens a dropdown of import sources (Excel / CSV /
 * TSV / Paste From Clipboard).
 *
 * It is a **pure UI** component in the same mould as
 * {@link import('./filters-tool-panel').FiltersToolPanel}: it owns no import
 * logic and never touches grid data. Choosing a file-based source opens a
 * hidden `<input type=file>` (so no browser-default file control is ever
 * visible) and forwards the picked {@link File} to its host via
 * {@link ImportMenuDeps.onSelectFile}; the clipboard item calls
 * {@link ImportMenuDeps.onSelectClipboard}. The host (the grid) runs the actual
 * import through the {@link import('../engines/import/import-engine').ImportEngine}.
 *
 * Every visual is class-driven — all colors, spacing, radii and typography come
 * from theme CSS variables (see `import-menu.css.ts`); the component sets no
 * inline styles.
 *
 * @packageDocumentation
 */

import type { IconRenderer } from '../icons/icon-renderer';
import { ImportSourceType } from '../types/import.types';
import { createDiv, createElement } from './dom-utils';

/** Collaborators the {@link ImportMenu} needs from the grid, injected as a DI bag. */
export interface ImportMenuDeps {
  /** Renders themed, registry-backed icons. */
  readonly iconRenderer: IconRenderer;
  /** The sources to offer, in order (from `GridOptions.import.formats`). */
  readonly getFormats: () => ImportSourceType[];
  /** Invoked with the picked file for a file-based source (Excel/CSV/TSV). */
  readonly onSelectFile: (source: ImportSourceType, file: File) => void;
  /** Invoked when the user chooses *Paste From Clipboard*. */
  readonly onSelectClipboard: () => void;
}

/** Static per-source presentation metadata. */
interface SourceMeta {
  readonly label: string;
  readonly icon: string;
  /** `accept` for the hidden file input; `null` marks a non-file (clipboard) source. */
  readonly accept: string | null;
}

const SOURCE_META: Record<ImportSourceType, SourceMeta> = {
  [ImportSourceType.Excel]: { label: 'Import Excel', icon: 'fileExcel', accept: '.xlsx,.xls,.xlsm,.xlsb' },
  [ImportSourceType.Csv]: { label: 'Import CSV', icon: 'fileText', accept: '.csv,text/csv' },
  [ImportSourceType.Tsv]: { label: 'Import TSV', icon: 'fileText', accept: '.tsv,text/tab-separated-values' },
  [ImportSourceType.Clipboard]: { label: 'Paste From Clipboard', icon: 'paste', accept: null },
  [ImportSourceType.Json]: { label: 'Import JSON', icon: 'fileText', accept: '.json,application/json' },
};

/** Floating Import launcher + dropdown. Opt-in via `GridOptions.import.enabled`. */
export class ImportMenu {
  private wrapperEl: HTMLElement | null = null;
  private launcherEl: HTMLButtonElement | null = null;
  private menuEl: HTMLElement | null = null;
  private fileInputEl: HTMLInputElement | null = null;
  private itemEls: HTMLButtonElement[] = [];

  private isOpen = false;
  /** Source awaiting a file selection from the hidden input. */
  private pendingSource: ImportSourceType | null = null;

  private readonly boundOutsideDown: (e: MouseEvent) => void;
  private readonly boundKeydown: (e: KeyboardEvent) => void;

  constructor(private readonly deps: ImportMenuDeps) {
    this.boundKeydown = (e: KeyboardEvent): void => this.onKeydown(e);
    this.boundOutsideDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (this.isOpen && this.menuEl && !this.menuEl.contains(target) && !this.launcherEl?.contains(target)) {
        this.close();
      }
    };
  }

  /**
   * Builds the launcher, dropdown and hidden file input and appends them to the
   * grid wrapper. Call once per grid instance.
   *
   * @param wrapperEl  - The `.pg-grid` root element the dropdown floats over.
   * @param toolsBarEl - The shared `.pg-grid__tools` bar the launcher docks into
   *                     so it lays out beside other launchers instead of stacking.
   */
  mount(wrapperEl: HTMLElement, toolsBarEl: HTMLElement): void {
    this.wrapperEl = wrapperEl;
    this.launcherEl = this.buildLauncher();
    this.menuEl = this.buildMenu();
    this.fileInputEl = this.buildFileInput();

    toolsBarEl.appendChild(this.launcherEl);
    wrapperEl.appendChild(this.menuEl);
    wrapperEl.appendChild(this.fileInputEl);
  }

  /** Opens the dropdown. Idempotent. */
  open(): void {
    if (this.isOpen || !this.menuEl || !this.launcherEl) return;
    this.isOpen = true;
    this.menuEl.classList.add('pg-import-menu--open');
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
    this.menuEl.classList.remove('pg-import-menu--open');
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
    this.fileInputEl?.remove();
    this.launcherEl = null;
    this.menuEl = null;
    this.fileInputEl = null;
    this.itemEls = [];
    this.wrapperEl = null;
  }

  // ── DOM construction ───────────────────────────────────────────────────────

  private buildLauncher(): HTMLButtonElement {
    const btn = createElement('button', {
      class: 'pg-import-launcher',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-label': 'Import data',
      title: 'Import',
    });

    const icon = createDiv('pg-import-launcher__icon');
    icon.innerHTML = this.deps.iconRenderer.renderToString('import', 16);

    const label = createDiv('pg-import-launcher__label');
    label.textContent = 'Import';

    const caret = createDiv('pg-import-launcher__caret');
    caret.innerHTML = this.deps.iconRenderer.renderToString('chevronDown', 14);

    btn.appendChild(icon);
    btn.appendChild(label);
    btn.appendChild(caret);
    btn.addEventListener('click', () => this.toggle());
    return btn;
  }

  private buildMenu(): HTMLElement {
    const menu = createDiv('pg-import-menu');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Import sources');

    this.itemEls = [];
    for (const source of this.deps.getFormats()) {
      const meta = SOURCE_META[source];
      if (!meta) continue;
      const item = createElement('button', {
        class: 'pg-import-menu__item',
        type: 'button',
        role: 'menuitem',
        tabindex: -1,
      });

      const iconEl = createDiv('pg-import-menu__item-icon');
      iconEl.innerHTML = this.deps.iconRenderer.renderToString(meta.icon, 16);
      const labelEl = createDiv('pg-import-menu__item-label');
      labelEl.textContent = meta.label;

      item.appendChild(iconEl);
      item.appendChild(labelEl);
      item.addEventListener('click', () => this.onItemActivated(source));

      menu.appendChild(item);
      this.itemEls.push(item);
    }
    return menu;
  }

  private buildFileInput(): HTMLInputElement {
    const input = createElement('input', {
      class: 'pg-import-file-input',
      type: 'file',
      'aria-hidden': 'true',
      tabindex: -1,
    });
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      const source = this.pendingSource;
      // Reset so re-selecting the same file still fires `change`.
      input.value = '';
      this.pendingSource = null;
      if (file && source) this.deps.onSelectFile(source, file);
    });
    return input;
  }

  // ── Interaction ────────────────────────────────────────────────────────────

  private onItemActivated(source: ImportSourceType): void {
    this.close();
    const meta = SOURCE_META[source];
    if (meta.accept === null) {
      this.deps.onSelectClipboard();
      return;
    }
    if (this.fileInputEl) {
      this.pendingSource = source;
      this.fileInputEl.setAttribute('accept', meta.accept);
      this.fileInputEl.click();
    }
  }

  private onKeydown(e: KeyboardEvent): void {
    if (!this.isOpen) return;
    const items = this.itemEls;
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
