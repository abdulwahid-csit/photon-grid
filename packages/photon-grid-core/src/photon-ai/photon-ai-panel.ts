import type { IconRenderer } from '../icons/icon-renderer';
import type { PhotonAIConfig } from '../types/photon-ai.types';
import type { PhotonCommandResult } from './photon-ai.types';
import { createDiv, createElement, clearChildren } from '../renderer/dom-utils';

/** Textarea grows with content up to this height (px), then scrolls internally. */
const INPUT_MAX_HEIGHT_PX = 120;

/** Typewriter reveal speed for streamed assistant replies, in characters per second. */
const TYPEWRITER_CHARS_PER_SECOND = 140;

/** One line of the conversation log — kept as plain data so re-rendering (or a future "export chat" feature) never has to re-derive it from the DOM. */
interface ChatMessage {
  readonly role: 'user' | 'assistant';
  readonly text: string;
  readonly success?: boolean;
}

/**
 * The "Photon AI" panel — a docked sidebar sliding in from the right edge of
 * the grid's own body viewport, where users type natural-language commands
 * and questions for {@link PhotonAIService} to interpret, with a scrollable
 * conversation history (not just a one-line status) so multi-turn use
 * (a command, then a follow-up question, then another command) reads like a
 * chat rather than a disappearing toast.
 *
 * Mounted as a sibling of the pinned-column panels (same pattern as
 * `DetailRowRenderer`/the sticky layer — see `GridRenderer.buildLayout`), so
 * it floats independently of virtualization and never affects row layout.
 * It deliberately stays *inside* the grid's own body box (never
 * `document.body`) — `bodyWrapEl`'s `overflow: hidden` is what keeps the
 * whole widget contained to the grid the way an embeddable component should
 * be, rather than taking over the host page. Unlike a modal, it never
 * blocks interaction with the grid behind it — there is no backdrop.
 *
 * Pure UI: it knows nothing about intents, columns, or the `GridApi` — it
 * only calls the submit handler wired in via {@link setSubmitHandler} and
 * renders whatever `PhotonCommandResult` comes back.
 */
export class PhotonAIPanel {
  private launcherEl: HTMLButtonElement | null = null;
  private panelEl: HTMLElement | null = null;
  private logEl: HTMLElement | null = null;
  private inputEl: HTMLTextAreaElement | null = null;
  private sendBtnEl: HTMLButtonElement | null = null;

  private submitHandler: ((text: string) => PhotonCommandResult) | null = null;
  /** Optional async handler (a configured generative provider). When set, {@link trySubmit} streams the reply instead of rendering it instantly. */
  private asyncSubmitHandler: ((text: string, signal: AbortSignal) => Promise<PhotonCommandResult>) | null = null;
  private isOpen = false;
  private messages: ChatMessage[] = [];

  /** In-flight generative request, so a second submit / close / destroy can cancel the first. */
  private activeController: AbortController | null = null;
  /** Handle for the running typewriter animation frame, so it can be cancelled on teardown. */
  private typewriterHandle: number | null = null;
  /** True while a request is being processed or its reply streamed — blocks concurrent submits. */
  private isBusy = false;

  constructor(private iconRenderer: IconRenderer) {}

  /** Mounts the launcher + docked side panel into the grid body. Idempotent-safe: call once per grid instance. */
  mount(bodyWrapEl: HTMLElement, config: PhotonAIConfig): void {
    this.launcherEl = this.buildLauncher();
    this.panelEl = this.buildPanel(config);
    bodyWrapEl.appendChild(this.launcherEl);
    bodyWrapEl.appendChild(this.panelEl);

    if (config.defaultOpen) this.open();
  }

  /** Wires the callback that turns typed text into a result — set once `GridApi`/`PhotonAIService` exist (after `GridCore` construction). */
  setSubmitHandler(fn: (text: string) => PhotonCommandResult): void {
    this.submitHandler = fn;
  }

  /**
   * Wires an async handler used when a generative provider (e.g. Gemini) is
   * configured. When present it takes precedence over the synchronous handler:
   * the panel shows a loading indicator while the request is in flight, then
   * streams the reply in with a typewriter effect. The passed `AbortSignal` is
   * aborted if the user submits again, closes, or the grid is destroyed.
   */
  setAsyncSubmitHandler(fn: (text: string, signal: AbortSignal) => Promise<PhotonCommandResult>): void {
    this.asyncSubmitHandler = fn;
  }

  /** Programmatic equivalent of typing `text` and pressing send — also appends to the conversation log, so a scripted call and a manual one look identical. */
  invoke(text: string): PhotonCommandResult {
    this.appendMessage({ role: 'user', text });
    const result = this.submitHandler?.(text) ?? { success: false, message: 'Photon AI is not ready yet.' };
    this.appendMessage({ role: 'assistant', text: result.message, success: result.success });
    return result;
  }

