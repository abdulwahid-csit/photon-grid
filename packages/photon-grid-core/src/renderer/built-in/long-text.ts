import type {
  BuiltInRenderContext,
  BuiltInRendererDefinition,
  LongTextRendererOptions,
} from '../../types/built-in-renderer.types';
import { icons, isEmptyValue, renderIfEmpty, valueSpan } from './shared';

/**
 * A truncated cell that can open its full value in a panel.
 *
 * The column holding a ticket body, a shipping note or an audit comment: too
 * long for any sensible column width, but the whole of it still has to be
 * reachable without widening the column or opening an editor.
 *
 * ### The cell always holds the complete string
 * Truncation here is purely visual — an ellipsis or a line clamp, both CSS. The
 * text node carries the untruncated value, which is what lets the panel read
 * what to show straight out of the DOM instead of re-resolving the row and
 * re-running the column's `valueFormatter`. One source of truth, and no way for
 * the panel to disagree with the cell it came from.
 *
 * ### The toggle carries no listener
 * `GridCore` delegates one `pointerdown` handler on the grid root, the same way
 * the `button` renderer and the avatar group's counter are wired. A viewport of
 * a thousand long-text cells costs one listener rather than a thousand.
 *
 * `pointerdown` rather than `click` because a click requires press and release
 * on the same element, and a cell can be re-rendered, re-positioned or recycled
 * between the two — see the handler for the full reasoning.
 *
 * @packageDocumentation
 */

/** Marks the toggle so the grid's delegated click handler can find it. */
export const LONG_TEXT_TOGGLE_ATTR = 'data-long-text';

/** Class on the element carrying the untruncated text. The panel reads from it. */
export const LONG_TEXT_TEXT_CLASS = 'pg-long-text__text';

/** Class on the renderer's root, so the handler can scope its lookup to one cell. */
export const LONG_TEXT_VALUE_CLASS = 'pg-cell__value--long-text';

const DEFAULT_ICON = 'expandText';
const DEFAULT_ICON_SIZE = 12;
const DEFAULT_TOGGLE_LABEL = 'Show full text';

/**
 * Whether this value earns an expand affordance.
 *
 * A character count rather than a measured overflow test, deliberately: knowing
 * whether the text is really cut off means reading the laid-out box, and a
 * forced reflow per cell per render is not a cost a virtualised grid can pay.
 * See {@link LongTextRendererOptions.minLength}.
 */
function needsToggle(text: string, options: LongTextRendererOptions): boolean {
  if (options.expandable === false) return false;
  return text.length >= (options.minLength ?? 0);
}

/** Builds the expand control. A real `<button>` — it is an interactive control. */
function buildToggle(
  ctx: BuiltInRenderContext<LongTextRendererOptions>,
  options: LongTextRendererOptions,
): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `pg-long-text__toggle pg-long-text__toggle--${options.toggle ?? 'hover'}`;
  button.setAttribute(LONG_TEXT_TOGGLE_ATTR, options.action ?? '');
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-label', options.toggleLabel ?? DEFAULT_TOGGLE_LABEL);
  // The grid owns focus through its roving cell model; a button per row would
  // otherwise put a tab stop in every visible row.
  button.tabIndex = -1;

  const iconRenderer = icons(ctx);
  if (iconRenderer) {
    button.appendChild(
      iconRenderer.render(options.icon ?? DEFAULT_ICON, {
        size: options.iconSize ?? DEFAULT_ICON_SIZE,
      }),
    );
  }
  return button;
}

/**
 * Long text, truncated in the cell and expandable into a panel.
 *
 * Not `textOnly`: the cell holds a button beside its text, and the Virtual
 * DOM's text patch writes `textContent`, which would destroy it. {@link patch}
 * covers the common update instead — see its note for the one case it refuses.
 */
export const longTextRenderer: BuiltInRendererDefinition<LongTextRendererOptions> = {
  name: 'longText',
  textOnly: false,
  render(ctx) {
    if (renderIfEmpty(ctx)) return;

    const { options } = ctx;
    // The formatted value, not the raw one, so a column `valueFormatter` decides
    // what gets shown — and therefore what the panel shows too.
    const text = ctx.formattedValue;

    const span = valueSpan('long-text', options.cssClass);

    const body = document.createElement('span');
    body.className = LONG_TEXT_TEXT_CLASS;
    body.textContent = text;
    if (options.tooltip) body.title = text;

    const maxLines = options.maxLines ?? 1;
    if (maxLines > 1) {
      // A custom property rather than a rule per column: the renderer sets one
      // value and the stylesheet owns the clamp.
      body.style.setProperty('--pg-cell-max-lines', String(maxLines));
      body.classList.add('pg-long-text__text--clamped');
    }
    span.appendChild(body);

    if (needsToggle(text, options)) {
      // Reserve the toggle's corner up front, even while it is hidden. Padding
      // the text only on hover would re-run the ellipsis and make the value
      // twitch under the cursor; reserving it always costs a fixed gutter and
      // never moves.
      body.classList.add('pg-long-text__text--inset');
      span.appendChild(buildToggle(ctx, options));
    }

    ctx.inner.appendChild(span);
  },

  /**
   * Rewrites the text in place, keeping the button and its ARIA state.
   *
   * Refuses — returning `false` for a full rebuild — when the new value would
   * change the cell's *shape*: an empty value has no text element at all, and a
   * value crossing the `minLength` threshold gains or loses the toggle. Patching
   * those in place would mean reproducing `render` here, and a half-updated cell
   * is worse than a rebuilt one.
   */
  patch(cellEl, ctx) {
    const root = cellEl.querySelector<HTMLElement>(`.${LONG_TEXT_VALUE_CLASS}`);
    const body = root?.querySelector<HTMLElement>(`.${LONG_TEXT_TEXT_CLASS}`);
    if (!root || !body) return false;

    const text = ctx.formattedValue;
    const hasToggle = root.querySelector(`[${LONG_TEXT_TOGGLE_ATTR}]`) !== null;
    if (isEmptyValue(ctx.value) || needsToggle(text, ctx.options) !== hasToggle) return false;

    body.textContent = text;
    if (ctx.options.tooltip) body.title = text;
    return true;
  },
};
