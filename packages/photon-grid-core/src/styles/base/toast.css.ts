/**
 * Photon Grid base styles — toast-notifications section.
 *
 * Concatenated (in order) by base-styles.ts; edit here, not there. Order is
 * preserved because CSS cascade depends on it.
 *
 * Every value is a theme variable (with a sensible fallback) so toasts re-theme
 * with the rest of the grid — light, dark and custom themes — with zero inline
 * styles (only the gap and progress-duration custom properties are set from JS).
 * The layer is `pointer-events: none` so it never blocks the app; each toast
 * re-enables pointer events for its own controls.
 */
export const toastCss = `/* ──────────────────── Toast Notifications ──────────────────── */

.pg-toast-layer {
  position: fixed;
  inset: 0;
  z-index: var(--pg-z-index-toast, 11000);
  pointer-events: none;
}

.pg-toast-region {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: var(--pg-toast-gap, 10px);
  max-width: min(420px, calc(100vw - 32px));
  padding: 16px;
  pointer-events: none;
}
.pg-toast-region--top-left     { top: 0; left: 0; }
.pg-toast-region--top-center   { top: 0; left: 50%; transform: translateX(-50%); align-items: center; }
.pg-toast-region--top-right    { top: 0; right: 0; }
.pg-toast-region--bottom-left  { bottom: 0; left: 0; }
.pg-toast-region--bottom-center{ bottom: 0; left: 50%; transform: translateX(-50%); align-items: center; }
.pg-toast-region--bottom-right { bottom: 0; right: 0; }

/* ── Toast card ── */
.pg-toast {
  --pg-toast-accent: var(--pg-colors-info, #2563eb);
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  box-sizing: border-box;
  width: 100%;
  min-width: 280px;
  padding: 12px 14px;
  overflow: hidden;
  background: var(--pg-colors-surface, #ffffff);
  color: var(--pg-colors-text-primary, #0f172a);
  border: 1px solid var(--pg-colors-border, #e2e8f0);
  border-left: 3px solid var(--pg-toast-accent);
  border-radius: var(--pg-borders-radius-md, 8px);
  box-shadow: var(--pg-shadows-dropdown, 0 16px 48px rgba(15, 23, 42, 0.24));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  pointer-events: auto;
  transition: opacity 0.28s var(--pg-transitions-easing-base, ease), transform 0.28s var(--pg-transitions-easing-base, ease);
}

.pg-toast--success { --pg-toast-accent: var(--pg-colors-success, #16a34a); }
.pg-toast--error   { --pg-toast-accent: var(--pg-colors-error, #dc2626); }
.pg-toast--warning { --pg-toast-accent: var(--pg-colors-warning, #d97706); }
.pg-toast--info    { --pg-toast-accent: var(--pg-colors-info, #2563eb); }
.pg-toast--loading { --pg-toast-accent: var(--pg-colors-text-secondary, #64748b); }

.pg-toast__icon {
  display: inline-flex;
  flex: none;
  margin-top: 1px;
  color: var(--pg-toast-accent);
}
.pg-toast__icon svg { display: block; }

.pg-toast__content { flex: 1; min-width: 0; }
.pg-toast__title {
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  margin-bottom: 2px;
  line-height: 1.3;
}
.pg-toast__message {
  color: var(--pg-colors-text-secondary, #475569);
  line-height: 1.4;
  word-break: break-word;
}

.pg-toast__action {
  flex: none;
  align-self: center;
  padding: 4px 8px;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: var(--pg-toast-accent);
  font: inherit;
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-toast__action:hover { background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-toast__action:focus-visible { outline: 2px solid var(--pg-toast-accent); outline-offset: 1px; }

.pg-toast__close {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: -2px -4px 0 0;
  padding: 0;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: var(--pg-colors-text-disabled, #94a3b8);
  cursor: pointer;
  transition: color var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease),
    background var(--pg-transitions-duration-fast, 100ms) var(--pg-transitions-easing-base, ease);
}
.pg-toast__close:hover { color: var(--pg-colors-text-primary, #0f172a); background: var(--pg-colors-background-alt, #f1f5f9); }
.pg-toast__close:focus-visible { outline: 2px solid var(--pg-toast-accent); outline-offset: 1px; }
.pg-toast__close svg { display: block; }

/* ── Progress bar (remaining time) ── */
.pg-toast__progress {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  background: transparent;
}
.pg-toast__progress-bar {
  height: 100%;
  width: 100%;
  transform-origin: left center;
  background: var(--pg-toast-accent);
  opacity: 0.7;
}
.pg-toast__progress-bar--run {
  animation: pg-toast-progress var(--pg-toast-duration, 4500ms) linear forwards;
}
.pg-toast--paused .pg-toast__progress-bar { animation-play-state: paused; }

@keyframes pg-toast-progress {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
}

/* ── Enter / exit transitions ── */
.pg-toast--enter { opacity: 0; }
.pg-toast--anim-slide.pg-toast--enter  { transform: translateY(14px); }
.pg-toast--anim-scale.pg-toast--enter  { transform: scale(0.95); }
.pg-toast--exit { opacity: 0; transform: scale(0.97); }

@media (prefers-reduced-motion: reduce) {
  .pg-toast { transition: none; }
  .pg-toast__progress-bar--run { animation: none; }
}
`;
