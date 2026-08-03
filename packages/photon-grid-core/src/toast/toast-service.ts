/**
 * The **Toast Service** — the public entry point of Photon Grid's toast
 * notification system and the orchestrator that ties together the
 * {@link ToastQueueManager} (visibility scheduling), {@link ToastContainer}
 * (viewport regions), {@link ToastAnimationManager} (enter/exit) and per-toast
 * {@link ToastComponent}s.
 *
 * It is dependency-free and framework-agnostic: construct it standalone
 * (`new ToastService()`) or let a grid provide its shared icon renderer and a
 * scoped host. It is also SSR-safe — with no `document` present, show calls
 * become inert no-ops that still return a valid (inactive) handle.
 *
 * @example
 * ```ts
 * const toasts = new ToastService({ position: ToastPosition.BottomRight });
 * toasts.success('Saved!');
 * const h = toasts.error('Upload failed', { action: { label: 'Retry', onClick: retry } });
 * h.update({ message: 'Still trying…' });
 * h.dismiss();
 * ```
 *
 * @packageDocumentation
 */

import { IconRegistry } from '../icons/icon-registry';
import { IconRenderer } from '../icons/icon-renderer';
import { ToastQueueManager } from './toast-queue-manager';
import { ToastContainer } from './toast-container';
import { ToastAnimationManager } from './toast-animation-manager';
import { ToastComponent, type ResolvedToastSettings } from './toast-component';
import {
  ToastAnimation,
  ToastDismissReason,
  ToastPosition,
  ToastType,
  type ToastHandle,
  type ToastOptions,
  type ToastServiceConfig,
  type ToastServiceConfigInput,
} from './toast.types';

/** Built-in defaults, overridable via the constructor or {@link ToastService.configure}. */
export const DEFAULT_TOAST_CONFIG: ToastServiceConfig = {
  position: ToastPosition.BottomRight,
  maxVisible: 4,
  duration: 4500,
  dismissible: true,
  pauseOnHover: true,
  showProgress: true,
  animation: ToastAnimation.Slide,
  gap: 10,
  newestOnTop: true,
  respectReducedMotion: true,
};

/** Optional collaborators — a grid passes its shared renderer and a scoped host. */
export interface ToastServiceDeps {
  /** Icon renderer to reuse (else a default core-icon renderer is created). */
  readonly iconRenderer?: IconRenderer;
  /** Host element for the toast layer (default `document.body`). */
  readonly host?: HTMLElement;
}

/** An inert handle returned when there is no DOM (SSR) or the service is destroyed. */
const inertHandle = (id: string): ToastHandle => ({
  id,
  dismiss: () => undefined,
  update: () => undefined,
  isActive: () => false,
});

/** Orchestrates the toast subsystem and exposes the public API. */
export class ToastService {
  private config: ToastServiceConfig;
  private readonly iconRenderer: IconRenderer;
  private readonly host: HTMLElement | null;

  private readonly queue: ToastQueueManager;
  private readonly animation: ToastAnimationManager;
  private container: ToastContainer | null = null;

  private readonly components = new Map<string, ToastComponent>();
  private readonly positions = new Map<string, ToastPosition>();
  private readonly dedupe = new Map<string, string>();

  private idCounter = 0;
  private destroyed = false;

  constructor(config: ToastServiceConfigInput = {}, deps: ToastServiceDeps = {}) {
    this.config = { ...DEFAULT_TOAST_CONFIG, ...config };
    this.iconRenderer = deps.iconRenderer ?? ToastService.createDefaultIconRenderer();
    this.host = deps.host ?? (typeof document !== 'undefined' ? document.body : null);
    this.queue = new ToastQueueManager(this.config.maxVisible);
    this.animation = new ToastAnimationManager(this.config.animation, this.config.respectReducedMotion);
  }

  // ── Configuration ──────────────────────────────────────────────────────────

  /** Merges a partial configuration and propagates it to the subsystems. */
  configure(patch: ToastServiceConfigInput): void {
    this.config = { ...this.config, ...patch };
    this.queue.setMaxVisible(this.config.maxVisible);
    this.animation.setAnimation(this.config.animation);
    this.animation.setRespectReducedMotion(this.config.respectReducedMotion);
    this.container?.setGap(this.config.gap);
    this.container?.setNewestOnTop(this.config.newestOnTop);
  }

  /** A copy of the current resolved configuration. */
  getConfig(): ToastServiceConfig {
    return { ...this.config };
  }

  // ── Public show API ──────────────────────────────────────────────────────

  /**
   * Shows a toast.
   *
   * @param options - The toast content and per-toast overrides.
   * @returns A handle to control the toast (dismiss/update/isActive).
   */
  show(options: ToastOptions): ToastHandle {
    if (this.destroyed) return inertHandle('destroyed');

    // De-duplication: refresh a live toast with the same key instead of stacking.
    if (options.dedupeKey) {
      const existingId = this.dedupe.get(options.dedupeKey);
      const existing = existingId ? this.components.get(existingId) : undefined;
      if (existing) {
        existing.update({
          message: options.message,
          title: options.title,
          type: options.type,
          duration: options.duration,
          icon: options.icon,
          action: options.action,
        });
        return existing.handle();
      }
    }

    const settings = this.resolve(options);
    const container = this.ensureContainer();
    if (!container) return inertHandle(settings.id);

    const component = new ToastComponent(
      settings,
      this.iconRenderer,
      { onDismiss: (id, reason) => this.dismissInternal(id, reason) },
      this.animation.animationClass(),
    );
    this.components.set(settings.id, component);
    this.positions.set(settings.id, settings.options.position ?? this.config.position);
    if (options.dedupeKey) this.dedupe.set(options.dedupeKey, settings.id);

    const position = this.positions.get(settings.id)!;
    const { visible } = this.queue.enqueue(settings.id, position);
    if (visible) this.mountAndEnter(component, position);

    return component.handle();
  }