  /**
   * Async, streaming counterpart to {@link invoke}, used when an async handler
   * is configured. Appends the user's message, shows a loading bubble while the
   * provider works, then reveals the reply with a typewriter animation that
   * keeps the log scrolled to the latest text. Always resolves — errors are
   * rendered as an error bubble, never thrown.
   */
  async invokeAsync(text: string): Promise<PhotonCommandResult> {
    if (!this.asyncSubmitHandler) return this.invoke(text);

    // A new request supersedes any in-flight one.
    this.cancelActiveRequest();
    this.setBusy(true);

    this.appendMessage({ role: 'user', text });
    const bubble = this.appendLoadingBubble();

    const controller = new AbortController();
    this.activeController = controller;

    let result: PhotonCommandResult;
    try {
      result = await this.asyncSubmitHandler(text, controller.signal);
    } catch (err) {
      result = { success: false, message: err instanceof Error ? err.message : 'Photon AI request failed.' };
    }

    if (controller.signal.aborted) {
      // Superseded/closed mid-flight — drop the stale loading bubble silently.
      bubble.remove();
      if (this.activeController === controller) this.activeController = null;
      return result;
    }

    this.activeController = null;
    await this.renderStreamingResult(bubble, result);
    this.setBusy(false);
    return result;
  }

  open(): void {
    if (this.isOpen || !this.panelEl || !this.launcherEl) return;
    this.isOpen = true;
    this.launcherEl.classList.add('pg-ai-launcher--hidden');
    this.panelEl.classList.add('pg-ai-panel--open');
    if (this.messages.length === 0) this.appendGreeting();
    requestAnimationFrame(() => this.inputEl?.focus());
  }

  close(): void {
    if (!this.isOpen || !this.panelEl || !this.launcherEl) return;
    this.isOpen = false;
    this.cancelActiveRequest();
    this.panelEl.classList.remove('pg-ai-panel--open');
    this.launcherEl.classList.remove('pg-ai-launcher--hidden');
  }

  destroy(): void {
    this.cancelActiveRequest();
    this.launcherEl?.remove();
    this.panelEl?.remove();
    this.launcherEl = null;
    this.panelEl = null;
    this.logEl = null;
    this.inputEl = null;
    this.sendBtnEl = null;
    this.submitHandler = null;
    this.asyncSubmitHandler = null;
    this.messages = [];
    this.isBusy = false;
  }

  // ─── Private: construction ─────────────────────────────────────────────

  private buildLauncher(): HTMLButtonElement {
    const btn = createElement('button', { type: 'button', 'aria-label': 'Open Photon AI' });
    btn.className = 'pg-ai-launcher';
    btn.appendChild(this.iconRenderer.render('sparkle', { size: 20 }));
    btn.addEventListener('click', () => this.open());
    return btn;
  }

  private buildPanel(config: PhotonAIConfig): HTMLElement {
    const panel = createDiv('pg-ai-panel');
    panel.setAttribute('role', 'complementary');
    panel.setAttribute('aria-label', 'Photon AI');

    panel.appendChild(this.buildHeader());

    this.logEl = createDiv('pg-ai-panel__log');
    this.logEl.setAttribute('role', 'log');
    this.logEl.setAttribute('aria-live', 'polite');
    panel.appendChild(this.logEl);

    panel.appendChild(this.buildInputArea(config));

    return panel;
  }

  private buildHeader(): HTMLElement {
    const header = createDiv('pg-ai-panel__header');

    const title = createDiv('pg-ai-panel__title');
    title.appendChild(this.iconRenderer.render('sparkle', { size: 16 }));
    const label = document.createElement('span');
    label.textContent = 'Photon AI';
    title.appendChild(label);
    header.appendChild(title);

    const closeBtn = createElement('button', { type: 'button', 'aria-label': 'Close Photon AI' });
    closeBtn.className = 'pg-ai-panel__close';
    closeBtn.appendChild(this.iconRenderer.render('close', { size: 14 }));
    closeBtn.addEventListener('click', () => this.close());
    header.appendChild(closeBtn);

    return header;
  }

  private buildInputArea(config: PhotonAIConfig): HTMLElement {
    const wrap = createDiv('pg-ai-panel__input-wrap');

    const input = createElement('textarea', {
      placeholder: config.placeholder ?? 'Ask Photon AI to do something...',
      rows: 1,
    }) as HTMLTextAreaElement;
    input.className = 'pg-ai-panel__input';
    this.inputEl = input;

    const sendBtn = createElement('button', { type: 'button', 'aria-label': 'Send' });
    sendBtn.className = 'pg-ai-panel__send';
    sendBtn.disabled = true;
    sendBtn.appendChild(this.iconRenderer.render('arrowUp', { size: 14 }));
    this.sendBtnEl = sendBtn;

    input.addEventListener('input', () => {
      this.autoGrow(input);
      sendBtn.disabled = input.value.trim().length === 0;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.trySubmit();
      }
    });
    sendBtn.addEventListener('click', () => this.trySubmit());

