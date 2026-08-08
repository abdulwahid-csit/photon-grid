import type { LongTextRendererOptions } from '../../types/built-in-renderer.types';
import { createDiv } from '../dom-utils';
import { portalHostFor } from '../../theme/overlay-portal';
import { placeOverlay } from '../overlay-position';

/**
 * The panel a long-text cell's expand control opens.
 *
 * ### Why a module singleton
 * At most one panel is open at a time — opening a second implicitly closes the
 * first — so one is created lazily, reused, and kept out of the DOM until
 * something asks for it. A panel per cell would mean thousands of detached
 * subtrees in a scrolled grid. `avatar-group-overlay.ts` and `SparklineTooltip`
 * use the same shape for the same reason.
 *
 * ### Why `position: fixed`
 * The panel lives on `document.body`, not inside the cell. A panel positioned
 * within the grid would be clipped by the scroll container it sits in, and
 * would scroll away from its own trigger.
 *
 * @packageDocumentation
 */

export interface LongTextOverlayRequest {
  /** The expand button. Toggles the panel and receives focus back on close. */
  readonly trigger: HTMLElement;
  /**
   * Element the panel sizes and aligns itself against. Defaults to
   * {@link trigger}.
   *
   * The cell, in practice — a panel aligned to the 16px button would sit in the
   * middle of a wide column with no visible relationship to the text it came
   * from.
   */
  readonly anchor?: HTMLElement;
  /** The untruncated text to show. */
  readonly text: string;
  readonly options: LongTextRendererOptions;
}

/**
 * Width bounds applied when the caller names no {@link
 * LongTextRendererOptions.overlayWidth}.
 *
 * The panel takes its cell's width by default so it reads as that cell opened
 * up. Clamped, because a 60px column would produce an unreadable ribbon and a
 * 900px one a panel wider than the eye tracks comfortably across.
 */
const MIN_WIDTH = 220;
const MAX_WIDTH = 480;

/** Rough per-line height used to place the panel before it has been measured. */
const ESTIMATED_LINE_HEIGHT = 19;
const ESTIMATED_CHARS_PER_LINE = 46;
const ESTIMATED_CHROME = 24;

let panelEl: HTMLElement | null = null;
let bodyEl: HTMLElement | null = null;
let titleEl: HTMLElement | null = null;
let activeTrigger: HTMLElement | null = null;
let activeAnchor: HTMLElement | null = null;
let activeWidth = MIN_WIDTH;
let activeLines = 1;

/**
 * Builds the panel once. Subsequent opens refill it.
 *
 * Left detached: `openLongTextOverlay` parents it into the triggering grid's
 * portal host on every open, so the singleton follows the user across grids.
 */
function ensurePanel(): HTMLElement {
  if (panelEl) return panelEl;

  const panel = createDiv('pg-long-text-overlay');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Full text');
  // Not focusable itself, but it must accept a programmatic focus so Escape has
  // somewhere sensible to return from.
  panel.tabIndex = -1;

  const title = createDiv('pg-long-text-overlay__title');
  const body = createDiv('pg-long-text-overlay__body');
  panel.appendChild(title);
  panel.appendChild(body);

  panelEl = panel;
  titleEl = title;
  bodyEl = body;
  return panel;
}

/** Resolves the panel width from the option, else the anchor, else the bounds. */
function resolveWidth(anchor: HTMLElement, options: LongTextRendererOptions): number {
  if (options.overlayWidth && options.overlayWidth > 0) return options.overlayWidth;
  const anchorWidth = anchor.getBoundingClientRect().width;
  return Math.min(Math.max(anchorWidth, MIN_WIDTH), MAX_WIDTH);
}

/**
 * Positions the panel against its anchor.
 *
 * Split from {@link openLongTextOverlay} because it also runs on resize: the
 * panel is anchored to a cell, and a cell moves when the window changes shape.
 *
 * The coordinates and the width are written as custom properties rather than
 * `top`/`left`/`width` declarations. All three are genuinely dynamic and cannot
 * live in a stylesheet, and routing them through variables keeps the panel's
 * own rule — including whether it is even positioned this way — in the theme's
 * hands.
 */
function position(panel: HTMLElement, anchor: HTMLElement, width: number, lines: number): void {
  const measured = panel.offsetHeight;
  const height = measured > 0 ? measured : lines * ESTIMATED_LINE_HEIGHT + ESTIMATED_CHROME;

  const placed = placeOverlay({
    anchor: anchor.getBoundingClientRect(),
    width,
    height,
    align: 'start',
  });

  panel.style.setProperty('--pg-overlay-x', `${placed.x}px`);
  panel.style.setProperty('--pg-overlay-y', `${placed.y}px`);
  panel.style.setProperty('--pg-overlay-width', `${width}px`);
  panel.style.setProperty('--pg-overlay-max-height', `${placed.maxHeight}px`);
  panel.classList.toggle('pg-long-text-overlay--above', placed.placement === 'above');
}

