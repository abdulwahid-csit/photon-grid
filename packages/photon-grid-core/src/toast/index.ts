/**
 * Public barrel for the Photon Grid **Toast Notification System**.
 *
 * @packageDocumentation
 */

export { ToastService, DEFAULT_TOAST_CONFIG } from './toast-service';
export type { ToastServiceDeps } from './toast-service';
export { ToastQueueManager } from './toast-queue-manager';
export type { EnqueueResult } from './toast-queue-manager';
export { ToastAnimationManager } from './toast-animation-manager';
export { ToastContainer } from './toast-container';
export { ToastComponent } from './toast-component';
export type { ToastComponentCallbacks, ResolvedToastSettings } from './toast-component';

export {
  ToastType,
  ToastPosition,
  ToastAnimation,
  ToastDismissReason,
} from './toast.types';
export type {
  Toast,
  ToastAction,
  ToastOptions,
  ToastHandle,
  ToastUpdate,
  ToastServiceConfig,
  ToastServiceConfigInput,
} from './toast.types';
