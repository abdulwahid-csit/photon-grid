/**
 * The **Toast component** — owns the DOM, lifecycle and auto-dismiss timing of
 * a single toast. It renders an icon, an optional title, the message, an
 * optional action button, a close button and an optional shrinking progress
 * bar, all from theme tokens with zero inline styling (only CSS custom
 * properties are set, the same pattern the grid uses for dynamic dimensions).
 *
 * Timing is pause-aware: the remaining time is tracked across hover/focus
 * pauses so a toast the user is reading never disappears mid-glance. The
 * component never removes itself from the DOM — it calls its
 * {@link ToastComponentCallbacks.onDismiss} so the {@link ToastService} can run
 * the shared exit animation and update the queue.
 *
 * @packageDocumentation
 */

import type { IconRenderer } from '../icons/icon-renderer';
import { createDiv, createElement } from '../renderer/dom-utils';
import {
  ToastDismissReason,
  ToastType,
  type ToastHandle,
  type ToastOptions,
  type ToastUpdate,
} from './toast.types';

/** Default registry icon per toast type. */
const TYPE_ICON: Record<ToastType, string> = {
  [ToastType.Success]: 'success',
  [ToastType.Error]: 'error',
  [ToastType.Warning]: 'warning',
  [ToastType.Info]: 'info',
  [ToastType.Loading]: 'loading',
};

/** Callbacks the component uses to talk back to the service. */
export interface ToastComponentCallbacks {
  /** Requests dismissal (service plays the exit animation + removes the node). */
  readonly onDismiss: (id: string, reason: ToastDismissReason) => void;
}

/** Fully-resolved per-toast settings (service defaults already merged in). */
export interface ResolvedToastSettings {
  readonly id: string;
  readonly type: ToastType;
  readonly title?: string;
  readonly message: string;
  readonly duration: number;
  readonly dismissible: boolean;
  readonly pauseOnHover: boolean;
  readonly showProgress: boolean;
  readonly icon?: string | null;
  readonly ariaLive: 'polite' | 'assertive';
  readonly options: ToastOptions;
}

/** One toast's view + timer + interaction state. */
export class ToastComponent {
  private readonly el: HTMLElement;
  private iconEl: HTMLElement | null = null;
  private titleEl: HTMLElement | null = null;
  private messageEl!: HTMLElement;
  private progressBarEl: HTMLElement | null = null;

  /** Auto-dismiss timer handle, or `null` when none is running. */
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** Remaining ms until auto-dismiss (tracked across pauses). */
  private remaining: number;
  /** Timestamp the current timer segment started. */
  private segmentStart = 0;
  private disposed = false;

  private settings: ResolvedToastSettings;

  constructor(
    settings: ResolvedToastSettings,
    private readonly iconRenderer: IconRenderer,
    private readonly callbacks: ToastComponentCallbacks,
    animationClass: string,
  ) {
    this.settings = settings;
    this.remaining = settings.duration;
    this.el = this.build(animationClass);
  }

  /** The toast's root element (for the container to mount). */
  get element(): HTMLElement {
    return this.el;
  }

  /** The toast id. */
  get id(): string {
    return this.settings.id;
  }

  /** A public handle bound to this component. */
  handle(): ToastHandle {
    return {
      id: this.settings.id,
      dismiss: () => this.callbacks.onDismiss(this.settings.id, ToastDismissReason.Api),
      update: (patch) => this.update(patch),
      isActive: () => !this.disposed,
    };
  }

  // ── DOM ────────────────────────────────────────────────────────────────────

