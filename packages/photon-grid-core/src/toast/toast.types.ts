/**
 * Public type surface for the Photon Grid **Toast Notification System** — a
 * dependency-free, framework-agnostic transient-message system (success / error
 * / warning / info) styled entirely from Photon theme tokens.
 *
 * These types carry no DOM or framework dependency so the service stays
 * unit-testable and reusable across every wrapper (Angular / React / Vue /
 * Vanilla) and even standalone without a grid.
 *
 * @packageDocumentation
 */

/** Severity/intent of a toast — drives its icon, accent color and default ARIA politeness. */
export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  /** A neutral toast with a spinner and no auto-dismiss (e.g. "Saving…"). */
  Loading = 'loading',
}

/** Screen anchor a toast stack is docked to. */
export enum ToastPosition {
  TopLeft = 'top-left',
  TopCenter = 'top-center',
  TopRight = 'top-right',
  BottomLeft = 'bottom-left',
  BottomCenter = 'bottom-center',
  BottomRight = 'bottom-right',
}

/** Enter/exit animation style. */
export enum ToastAnimation {
  /** Slides in from the docked edge (default). */
  Slide = 'slide',
  /** Fades in place. */
  Fade = 'fade',
  /** Scales up from 95%. */
  Scale = 'scale',
}

/** A user action rendered as a button inside the toast (e.g. "Undo"). */
export interface ToastAction {
  /** Button label. */
  readonly label: string;
  /**
   * Invoked when the action is clicked. Return `false` to keep the toast open;
   * any other return (or void) dismisses it.
   */
  readonly onClick: (handle: ToastHandle) => boolean | void;
  /** Accessible label if the visible label is an icon/short text. */
  readonly ariaLabel?: string;
}

/** Options accepted by {@link ToastService.show} and the typed shortcuts. */
export interface ToastOptions {
  /** The message body (plain text; never rendered as HTML). Required. */
  message: string;
  /** Optional bold title line above the message. */
  title?: string;
  /** Severity/intent. @default {@link ToastType.Info} */
  type?: ToastType;
  /** Docked position. @default the service's configured position. */
  position?: ToastPosition;
  /**
   * Auto-dismiss delay in ms. `0` (or {@link ToastType.Loading}) keeps the
   * toast until dismissed programmatically. @default the service's configured duration.
   */
  duration?: number;
  /** Whether a close (✕) button is shown. @default the service's configured value. */
  dismissible?: boolean;
  /** Pause the auto-dismiss timer while hovered/focused. @default the service's configured value. */
  pauseOnHover?: boolean;
  /** Render a shrinking progress bar for the remaining time. @default the service's configured value. */
  showProgress?: boolean;
  /**
   * Icon name (from the {@link import('../icons/icon-registry').IconRegistry})
   * to override the type's default icon. Pass `null` to hide the icon entirely.
   */
  icon?: string | null;
  /** An optional action button. */
  action?: ToastAction;
  /**
   * De-duplication key. Showing a toast whose `dedupeKey` matches a live toast
   * updates that toast instead of stacking a duplicate.
   */
  dedupeKey?: string;
  /** ARIA live-region politeness. Defaults to `assertive` for errors, `polite` otherwise. */
  ariaLive?: 'polite' | 'assertive';
  /** Called after the toast has finished its exit animation and been removed. */
  onDismiss?: (reason: ToastDismissReason) => void;
}

/** Why a toast was dismissed — passed to {@link ToastOptions.onDismiss}. */
export enum ToastDismissReason {
  /** Auto-dismiss timer elapsed. */
  Timeout = 'timeout',
  /** User clicked the close button. */
  User = 'user',
  /** An action button dismissed it. */
  Action = 'action',
  /** Dismissed programmatically ({@link ToastService.dismiss}/`dismissAll`). */
  Api = 'api',
  /** Replaced by a dedupe update or {@link ToastService.destroy}. */
  Replaced = 'replaced',
}

/** A live, read-only snapshot of a toast. */
export interface Toast {
  readonly id: string;
  readonly type: ToastType;
  readonly title?: string;
  readonly message: string;
  readonly position: ToastPosition;
  readonly duration: number;
  readonly createdAt: number;
}

/** A handle returned from every show call, for controlling that specific toast. */
export interface ToastHandle {
  /** The toast's unique id. */
  readonly id: string;
  /** Dismisses this toast (plays the exit animation). */
  dismiss(): void;
  /** Patches this toast's content in place (message/title/type/duration/etc.). */
  update(patch: ToastUpdate): void;
  /** Whether the toast is still live (visible or queued). */
  isActive(): boolean;
}

/** Mutable subset applied by {@link ToastHandle.update}. */
export interface ToastUpdate {
  message?: string;
  title?: string;
  type?: ToastType;
  duration?: number;
  icon?: string | null;
  action?: ToastAction;
  showProgress?: boolean;
}

/** Service-wide configuration and per-toast defaults. */
export interface ToastServiceConfig {
  /** Default docked position. @default {@link ToastPosition.BottomRight} */
  position: ToastPosition;
  /** Max simultaneously-visible toasts per position; extras queue. @default 4 */
  maxVisible: number;
  /** Default auto-dismiss duration in ms. @default 4500 */
  duration: number;
  /** Default: show a close button. @default true */
  dismissible: boolean;
  /** Default: pause the timer on hover/focus. @default true */
  pauseOnHover: boolean;
  /** Default: render the remaining-time progress bar. @default true */
  showProgress: boolean;
  /** Enter/exit animation style. @default {@link ToastAnimation.Slide} */
  animation: ToastAnimation;
  /** Gap between stacked toasts, in px. @default 10 */
  gap: number;
  /** Newest toast rendered nearest the docked edge. @default true */
  newestOnTop: boolean;
  /**
   * Honor the OS `prefers-reduced-motion` setting (disable animations).
   * @default true
   */
  respectReducedMotion: boolean;
}

/** All fields optional for {@link ToastService.configure}. */
export type ToastServiceConfigInput = Partial<ToastServiceConfig>;
