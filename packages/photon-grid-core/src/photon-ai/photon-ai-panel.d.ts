import type { IconRenderer } from '../icons/icon-renderer';
import type { PhotonAIConfig } from '../types/photon-ai.types';
import type { PhotonCommandResult } from './photon-ai.types';
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
export declare class PhotonAIPanel {
    private iconRenderer;
    private launcherEl;
    private panelEl;
    private logEl;
    private inputEl;
    private sendBtnEl;
    private submitHandler;
    private isOpen;
    private messages;
    constructor(iconRenderer: IconRenderer);
    /** Mounts the launcher + docked side panel into the grid body. Idempotent-safe: call once per grid instance. */
    mount(bodyWrapEl: HTMLElement, config: PhotonAIConfig): void;
    /** Wires the callback that turns typed text into a result — set once `GridApi`/`PhotonAIService` exist (after `GridCore` construction). */
    setSubmitHandler(fn: (text: string) => PhotonCommandResult): void;
    /** Programmatic equivalent of typing `text` and pressing send — also appends to the conversation log, so a scripted call and a manual one look identical. */
    invoke(text: string): PhotonCommandResult;
    open(): void;
    close(): void;
    destroy(): void;
    private buildLauncher;
    private buildPanel;
    private buildHeader;
    private buildInputArea;
    private autoGrow;
    private trySubmit;
    private appendGreeting;
    private appendMessage;
}
//# sourceMappingURL=photon-ai-panel.d.ts.map