  private build(animationClass: string): HTMLElement {
    const root = createDiv(`pg-toast pg-toast--${this.settings.type} ${animationClass}`);
    root.setAttribute('role', this.settings.ariaLive === 'assertive' ? 'alert' : 'status');
    root.setAttribute('aria-live', this.settings.ariaLive);
    root.setAttribute('data-toast-id', this.settings.id);

    // Icon.
    const iconName = this.resolveIcon();
    if (iconName) {
      this.iconEl = createDiv('pg-toast__icon');
      this.iconEl.innerHTML = this.iconRenderer.renderToString(iconName, 18);
      if (this.settings.type === ToastType.Loading) this.iconRenderer.injectSpinKeyframes();
      root.appendChild(this.iconEl);
    }

    // Content (title + message).
    const content = createDiv('pg-toast__content');
    if (this.settings.title) {
      this.titleEl = createDiv('pg-toast__title');
      this.titleEl.textContent = this.settings.title;
      content.appendChild(this.titleEl);
    }
    this.messageEl = createDiv('pg-toast__message');
    this.messageEl.textContent = this.settings.message;
    content.appendChild(this.messageEl);
    root.appendChild(content);

    // Action button.
    if (this.settings.options.action) {
      const action = this.settings.options.action;
      const btn = createElement('button', { class: 'pg-toast__action', type: 'button' });
      btn.textContent = action.label;
      if (action.ariaLabel) btn.setAttribute('aria-label', action.ariaLabel);
      btn.addEventListener('click', () => {
        const keepOpen = action.onClick(this.handle());
        if (keepOpen !== false) this.callbacks.onDismiss(this.settings.id, ToastDismissReason.Action);
      });
      root.appendChild(btn);
    }

    // Close button.
    if (this.settings.dismissible) {
      const close = createElement('button', {
        class: 'pg-toast__close',
        type: 'button',
        'aria-label': 'Dismiss notification',
      });
      close.innerHTML = this.iconRenderer.renderToString('close', 14);
      close.addEventListener('click', () => this.callbacks.onDismiss(this.settings.id, ToastDismissReason.User));
      root.appendChild(close);
    }

    // Progress bar (only for auto-dismissing toasts).
    if (this.settings.showProgress && this.settings.duration > 0) {
      const track = createDiv('pg-toast__progress');
      this.progressBarEl = createDiv('pg-toast__progress-bar');
      track.appendChild(this.progressBarEl);
      root.appendChild(track);
    }

    // Pause on hover / focus.
    if (this.settings.pauseOnHover && this.settings.duration > 0) {
      root.addEventListener('mouseenter', () => this.pause());
      root.addEventListener('mouseleave', () => this.resume());
      root.addEventListener('focusin', () => this.pause());
      root.addEventListener('focusout', () => this.resume());
    }

    return root;
  }

  /** Resolves the icon name, honoring an explicit override or `null` (hidden). */
  private resolveIcon(): string | null {
    if (this.settings.icon === null) return null;
    return this.settings.icon ?? TYPE_ICON[this.settings.type];
  }

  // ── Timer ──────────────────────────────────────────────────────────────────

  /** Starts the auto-dismiss countdown and the progress animation. Idempotent. */
  start(): void {
    if (this.disposed || this.settings.duration <= 0 || this.timer !== null) return;
    this.segmentStart = ToastComponent.now();
    this.timer = setTimeout(
      () => this.callbacks.onDismiss(this.settings.id, ToastDismissReason.Timeout),
      this.remaining,
    );
    if (this.progressBarEl) {
      // A linear keyframe animation over the full duration; pause/resume is
      // handled by toggling `animation-play-state` (the `--paused` class), so it
      // stays in sync with the JS timer without restarting.
      this.progressBarEl.style.setProperty('--pg-toast-duration', `${this.settings.duration}ms`);
      this.progressBarEl.classList.add('pg-toast__progress-bar--run');
    }
  }

  /** Pauses the countdown (and freezes the progress bar). */
  private pause(): void {
    if (this.timer === null || this.disposed) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.remaining -= ToastComponent.now() - this.segmentStart;
    this.el.classList.add('pg-toast--paused');
  }

  /** Resumes the countdown from the remaining time (continues the frozen bar). */
  private resume(): void {
    if (this.timer !== null || this.disposed || this.remaining <= 0) return;
    this.el.classList.remove('pg-toast--paused');
    this.segmentStart = ToastComponent.now();
    this.timer = setTimeout(
      () => this.callbacks.onDismiss(this.settings.id, ToastDismissReason.Timeout),
      this.remaining,
    );
  }

  // ── Update / teardown ────────────────────────────────────────────────────

  /** Applies a content patch in place, resetting the timer if the duration changed. */
  update(patch: ToastUpdate): void {
    if (this.disposed) return;

    if (patch.type && patch.type !== this.settings.type) {
      this.el.classList.remove(`pg-toast--${this.settings.type}`);
      this.el.classList.add(`pg-toast--${patch.type}`);
    }
    this.settings = { ...this.settings, ...patch };

    if (patch.title !== undefined && this.titleEl) this.titleEl.textContent = patch.title;
    if (patch.message !== undefined) this.messageEl.textContent = patch.message;
    if ((patch.type || patch.icon !== undefined) && this.iconEl) {
      const name = this.resolveIcon();
      this.iconEl.innerHTML = name ? this.iconRenderer.renderToString(name, 18) : '';
    }
    if (patch.duration !== undefined) {
      this.clearTimer();
      this.remaining = patch.duration;
      this.start();
    }
  }

  /** Stops the timer without dismissing (used before teardown). */
  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /** Tears down timers + listeners. The element is removed by the container. */
  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }

  /** Fires the caller's {@link ToastOptions.onDismiss} callback with the reason. */
  notifyDismissed(reason: ToastDismissReason): void {
    this.settings.options.onDismiss?.(reason);
  }

  /** High-resolution-ish timestamp for pause math. */
  private static now(): number {
    return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  }
}