    wrap.appendChild(input);
    wrap.appendChild(sendBtn);
    return wrap;
  }

  // ─── Private: behavior ──────────────────────────────────────────────────

  private autoGrow(input: HTMLTextAreaElement): void {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, INPUT_MAX_HEIGHT_PX)}px`;
  }

  private trySubmit(): void {
    const input = this.inputEl;
    const sendBtn = this.sendBtnEl;
    if (!input || !sendBtn) return;
    if (this.isBusy) return;

    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;

    input.value = '';
    sendBtn.disabled = true;
    this.autoGrow(input);

    if (this.asyncSubmitHandler) {
      void this.invokeAsync(text);
    } else {
      this.invoke(text);
    }
  }

  private appendGreeting(): void {
    this.appendMessage({
      role: 'assistant',
      text: 'Hi! Tell me what to do — sort, filter, pin, group, hide/show columns, move columns, selection, and more — or ask me a question about the grid\'s current state (try "help" to see everything I understand).',
      success: true,
    });
  }

  private appendMessage(message: ChatMessage): void {
    this.messages.push(message);
    if (!this.logEl) return;

    const bubble = this.createBubble(message.role);
    if (message.role === 'assistant') {
      bubble.classList.toggle('pg-ai-panel__message--error', message.success === false);
    }
    this.renderLines(bubble, message.text);

    this.logEl.appendChild(bubble);
    this.scrollToBottom();
  }

  /** Creates an empty message bubble for `role`, without inserting it — callers append and fill it. */
  private createBubble(role: ChatMessage['role']): HTMLElement {
    return createDiv(`pg-ai-panel__message pg-ai-panel__message--${role}`);
  }

  /** Renders `text` into `bubble` as one `<div>` per line (so multi-line replies keep their line breaks). */
  private renderLines(bubble: HTMLElement, text: string): void {
    clearChildren(bubble);
    for (const line of text.split('\n')) {
      const lineEl = document.createElement('div');
      // A zero-width space keeps empty lines from collapsing to zero height.
      lineEl.textContent = line.length > 0 ? line : '​';
      bubble.appendChild(lineEl);
    }
  }

  // ─── Private: streaming ────────────────────────────────────────────────

  /** Appends an assistant bubble in its "thinking" state (animated dots) and returns it for later streaming. */
  private appendLoadingBubble(): HTMLElement {
    const bubble = this.createBubble('assistant');
    bubble.classList.add('pg-ai-panel__message--loading');

    const dots = createDiv('pg-ai-panel__typing');
    for (let i = 0; i < 3; i++) dots.appendChild(createDiv('pg-ai-panel__typing-dot'));
    bubble.appendChild(dots);

    this.logEl?.appendChild(bubble);
    this.scrollToBottom();
    return bubble;
  }

  /** Turns the loading bubble into the final reply — instantly under reduced-motion, else via a typewriter reveal. */
  private async renderStreamingResult(bubble: HTMLElement, result: PhotonCommandResult): Promise<void> {
    bubble.classList.remove('pg-ai-panel__message--loading');
    bubble.classList.toggle('pg-ai-panel__message--error', result.success === false);
    this.messages.push({ role: 'assistant', text: result.message, success: result.success });

    if (this.prefersReducedMotion()) {
      this.renderLines(bubble, result.message);
      this.scrollToBottom();
      return;
    }

    await this.typewrite(bubble, result.message);
  }

  /** Reveals `text` character-by-character, auto-scrolling as it grows, and resolves when fully rendered. */
  private typewrite(bubble: HTMLElement, text: string): Promise<void> {
    return new Promise((resolve) => {
      bubble.classList.add('pg-ai-panel__message--streaming');
      let startTs: number | null = null;

      const step = (ts: number): void => {
        if (startTs === null) startTs = ts;
        const elapsedSeconds = (ts - startTs) / 1000;
        const revealCount = Math.min(text.length, Math.ceil(elapsedSeconds * TYPEWRITER_CHARS_PER_SECOND));

        this.renderLines(bubble, text.slice(0, revealCount));
        this.scrollToBottom();

        if (revealCount >= text.length) {
          bubble.classList.remove('pg-ai-panel__message--streaming');
          this.typewriterHandle = null;
          resolve();
          return;
        }
        this.typewriterHandle = requestAnimationFrame(step);
      };

      this.typewriterHandle = requestAnimationFrame(step);
    });
  }

  /** Toggles the input/send disabled state while a request is being processed. */
  private setBusy(busy: boolean): void {
    this.isBusy = busy;
    if (this.inputEl) this.inputEl.disabled = busy;
    if (this.sendBtnEl) this.sendBtnEl.disabled = busy || this.inputEl?.value.trim().length === 0;
    if (!busy) {
      requestAnimationFrame(() => this.inputEl?.focus());
    }
  }

  /** Aborts any in-flight request and stops a running typewriter — used on new submit, close, and destroy. */
  private cancelActiveRequest(): void {
    this.activeController?.abort();
    this.activeController = null;
    if (this.typewriterHandle !== null) {
      cancelAnimationFrame(this.typewriterHandle);
      this.typewriterHandle = null;
    }
    if (this.isBusy) this.setBusy(false);
  }

  private scrollToBottom(): void {
    if (this.logEl) this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
