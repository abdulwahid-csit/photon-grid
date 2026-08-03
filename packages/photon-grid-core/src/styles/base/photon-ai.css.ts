/**
 * Photon Grid base styles — photon-ai section.
 *
 * Auto-split from base-styles.ts. Concatenated back (in order) by
 * base-styles.ts; edit here, not there. Order is preserved because CSS
 * cascade depends on it.
 */
export const photonAiCss = `/* ──────────────────── Photon AI ────────────────────
   Floating command bar, anchored to the grid body's bottom-right corner.
   Mounted as a sibling of the pinned-column panels (see PhotonAIPanel.mount /
   GridRenderer.buildLayout) so it floats independently of virtualization and
   scroll; the grid body's own overflow: hidden is what keeps it inside the
   grid container per spec, without this component needing to enforce that
   itself. */
.pg-ai-launcher {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 201;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-primary-text, #ffffff);
  box-shadow: var(--pg-shadows-lg, 0 8px 24px rgba(15, 23, 42, 0.16));
  cursor: pointer;
  transition:
    transform var(--pg-transitions-duration-base, 150ms) var(--pg-transitions-easing-base, ease),
    opacity var(--pg-transitions-duration-base, 150ms) var(--pg-transitions-easing-base, ease),
    background var(--pg-transitions-duration-fast, 100ms);
}
.pg-ai-launcher:hover {
  background: var(--pg-colors-primary-hover, #1d4ed8);
  transform: scale(1.06);
}
.pg-ai-launcher:active {
  background: var(--pg-colors-primary-active, #1e40af);
  transform: scale(0.97);
}
.pg-ai-launcher--hidden {
  opacity: 0;
  transform: scale(0.7);
  pointer-events: none;
}

.pg-ai-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 201;
  width: min(360px, calc(100% - 24px));
  display: none;
  flex-direction: column;
  background: var(--pg-colors-surface, #ffffff);
  border: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-lg, 10px);
  box-shadow: var(--pg-shadows-dropdown, 0 16px 48px rgba(15, 23, 42, 0.24));
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-ai-panel--open {
  display: flex;
}

.pg-ai-panel__header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
}
.pg-ai-panel__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--pg-typography-font-size-sm, 13px);
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  color: var(--pg-colors-primary, #2563eb);
}
.pg-ai-panel__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: var(--pg-colors-text-secondary, #64748b);
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms);
}
.pg-ai-panel__close:hover {
  background: var(--pg-colors-background-alt, #f1f5f9);
}

.pg-ai-panel__log {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.pg-ai-panel__message {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: var(--pg-borders-radius-lg, 10px);
  font-size: var(--pg-typography-font-size-sm, 13px);
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.pg-ai-panel__message--user {
  align-self: flex-end;
  background: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-primary-text, #ffffff);
  border-bottom-right-radius: var(--pg-borders-radius-sm, 4px);
}
.pg-ai-panel__message--assistant {
  align-self: flex-start;
  background: var(--pg-colors-background-alt, #f1f5f9);
  color: var(--pg-colors-text-primary, #0f172a);
  border-bottom-left-radius: var(--pg-borders-radius-sm, 4px);
}
.pg-ai-panel__message--assistant.pg-ai-panel__message--error {
  background: var(--pg-colors-error-subtle, #fef2f2);
  color: var(--pg-colors-error, #dc2626);
}

.pg-ai-panel__input-wrap {
  position: relative;
  flex-shrink: 0;
  display: flex;
  padding: 10px 12px 12px;
  border-top: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
}
.pg-ai-panel__input {
  flex: 1 1 0;
  width: 100%;
  min-height: 36px;
  max-height: 120px;
  padding: 8px 40px 8px 12px;
  border: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-surface, #ffffff);
  color: var(--pg-colors-text-primary, #0f172a);
  font-family: var(--pg-typography-font-family, system-ui, sans-serif);
  font-size: var(--pg-typography-font-size-sm, 13px);
  line-height: 1.4;
  resize: none;
  outline: none;
  transition: border-color var(--pg-transitions-duration-fast, 100ms);
}
.pg-ai-panel__input::placeholder {
  color: var(--pg-colors-text-disabled, #94a3b8);
}
.pg-ai-panel__input:focus {
  border-color: var(--pg-colors-border-focus, #2563eb);
}
.pg-ai-panel__send {
  position: absolute;
  right: 20px;
  bottom: 17px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: none;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-primary, #2563eb);
  color: var(--pg-colors-primary-text, #ffffff);
  cursor: pointer;
  transition:
    background var(--pg-transitions-duration-fast, 100ms),
    transform var(--pg-transitions-duration-fast, 100ms),
    opacity var(--pg-transitions-duration-fast, 100ms);
}
.pg-ai-panel__send:hover:not(:disabled) {
  background: var(--pg-colors-primary-hover, #1d4ed8);
  transform: scale(1.08);
}
.pg-ai-panel__send:disabled {
  background: var(--pg-colors-text-disabled, #94a3b8);
  opacity: 0.5;
  cursor: default;
}
.pg-ai-panel__input:disabled {
  opacity: 0.6;
  cursor: default;
}

/* ── Generative reply: loading state + typewriter streaming ── */

/* "Thinking" indicator shown while a generative provider request is in flight. */
.pg-ai-panel__typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 0;
}
.pg-ai-panel__typing-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--pg-borders-radius-pill, 9999px);
  background: var(--pg-colors-text-secondary, #64748b);
  opacity: 0.4;
  animation: pg-ai-typing 1.2s var(--pg-transitions-easing-base, ease) infinite;
}
.pg-ai-panel__typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}
.pg-ai-panel__typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes pg-ai-typing {
  0%, 60%, 100% {
    opacity: 0.4;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

/* Blinking caret trailing the text while a reply is being typed out. */
.pg-ai-panel__message--streaming > div:last-child::after {
  content: '';
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: var(--pg-colors-primary, #2563eb);
  animation: pg-ai-caret 1s steps(1) infinite;
}
@keyframes pg-ai-caret {
  0%, 50% {
    opacity: 1;
  }
  50.01%, 100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pg-ai-panel__typing-dot,
  .pg-ai-panel__message--streaming > div:last-child::after {
    animation: none;
  }
}

/* ──────────────────── Markdown in assistant replies ──────────────────── */
/*
 * Assistant messages render as Markdown (see photon-ai/chat/markdown-renderer).
 * Every value below is a theme token so code blocks re-skin with the grid in
 * light, dark, and any custom theme — a hardcoded editor palette would be the
 * one part of the panel that ignored the user's theme.
 *
 * The bubble sets white-space: pre-wrap for plain replies; block children
 * here reset it so Markdown controls its own wrapping, while <pre> deliberately
 * keeps "pre" to preserve code indentation.
 */
.pg-ai-md__p,
.pg-ai-md__heading,
.pg-ai-md__list {
  white-space: normal;
}
.pg-ai-md__p + .pg-ai-md__p,
.pg-ai-md__p + .pg-ai-md__list,
.pg-ai-md__list + .pg-ai-md__p,
.pg-ai-md__code + .pg-ai-md__p,
.pg-ai-md__p + .pg-ai-md__code,
.pg-ai-md__heading + .pg-ai-md__p {
  margin-top: 8px;
}
.pg-ai-md__heading {
  font-weight: var(--pg-typography-font-weight-semi-bold, 600);
  line-height: 1.3;
}
.pg-ai-md__heading--1 { font-size: var(--pg-typography-font-size-lg, 15px); }
.pg-ai-md__heading--2 { font-size: var(--pg-typography-font-size-md, 14px); }
.pg-ai-md__heading--3,
.pg-ai-md__heading--4 { font-size: var(--pg-typography-font-size-sm, 13px); }
.pg-ai-md__list {
  margin: 0;
  padding-left: 20px;
}
.pg-ai-md__list li + li { margin-top: 3px; }
.pg-ai-md__strong { font-weight: var(--pg-typography-font-weight-semi-bold, 600); }

.pg-ai-md__code-inline {
  padding: 1px 5px;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: var(--pg-colors-background-alt, #f1f5f9);
  border: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
  font-family: var(--pg-typography-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 0.92em;
  word-break: break-word;
}

.pg-ai-md__code {
  margin: 8px 0;
  border: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
  border-radius: var(--pg-borders-radius-md, 6px);
  background: var(--pg-colors-surface, #ffffff);
  overflow: hidden;
}
.pg-ai-md__code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 6px 4px 10px;
  background: var(--pg-colors-background-alt, #f1f5f9);
  border-bottom: var(--pg-borders-width-thin, 1px) solid var(--pg-colors-border, #e2e8f0);
}
.pg-ai-md__code-lang {
  font-size: var(--pg-typography-font-size-xs, 11px);
  font-weight: var(--pg-typography-font-weight-medium, 500);
  color: var(--pg-colors-text-secondary, #475569);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pg-ai-md__copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: var(--pg-borders-width-thin, 1px) solid transparent;
  border-radius: var(--pg-borders-radius-sm, 4px);
  background: transparent;
  color: var(--pg-colors-text-secondary, #475569);
  font-family: inherit;
  font-size: var(--pg-typography-font-size-xs, 11px);
  cursor: pointer;
  transition: background var(--pg-transitions-duration-fast, 100ms),
              color var(--pg-transitions-duration-fast, 100ms);
}
.pg-ai-md__copy:hover {
  background: var(--pg-colors-surface, #ffffff);
  border-color: var(--pg-colors-border, #e2e8f0);
  color: var(--pg-colors-text-primary, #0f172a);
}
.pg-ai-md__copy:focus-visible {
  outline: none;
  border-color: var(--pg-colors-primary, #2563eb);
  box-shadow: 0 0 0 2px var(--pg-colors-primary-subtle, rgba(37, 99, 235, 0.2));
}
.pg-ai-md__copy--done { color: var(--pg-colors-success, #16a34a); }

.pg-ai-md__pre {
  margin: 0;
  padding: 10px 12px;
  overflow-x: auto;
  white-space: pre;
  font-family: var(--pg-typography-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: var(--pg-typography-font-size-xs, 12px);
  line-height: 1.55;
  color: var(--pg-colors-text-primary, #0f172a);
  tab-size: 2;
}

/* A code block needs the full bubble width to be readable; the 85% cap that
   suits prose makes 60-column snippets wrap awkwardly. */
.pg-ai-panel__message--assistant:has(.pg-ai-md__code) { max-width: 97%; }

`;
