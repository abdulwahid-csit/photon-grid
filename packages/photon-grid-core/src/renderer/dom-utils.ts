export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean> = {},
  cssText?: string,
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (typeof val === 'boolean') {
      if (val) el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(val));
    }
  }
  if (cssText) el.style.cssText = cssText;
  return el;
}

export function createDiv(
  className?: string,
  cssText?: string,
): HTMLDivElement {
  const el = document.createElement('div');
  if (className) el.className = className;
  if (cssText) el.style.cssText = cssText;
  return el;
}

export function setStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(el.style, styles);
}

export function clearChildren(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function replaceChildren(el: HTMLElement, ...children: Node[]): void {
  clearChildren(el);
  for (const child of children) el.appendChild(child);
}

/**
 * Brings `parent`'s children into exactly the order given, reusing the nodes
 * that are already there.
 *
 * The alternative — clearing `innerHTML` and re-appending — discards every
 * element and forces the browser to re-parse, re-style, and re-lay-out the whole
 * subtree even when the only change was one element moving one slot. During a
 * column drag that difference is the whole cost: a live cross-panel move rewrites
 * the column order under the pointer, and rebuilding every header cell for it is
 * what makes a wide grid stutter and visibly reshuffle. Reordering in place also
 * preserves each element's identity, so listeners, classes, focus, and in-flight
 * CSS transitions survive.
 *
 * Nodes present in `parent` but absent from `desired` are removed; nodes in
 * `desired` that are not yet children are inserted. Callers own element
 * creation and caching — this function never builds anything.
 *
 * Complexity: O(existing + desired). A single moved element costs one
 * `insertBefore`; an unchanged list costs zero DOM mutations.
 *
 * @param parent  - Element whose children are being reconciled.
 * @param desired - The exact children `parent` should end up with, in order.
 *                  Must not contain duplicates.
 */
export function reconcileChildren(parent: HTMLElement, desired: readonly Node[]): void {
  const wanted = new Set<Node>(desired);

  // Drop anything no longer wanted first, so the ordering walk below only ever
  // sees nodes that belong in the result.
  for (const child of Array.from(parent.childNodes)) {
    if (!wanted.has(child)) parent.removeChild(child);
  }

  // Walk the desired order against the live child list. `ref` tracks the node
  // expected at the current slot; when it already matches, nothing is written.
  let ref: ChildNode | null = parent.firstChild;
  for (const node of desired) {
    if (ref === node) {
      ref = node.nextSibling;
      continue;
    }
    // insertBefore moves the node when it is already a child of `parent`, so
    // this single call covers both the insert and the reorder case. `ref` stays
    // valid because it is never the node being moved.
    parent.insertBefore(node, ref);
  }
}

export function addClasses(el: HTMLElement, ...classes: string[]): void {
  for (const cls of classes) {
    if (cls) el.classList.add(cls);
  }
}

export function removeClasses(el: HTMLElement, ...classes: string[]): void {
  for (const cls of classes) {
    if (cls) el.classList.remove(cls);
  }
}

export function toggleClass(el: HTMLElement, cls: string, condition: boolean): void {
  if (condition) {
    el.classList.add(cls);
  } else {
    el.classList.remove(cls);
  }
}

export function getScrollbarWidth(): number {
  const outer = document.createElement('div');
  outer.style.cssText = 'visibility:hidden;overflow:scroll;position:absolute;top:-9999px;';
  document.body.appendChild(outer);
  const inner = document.createElement('div');
  outer.appendChild(inner);
  const width = outer.offsetWidth - inner.offsetWidth;
  document.body.removeChild(outer);
  return width;
}

export function measureTextWidth(text: string, font: string): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return ctx.measureText(text).width;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getElementOffset(el: HTMLElement): { top: number; left: number } {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
  };
}

export function isScrolledIntoView(el: HTMLElement, container: HTMLElement): boolean {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;
}

export function scrollIntoViewIfNeeded(el: HTMLElement, container: HTMLElement): void {
  const elRect = el.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  if (elRect.top < containerRect.top) {
    container.scrollTop -= containerRect.top - elRect.top;
  } else if (elRect.bottom > containerRect.bottom) {
    container.scrollTop += elRect.bottom - containerRect.bottom;
  }
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => void>(
  fn: T,
  interval: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args) => {
    const now = performance.now();
    if (now - lastCall >= interval) {
      lastCall = now;
      fn(...args);
    }
  };
}

export function raf(fn: () => void): () => void {
  let id = requestAnimationFrame(fn);
  return () => cancelAnimationFrame(id);
}

export function rafLoop(fn: (dt: number) => void): () => void {
  let last = 0;
  let id: number;
  const tick = (ts: number) => {
    fn(ts - last);
    last = ts;
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(id);
}