/** Opens the panel for one cell, replacing any panel already showing. */
export function openLongTextOverlay(request: LongTextOverlayRequest): void {
  const panel = ensurePanel();

  closeLongTextOverlay({ restoreFocus: false });

  const anchor = request.anchor ?? request.trigger;
  const width = resolveWidth(anchor, request.options);

  // Before anything is measured or painted. The panel is a module singleton
  // shared by every grid on the page, so each open re-parents it into the
  // triggering grid's portal host — otherwise it would resolve none of that
  // grid's tokens and render in light-mode fallbacks over a dark grid.
  portalHostFor(request.trigger).appendChild(panel);

  // `textContent`, never `innerHTML`: this is a cell value, and it arrives from
  // whatever the row data holds.
  bodyEl!.textContent = request.text;

  const title = request.options.overlayTitle;
  titleEl!.textContent = title ?? '';
  titleEl!.classList.toggle('pg-long-text-overlay__title--hidden', !title);
  panel.setAttribute('aria-label', title ?? 'Full text');

  activeTrigger = request.trigger;
  activeAnchor = anchor;
  activeWidth = width;
  // A cheap line estimate for the first placement pass only; the second pass
  // uses the real measured height.
  activeLines = Math.max(1, Math.ceil(request.text.length / ESTIMATED_CHARS_PER_LINE));
  request.trigger.setAttribute('aria-expanded', 'true');

  panel.classList.add('pg-long-text-overlay--open');
  // Two passes: the first mounts it so the browser can lay it out, the second
  // places it against a real measured height rather than an estimate.
  position(panel, anchor, width, activeLines);
  requestAnimationFrame(() => {
    if (activeTrigger === request.trigger) position(panel, anchor, width, activeLines);
  });

  attachDismissListeners();
  panel.focus();
}

/** Closes the panel, if one is open. */
export function closeLongTextOverlay(opts: { restoreFocus?: boolean } = {}): void {
  if (!panelEl || !activeTrigger) return;

  panelEl.classList.remove('pg-long-text-overlay--open');
  activeTrigger.setAttribute('aria-expanded', 'false');

  const trigger = activeTrigger;
  activeTrigger = null;
  activeAnchor = null;
  detachDismissListeners();

  // Only when the panel actually held focus — stealing it back after the user
  // has clicked elsewhere would yank them out of whatever they moved to.
  if (opts.restoreFocus !== false && panelEl.contains(document.activeElement)) {
    trigger.focus();
  }
}

/** `true` when this trigger's panel is the one currently showing. */
export function isLongTextOverlayOpenFor(trigger: HTMLElement): boolean {
  return activeTrigger === trigger;
}

/** Tears the panel out of the document entirely. */
export function destroyLongTextOverlay(): void {
  closeLongTextOverlay({ restoreFocus: false });
  panelEl?.remove();
  panelEl = null;
  bodyEl = null;
  titleEl = null;
}

// ─── Dismissal ───────────────────────────────────────────────────────────────

function onDocumentPointerDown(e: PointerEvent): void {
  const target = e.target;
  if (!(target instanceof Node)) return;
  // A click on the trigger is the toggle, handled by the grid's own delegate —
  // dismissing here too would close and immediately reopen.
  if (panelEl?.contains(target) || activeTrigger?.contains(target)) return;
  closeLongTextOverlay({ restoreFocus: false });
}

function onDocumentKeyDown(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.stopPropagation();
    closeLongTextOverlay();
  }
}

/**
 * Any scroll detaches the panel from its anchor, so the panel goes.
 *
 * Capture phase, because the grid's own scroll container does not bubble its
 * scroll events to the document. Closing rather than repositioning is
 * deliberate: a panel that chases a scrolling row is harder to read than one
 * that gets out of the way. The panel's own scrollbar is exempt — scrolling a
 * long value should not dismiss the thing showing it.
 */
function onScroll(e: Event): void {
  if (e.target instanceof Node && panelEl?.contains(e.target)) return;
  closeLongTextOverlay({ restoreFocus: false });
}

function onResize(): void {
  if (panelEl && activeAnchor) position(panelEl, activeAnchor, activeWidth, activeLines);
}

let listening = false;

function attachDismissListeners(): void {
  if (listening) return;
  listening = true;
  document.addEventListener('pointerdown', onDocumentPointerDown, true);
  document.addEventListener('keydown', onDocumentKeyDown, true);
  document.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', onResize);
}

function detachDismissListeners(): void {
  if (!listening) return;
  listening = false;
  document.removeEventListener('pointerdown', onDocumentPointerDown, true);
  document.removeEventListener('keydown', onDocumentKeyDown, true);
  document.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', onResize);
}
