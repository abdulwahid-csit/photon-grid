import { createDiv, createElement } from '../renderer/dom-utils';
/** Textarea grows with content up to this height (px), then scrolls internally. */
const INPUT_MAX_HEIGHT_PX = 120;
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
    constructor(iconRenderer) {
        this.iconRenderer = iconRenderer;
        this.launcherEl = null;
        this.panelEl = null;
        this.logEl = null;
        this.inputEl = null;
        this.sendBtnEl = null;
        this.submitHandler = null;
        this.isOpen = false;
        this.messages = [];
    }
    /** Mounts the launcher + docked side panel into the grid body. Idempotent-safe: call once per grid instance. */
    mount(bodyWrapEl, config) {
        this.launcherEl = this.buildLauncher();
        this.panelEl = this.buildPanel(config);
        bodyWrapEl.appendChild(this.launcherEl);
        bodyWrapEl.appendChild(this.panelEl);
        if (config.defaultOpen)
            this.open();
    }
    /** Wires the callback that turns typed text into a result — set once `GridApi`/`PhotonAIService` exist (after `GridCore` construction). */
    setSubmitHandler(fn) {
        this.submitHandler = fn;
    }
    /** Programmatic equivalent of typing `text` and pressing send — also appends to the conversation log, so a scripted call and a manual one look identical. */
    invoke(text) {
        this.appendMessage({ role: 'user', text });
        const result = this.submitHandler?.(text) ?? { success: false, message: 'Photon AI is not ready yet.' };
        this.appendMessage({ role: 'assistant', text: result.message, success: result.success });
        return result;
    }
    open() {
        if (this.isOpen || !this.panelEl || !this.launcherEl)
            return;
        this.isOpen = true;
        this.launcherEl.classList.add('pg-ai-launcher--hidden');
        this.panelEl.classList.add('pg-ai-panel--open');
        if (this.messages.length === 0)
            this.appendGreeting();
        requestAnimationFrame(() => this.inputEl?.focus());
    }
    close() {
        if (!this.isOpen || !this.panelEl || !this.launcherEl)
            return;
        this.isOpen = false;
        this.panelEl.classList.remove('pg-ai-panel--open');
        this.launcherEl.classList.remove('pg-ai-launcher--hidden');
    }
    destroy() {
        this.launcherEl?.remove();
        this.panelEl?.remove();
        this.launcherEl = null;
        this.panelEl = null;
        this.logEl = null;
        this.inputEl = null;
        this.sendBtnEl = null;
        this.submitHandler = null;
        this.messages = [];
    }
    // ─── Private: construction ─────────────────────────────────────────────
    buildLauncher() {
        const btn = createElement('button', { type: 'button', 'aria-label': 'Open Photon AI' });
        btn.className = 'pg-ai-launcher';
        btn.appendChild(this.iconRenderer.render('sparkle', { size: 20 }));
        btn.addEventListener('click', () => this.open());
        return btn;
    }
    buildPanel(config) {
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
    buildHeader() {
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
    buildInputArea(config) {
        const wrap = createDiv('pg-ai-panel__input-wrap');
        const input = createElement('textarea', {
            placeholder: config.placeholder ?? 'Ask Photon AI to do something...',
            rows: 1,
        });
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
    autoGrow(input) {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, INPUT_MAX_HEIGHT_PX)}px`;
    }
    trySubmit() {
        const input = this.inputEl;
        const sendBtn = this.sendBtnEl;
        if (!input || !sendBtn)
            return;
        const text = input.value.trim();
        if (!text || sendBtn.disabled)
            return;
        this.invoke(text);
        input.value = '';
        sendBtn.disabled = true;
        this.autoGrow(input);
    }
    appendGreeting() {
        this.appendMessage({
            role: 'assistant',
            text: 'Hi! Tell me what to do — sort, filter, pin, group, hide/show columns, move columns, selection, and more — or ask me a question about the grid\'s current state (try "help" to see everything I understand).',
            success: true,
        });
    }
    appendMessage(message) {
        this.messages.push(message);
        if (!this.logEl)
            return;
        const bubble = createDiv(`pg-ai-panel__message pg-ai-panel__message--${message.role}`);
        if (message.role === 'assistant') {
            bubble.classList.toggle('pg-ai-panel__message--error', message.success === false);
        }
        // Multi-line responses (e.g. "help"'s bulleted list) render as separate lines.
        for (const line of message.text.split('\n')) {
            const lineEl = document.createElement('div');
            lineEl.textContent = line;
            bubble.appendChild(lineEl);
        }
        this.logEl.appendChild(bubble);
        this.logEl.scrollTop = this.logEl.scrollHeight;
    }
}
//# sourceMappingURL=photon-ai-panel.js.map