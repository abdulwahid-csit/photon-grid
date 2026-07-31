/**
 * Themed confirmation dialog.
 *
 * A deliberately small primitive: one question, two answers, resolved as a
 * promise. It exists so a declarative `confirm` on a menu item needs no host
 * wiring at all — applications that already own a modal system replace it
 * wholesale through `RowMenuConfig.confirmHandler` rather than restyling this.
 *
 * Everything visual comes from theme tokens, so the dialog inherits the grid's
 * mode and variant without configuration.
 *
 * @packageDocumentation
 */

import { createDiv } from './dom-utils';

/** Text and tone of a single confirmation. */
export interface ConfirmDialogOptions {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  /** Styles the confirming button as destructive. */
  readonly danger?: boolean;
}

/**
 * Opens a modal confirmation and resolves with the user's answer.
 *
 * Resolves `false` for every dismissal route — Cancel, Escape, or a click on
 * the backdrop — so a caller only has to handle the affirmative case.
 *
 * Focus moves to the confirming button on open and is restored to the
 * previously focused element on close, so a keyboard user is never dropped at
 * the top of the document.
 *
 * @param options - Text and tone of the question.
 * @returns `true` when confirmed, `false` when dismissed.
 */
export function openConfirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const backdrop = createDiv('pg-confirm-backdrop');
    const dialog = createDiv('pg-confirm');
    dialog.setAttribute('role', 'alertdialog');
    dialog.setAttribute('aria-modal', 'true');

    const titleEl = createDiv('pg-confirm__title');
    titleEl.id = `pg-confirm-title-${++dialogSeq}`;
    titleEl.textContent = options.title;
    dialog.setAttribute('aria-labelledby', titleEl.id);

    const messageEl = createDiv('pg-confirm__message');
    messageEl.id = `pg-confirm-msg-${dialogSeq}`;
    messageEl.textContent = options.message;
    dialog.setAttribute('aria-describedby', messageEl.id);

    const actions = createDiv('pg-confirm__actions');
    const cancelBtn = makeButton(options.cancelLabel, 'pg-confirm__btn pg-confirm__btn--cancel');
    const confirmBtn = makeButton(
      options.confirmLabel,
      `pg-confirm__btn pg-confirm__btn--confirm${options.danger ? ' pg-confirm__btn--danger' : ''}`,
    );
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    dialog.appendChild(titleEl);
    dialog.appendChild(messageEl);
    dialog.appendChild(actions);
    backdrop.appendChild(dialog);

    let settled = false;
    const close = (answer: boolean): void => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKeydown, true);
      backdrop.remove();
      previouslyFocused?.focus?.();
      resolve(answer);
    };

    /**
     * Escape dismisses; Tab is cycled between the two buttons so focus cannot
     * escape the dialog while it is open. Captured, so the grid's own keyboard
     * handlers never see these keys.
     */
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); return; }
      if (e.key !== 'Tab') return;
      e.preventDefault();
      (document.activeElement === confirmBtn ? cancelBtn : confirmBtn).focus();
    };

    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    // Only a click on the backdrop itself dismisses — not one that bubbled up
    // from inside the dialog.
    backdrop.addEventListener('pointerdown', (e) => {
      if (e.target === backdrop) close(false);
    });
    document.addEventListener('keydown', onKeydown, true);

    document.body.appendChild(backdrop);
    confirmBtn.focus();
  });
}

/** Monotonic id source, so concurrent dialogs get unique ARIA targets. */
let dialogSeq = 0;

function makeButton(label: string, className: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = className;
  btn.textContent = label;
  return btn;
}
