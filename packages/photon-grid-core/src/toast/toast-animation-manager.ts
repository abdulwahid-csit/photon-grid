/**
 * The **Toast Animation Manager** — centralizes enter/exit transitions so the
 * component and container never hand-roll animation logic, and so
 * `prefers-reduced-motion` is honored in exactly one place.
 *
 * It is purely class-toggle + transition-end driven (no keyframe injection, no
 * layout thrash): the actual motion lives in themeable CSS
 * (`toast.css.ts`). Each method resolves once the transition ends, with a
 * safety timeout so a missed `transitionend` (e.g. a display-swapped element)
 * never leaves a dangling promise.
 *
 * @packageDocumentation
 */

import { ToastAnimation } from './toast.types';

/** Max time to wait for a `transitionend` before resolving anyway (ms). */
const TRANSITION_FALLBACK_MS = 400;

/** Drives themeable enter/exit transitions for toast elements. */
export class ToastAnimationManager {
  /**
   * @param animation            - The animation style class applied to elements.
   * @param respectReducedMotion - When `true`, animations are skipped if the OS
   *                               requests reduced motion.
   */
  constructor(
    private animation: ToastAnimation,
    private respectReducedMotion: boolean,
  ) {}

  /** Updates the active animation style. */
  setAnimation(animation: ToastAnimation): void {
    this.animation = animation;
  }

  /** Updates the reduced-motion policy. */
  setRespectReducedMotion(value: boolean): void {
    this.respectReducedMotion = value;
  }

  /** The base animation class an element carries for its whole lifetime. */
  animationClass(): string {
    return `pg-toast--anim-${this.animation}`;
  }

  /** @returns `true` when motion should be suppressed for accessibility. */
  private reducedMotion(): boolean {
    return (
      this.respectReducedMotion &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  /**
   * Plays the enter transition: the element starts in its `--enter` state and
   * transitions to its resting state on the next frame.
   *
   * @param el - The toast root element (already inserted into the DOM).
   * @returns Resolves when the enter transition completes.
   */
  enter(el: HTMLElement): Promise<void> {
    if (this.reducedMotion()) {
      el.classList.remove('pg-toast--enter');
      return Promise.resolve();
    }
    el.classList.add('pg-toast--enter');
    // Force a reflow so the browser registers the start state before we remove
    // the enter class, guaranteeing a transition rather than an instant jump.
    void el.offsetHeight;
    return this.nextFrame().then(() => {
      el.classList.add('pg-toast--enter-active');
      el.classList.remove('pg-toast--enter');
      return this.awaitTransition(el);
    });
  }

  /**
   * Plays the exit transition: the element transitions to its `--exit` state.
   *
   * @param el - The toast root element.
   * @returns Resolves when the exit transition completes (element ready to remove).
   */
  exit(el: HTMLElement): Promise<void> {
    if (this.reducedMotion()) return Promise.resolve();
    el.classList.remove('pg-toast--enter-active');
    el.classList.add('pg-toast--exit');
    return this.awaitTransition(el);
  }

  /** Resolves on the next animation frame (or immediately outside the DOM). */
  private nextFrame(): Promise<void> {
    if (typeof requestAnimationFrame !== 'function') return Promise.resolve();
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  /** Resolves on the element's next `transitionend`, or after a fallback timeout. */
  private awaitTransition(el: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      let done = false;
      const finish = (): void => {
        if (done) return;
        done = true;
        el.removeEventListener('transitionend', onEnd);
        resolve();
      };
      const onEnd = (e: TransitionEvent): void => {
        if (e.target === el) finish();
      };
      el.addEventListener('transitionend', onEnd);
      setTimeout(finish, TRANSITION_FALLBACK_MS);
    });
  }
}
