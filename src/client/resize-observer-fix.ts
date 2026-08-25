import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

/**
 * Silences the benign "ResizeObserver loop completed with undelivered
 * notifications" (and the older "loop limit exceeded") warning.
 *
 * It is not a real error — the browser emits it when a ResizeObserver callback
 * triggers another layout in the same frame (which the Photon Grid engine can
 * do while (re)sizing on the demos page). It is harmless, but webpack-dev-server
 * surfaces any window error as a full-screen red overlay in development.
 *
 * Deferring the observer callback to the next animation frame breaks the
 * synchronous loop so the warning is never produced. A window 'error' filter is
 * kept as a belt-and-suspenders fallback.
 */
if (ExecutionEnvironment.canUseDOM) {
  const NativeResizeObserver = window.ResizeObserver;

  if (NativeResizeObserver) {
    window.ResizeObserver = class extends NativeResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        let frame = 0;
        super((entries, observer) => {
          if (frame) cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            frame = 0;
            callback(entries, observer);
          });
        });
      }
    };
  }

  const IGNORED_MESSAGES = [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications.',
  ];
  window.addEventListener('error', (event) => {
    if (IGNORED_MESSAGES.includes(event.message)) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });
}
