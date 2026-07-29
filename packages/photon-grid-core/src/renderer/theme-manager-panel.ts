/**
 * The **Theme Manager panel** — a "Theme" launcher in the top-right tools strip
 * that lets users manage AI-generated themes: apply a saved theme, export the
 * current one, import a theme file, and reset to the base look. It is a pure-UI
 * component in the same mould as {@link import('./import-menu').ImportMenu}: it
 * owns no theme logic and drives everything through the public
 * {@link import('../types/theme-ai.types').PhotonThemeApi} (`gridApi.photonAI`).
 *
 * All styling is class-driven (see `theme-manager.css.ts`); the component sets
 * no inline styles.
 *
 * @packageDocumentation
 */

import type { IconRenderer } from '../icons/icon-renderer';
import type { ToastService } from '../toast/toast-service';
import type { PhotonThemeApi } from '../types/theme-ai.types';
import { createDiv, createElement } from './dom-utils';

/**
 * The kind of feedback a theme-manager action produces, used to pick the
 * matching toast style (success/error) when surfacing the message.
 */
const enum ThemeManagerFeedback {
  Success = 'success',
  Error = 'error',
}

/** Collaborators the {@link ThemeManagerPanel} needs, injected as a DI bag. */
export interface ThemeManagerDeps {
  /** Renders themed, registry-backed icons. */
  readonly iconRenderer: IconRenderer;
  /** Lazily resolves the live theme API (the engine is created after the renderer). */
  readonly getThemeApi: () => PhotonThemeApi;
  /** Lazily resolves the grid's toast service, used to surface action feedback. */
  readonly getToasts: () => ToastService;
}

/** Top-right "Theme" launcher + dropdown for managing saved/exported/imported themes. */
export class ThemeManagerPanel {
  private wrapperEl: HTMLElement | null = null;
  private launcherEl: HTMLButtonElement | null = null;
  private menuEl: HTMLElement | null = null;
  private listEl: HTMLElement | null = null;
  private fileInputEl: HTMLInputElement | null = null;
  private isOpen = false;

  private readonly boundOutsideDown: (e: MouseEvent) => void;
  private readonly boundKeydown: (e: KeyboardEvent) => void;