  /** Shows a success toast. */
  success(message: string, options?: Omit<ToastOptions, 'message' | 'type'>): ToastHandle {
    return this.show({ ...options, message, type: ToastType.Success });
  }

  /** Shows an error toast (assertive by default). */
  error(message: string, options?: Omit<ToastOptions, 'message' | 'type'>): ToastHandle {
    return this.show({ ...options, message, type: ToastType.Error });
  }

  /** Shows a warning toast. */
  warning(message: string, options?: Omit<ToastOptions, 'message' | 'type'>): ToastHandle {
    return this.show({ ...options, message, type: ToastType.Warning });
  }

  /** Shows an info toast. */
  info(message: string, options?: Omit<ToastOptions, 'message' | 'type'>): ToastHandle {
    return this.show({ ...options, message, type: ToastType.Info });
  }

  /**
   * Shows a persistent loading toast (spinner, no auto-dismiss). Update its
   * handle to a terminal type/duration when the work finishes.
   */
  loading(message: string, options?: Omit<ToastOptions, 'message' | 'type'>): ToastHandle {
    return this.show({ dismissible: false, ...options, message, type: ToastType.Loading, duration: 0 });
  }

  // ── Control ────────────────────────────────────────────────────────────────

  /** Dismisses a toast by id. */
  dismiss(id: string): void {
    this.dismissInternal(id, ToastDismissReason.Api);
  }

  /**
   * Dismisses every live toast, or every toast at a single position.
   *
   * @param position - Restrict to this position; omit to clear all positions.
   */
  dismissAll(position?: ToastPosition): void {
    const ids = position ? this.queue.getAllAt(position) : this.queue.getAll();
    for (const id of ids) this.dismissInternal(id, ToastDismissReason.Api);
  }

  /** Tears down the entire subsystem (timers, DOM, bookkeeping). */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const component of this.components.values()) component.dispose();
    this.components.clear();
    this.positions.clear();
    this.dedupe.clear();
    this.queue.clear();
    this.container?.destroy();
    this.container = null;
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** Mounts a component and plays its enter animation, then starts its timer. */
  private mountAndEnter(component: ToastComponent, position: ToastPosition): void {
    this.container!.mount(position, component.element);
    void this.animation.enter(component.element).then(() => {
      if (this.components.has(component.id)) component.start();
    });
  }

  /** Shared dismissal path for every reason. */
  private dismissInternal(id: string, reason: ToastDismissReason): void {
    const component = this.components.get(id);
    const position = this.positions.get(id);
    if (!component || !position) return;

    const wasVisible = this.queue.isVisible(id, position);
    const promotedId = this.queue.remove(id, position);

    const finalize = (): void => {
      component.dispose();
      this.container?.unmount(component.element);
      this.components.delete(id);
      this.positions.delete(id);
      this.dropDedupe(id);
      component.notifyDismissed(reason);

      if (promotedId) {
        const next = this.components.get(promotedId);
        if (next) this.mountAndEnter(next, position);
      }
    };

    if (wasVisible) {
      void this.animation.exit(component.element).then(finalize);
    } else {
      // Pending toast that was never mounted — finalize without animation.
      finalize();
    }
  }

  /** Removes any dedupe entry pointing at the given id. */
  private dropDedupe(id: string): void {
    for (const [key, value] of this.dedupe) {
      if (value === id) {
        this.dedupe.delete(key);
        break;
      }
    }
  }

  /** Merges options with config defaults into fully-resolved settings. */
  private resolve(options: ToastOptions): ResolvedToastSettings {
    const type = options.type ?? ToastType.Info;
    const isLoading = type === ToastType.Loading;
    const duration = options.duration ?? (isLoading ? 0 : this.config.duration);
    return {
      id: `toast_${++this.idCounter}`,
      type,
      title: options.title,
      message: options.message,
      duration,
      dismissible: options.dismissible ?? this.config.dismissible,
      pauseOnHover: options.pauseOnHover ?? this.config.pauseOnHover,
      showProgress: options.showProgress ?? this.config.showProgress,
      icon: options.icon,
      ariaLive: options.ariaLive ?? (type === ToastType.Error ? 'assertive' : 'polite'),
      options,
    };
  }

  /** Lazily creates the container once a DOM host is available. */
  private ensureContainer(): ToastContainer | null {
    if (this.container) return this.container;
    if (!this.host) return null;
    this.container = new ToastContainer(this.host, this.config.gap, this.config.newestOnTop);
    return this.container;
  }

  /** Builds a self-contained core-icon renderer for standalone use. */
  private static createDefaultIconRenderer(): IconRenderer {
    const registry = new IconRegistry();
    registry.loadCoreIcons();
    return new IconRenderer(registry);
  }
}
