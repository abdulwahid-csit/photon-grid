import type { IconRenderer } from './icon-renderer';

/**
 * Body-level roots that can hold rendered icons.
 *
 * Overlays are portaled to `document.body`, i.e. outside the grid container, so
 * a sweep rooted at the container alone would miss them. Transient drag ghosts
 * are deliberately absent: a theme switch mid-drag is not a real scenario, and
 * they are destroyed on drop.
 */
const PORTAL_SELECTORS = [
  '.pg-toast-layer',
  '.pg-context-menu',
  '.pg-col-chooser__overlay',
  '.pg-dropdown-editor__panel',
] as const;

/**
 * Collects the roots a repaint has to sweep: the grid itself plus any portaled
 * overlay currently in the document.
 */
export function iconRepaintRoots(containerEl: HTMLElement): ParentNode[] {
  const doc = containerEl.ownerDocument ?? document;
  return [containerEl, ...doc.body.querySelectorAll(PORTAL_SELECTORS.join(','))];
}

/** Recovers the size an icon node was rendered at, falling back to 16. */
function resolveSize(el: Element): number {
  const stamped = Number(el.getAttribute('data-icon-size'));
  if (stamped > 0) return stamped;

  const svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
  const width = Number(svg?.getAttribute('width'));
  return width > 0 ? width : 16;
}

/**
 * Re-renders every registry-drawn icon under `roots` from the renderer's current
 * registry state. Returns how many were repainted.
 *
 * This is what makes a theme's icon pack swappable at runtime. Icons are drawn
 * once when their DOM node is built and are not rebuilt by `GridApi.refresh()`
 * — the header, footer, toolbar, launchers and toast layer are all long-lived —
 * so without this sweep a pack change would only reach rows that happened to be
 * re-rendered.
 *
 * **Host-supplied icons are left alone, by construction.** `data-icon` is only
 * ever written by {@link IconRenderer}, so raw markup or elements a host passed
 * through `RowMenuIcon`, a dropdown option or a custom header renderer carry no
 * marker and are invisible here. No allowlist is needed.
 *
 * Two node shapes exist and are handled differently:
 * - a marked `<svg>` — produced by `renderToString`; the node *is* the glyph, so
 *   it is replaced outright.
 * - a marked container — produced by `render()`/`updateIcon()`; its contents are
 *   refilled in place, preserving the wrapper's classes and inline sizing.
 */
export function repaintIcons(renderer: IconRenderer, roots: Iterable<ParentNode>): number {
  const targets = new Set<Element>();
  for (const root of roots) {
    for (const el of root.querySelectorAll('[data-icon]')) targets.add(el);
  }

  let repainted = 0;

  for (const el of targets) {
    // Replacing a container blows away its subtree, so a node collected earlier
    // in the sweep may already be detached by the time we reach it.
    if (!el.isConnected) continue;

    const name = el.getAttribute('data-icon');
    if (!name) continue;

    const size = resolveSize(el);

    if (el.tagName.toLowerCase() === 'svg') {
      const markup = renderer.renderToString(name, size);
      if (!markup || !el.parentNode) continue;

      // Parsed through a <template> so the SVG lands as real foreign content;
      // `outerHTML` would throw on a node that is no longer in the tree.
      const tpl = (el.ownerDocument ?? document).createElement('template');
      tpl.innerHTML = markup;
      const next = tpl.content.firstElementChild;
      if (!next) continue;

      el.replaceWith(next);
      repainted++;
    } else {
      renderer.updateIcon(el as HTMLElement, name, { size });
      repainted++;
    }
  }

  return repainted;
}