  constructor(private readonly deps: ThemeManagerDeps) {
    this.boundKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') this.close();
    };
    this.boundOutsideDown = (e: MouseEvent): void => {
      const target = e.target as Node;
      if (this.isOpen && this.menuEl && !this.menuEl.contains(target) && !this.launcherEl?.contains(target)) {
        this.close();
      }
    };
  }

  /** Builds the launcher, dropdown and hidden file input. Call once per grid. */
  mount(wrapperEl: HTMLElement, toolsBarEl: HTMLElement): void {
    this.wrapperEl = wrapperEl;
    this.launcherEl = this.buildLauncher();
    this.menuEl = this.buildMenu();
    this.fileInputEl = this.buildFileInput();

    toolsBarEl.appendChild(this.launcherEl);
    wrapperEl.appendChild(this.menuEl);
    wrapperEl.appendChild(this.fileInputEl);
  }

  /** Opens the dropdown, refreshing the saved-themes list from the engine. */
  open(): void {
    if (this.isOpen || !this.menuEl || !this.launcherEl) return;
    this.isOpen = true;
    this.refreshList();
    this.menuEl.classList.add('pg-theme-mgr-menu--open');
    this.launcherEl.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      document.addEventListener('mousedown', this.boundOutsideDown, true);
      document.addEventListener('keydown', this.boundKeydown, true);
    }, 0);
  }

  /** Closes the dropdown. */
  close(): void {
    if (!this.isOpen || !this.menuEl || !this.launcherEl) return;
    this.isOpen = false;
    this.menuEl.classList.remove('pg-theme-mgr-menu--open');
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
    this.listEl = null;
    this.wrapperEl = null;
  }

  // ── DOM construction ─────────────────────────────────────────────────────────

  private buildLauncher(): HTMLButtonElement {
    const btn = createElement('button', {
      class: 'pg-theme-mgr-launcher',
      type: 'button',
      'aria-haspopup': 'menu',
      'aria-expanded': 'false',
      'aria-label': 'Theme manager',
      title: 'Themes',
    });
    const icon = createDiv('pg-theme-mgr-launcher__icon');
    icon.innerHTML = this.deps.iconRenderer.renderToString('sparkle', 16);
    const label = createDiv('pg-theme-mgr-launcher__label');
    label.textContent = 'Theme';
    btn.appendChild(icon);
    btn.appendChild(label);
    btn.addEventListener('click', () => this.toggle());
    return btn;
  }

  private buildMenu(): HTMLElement {
    const menu = createDiv('pg-theme-mgr-menu');
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Theme manager');

    const title = createDiv('pg-theme-mgr-menu__title');
    title.textContent = 'Saved themes';
    menu.appendChild(title);

    this.listEl = createDiv('pg-theme-mgr-list');
    menu.appendChild(this.listEl);

    const actions = createDiv('pg-theme-mgr-actions');
    actions.appendChild(this.buildActionButton('Export', () => this.onExport()));
    actions.appendChild(this.buildActionButton('Import', () => this.fileInputEl?.click()));
    actions.appendChild(this.buildActionButton('Reset', () => this.onReset()));
    menu.appendChild(actions);

    return menu;
  }

  private buildActionButton(label: string, onClick: () => void): HTMLButtonElement {
    const btn = createElement('button', { class: 'pg-theme-mgr-action', type: 'button' });
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    return btn;
  }

  private buildFileInput(): HTMLInputElement {
    const input = createElement('input', { type: 'file', class: 'pg-theme-mgr-file', accept: '.json,application/json' });
    input.addEventListener('change', () => this.onFileChosen());
    return input;
  }

  // ── Behaviour ──────────────────────────────────────────────────────────────────

  /** Rebuilds the saved-themes list from the engine's history. */
  private refreshList(): void {
    if (!this.listEl) return;
    this.listEl.textContent = '';
    const api = this.deps.getThemeApi();
    const history = api.getHistory();
    const current = api.getCurrentTheme();

    if (history.length === 0) {
      const empty = createDiv('pg-theme-mgr-empty');
      empty.textContent = 'No saved themes yet. Ask Photon AI to create one.';
      this.listEl.appendChild(empty);
      return;
    }

    // Newest first.
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      const item = createElement('button', { class: 'pg-theme-mgr-item', type: 'button' });
      if (current && entry.theme === current) item.classList.add('pg-theme-mgr-item--active');
      item.textContent = entry.theme.themeName || 'Untitled theme';
      item.addEventListener('click', () => {
        api.restore(entry.index);
        this.refreshList();
      });
      this.listEl.appendChild(item);
    }
  }

  private onExport(): void {
    const api = this.deps.getThemeApi();
    if (!api.getCurrentTheme()) {
      this.notify('No theme to export yet.', ThemeManagerFeedback.Error);
      return;
    }
    try {
      const json = api.exportTheme('json');
      const theme = api.getCurrentTheme();
      const name = (theme?.themeName ?? 'photon-theme').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      this.download(`${name}.json`, json);
      this.notify('Theme exported.', ThemeManagerFeedback.Success);
    } catch (e) {
      this.notify((e as Error).message, ThemeManagerFeedback.Error);
    }
  }

  private onReset(): void {
    this.deps.getThemeApi().reset();
    this.refreshList();
    this.notify('Reset to base theme.', ThemeManagerFeedback.Success);
  }

  private onFileChosen(): void {
    const file = this.fileInputEl?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (): void => {
      try {
        this.deps.getThemeApi().importTheme(String(reader.result ?? ''));
        this.refreshList();
        this.notify('Theme imported and applied.', ThemeManagerFeedback.Success);
      } catch (e) {
        this.notify((e as Error).message, ThemeManagerFeedback.Error);
      }
    };
    reader.onerror = (): void => this.notify('Could not read the file.', ThemeManagerFeedback.Error);
    reader.readAsText(file);
    if (this.fileInputEl) this.fileInputEl.value = '';
  }

  private download(fileName: string, contents: string): void {
    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Surfaces an action result as a transient toast rather than inline panel
   * text, so feedback stays visible after the dropdown closes and never shifts
   * the menu layout. Errors are shown assertively; everything else as success.
   */
  private notify(message: string, feedback: ThemeManagerFeedback): void {
    const toasts = this.deps.getToasts();
    if (feedback === ThemeManagerFeedback.Error) toasts.error(message);
    else toasts.success(message);
  }
}
