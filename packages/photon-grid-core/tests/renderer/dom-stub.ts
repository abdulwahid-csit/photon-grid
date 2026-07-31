/**
 * Minimal DOM implementation for renderer tests.
 *
 * `jsdom` is deliberately not a dependency of this package — the suite runs in
 * the fast `node` environment (see vitest.config.ts), and `row-animator.test.ts`
 * already establishes the pattern of stubbing exactly the surface under test.
 *
 * This stub covers the slice the cell renderer and the viewport Virtual DOM
 * actually use: element creation, attributes, class lists, child manipulation,
 * `textContent`/`title`, and simple `.class[attr]` selector matching. Anything
 * outside that surface is intentionally absent, so a test that drifts into
 * untested DOM behaviour fails loudly instead of silently passing against a
 * permissive fake.
 *
 * It also counts element creations, which is what the benchmark uses to prove
 * that patching touches no new nodes where a rebuild would allocate hundreds.
 */

/** Cumulative count of elements created since the last {@link resetDomCounters}. */
export let elementsCreated = 0;
/** Cumulative count of `textContent` writes since the last reset. */
export let textWrites = 0;

/** Zeroes the instrumentation counters. */
export function resetDomCounters(): void {
  elementsCreated = 0;
  textWrites = 0;
}

class StubClassList {
  private readonly set = new Set<string>();
  constructor(private readonly owner: StubElement) {}

  add(...names: string[]): void {
    for (const n of names) if (n) this.set.add(n);
    this.sync();
  }

  remove(...names: string[]): void {
    for (const n of names) this.set.delete(n);
    this.sync();
  }

  contains(name: string): boolean {
    return this.set.has(name);
  }

  /** Replaces the whole list — used when `className` is assigned directly. */
  reset(value: string): void {
    this.set.clear();
    for (const n of value.split(/\s+/)) if (n) this.set.add(n);
  }

  values(): ReadonlySet<string> {
    return this.set;
  }

  private sync(): void {
    this.owner.setClassNameSilently([...this.set].join(' '));
  }
}

export class StubElement {
  readonly tagName: string;
  /** Element node type, matching the DOM constant `Node.ELEMENT_NODE`. */
  readonly nodeType = 1;
  readonly children: StubElement[] = [];
  readonly classList: StubClassList;
  readonly attributes = new Map<string, string>();
  readonly style: Record<string, string> = {};
  parent: StubElement | null = null;

  /** Listeners registered through {@link addEventListener}, by event type. */
  private readonly listeners = new Map<string, Array<(e: unknown) => void>>();

  private _className = '';
  private _textContent = '';
  title = '';
  src = '';
  alt = '';
  type = '';
  disabled = false;

  /**
   * Natural content height, in px. Settable by tests so measurement-driven
   * code (detail auto-height) has something deterministic to read — the real
   * value comes from layout, which no stub can compute.
   */
  scrollHeight = 0;

  /** Rendered box height, in px. Companion to {@link scrollHeight}; see the note there. */
  offsetHeight = 0;

  constructor(tagName: string) {
    this.tagName = tagName;
    this.classList = new StubClassList(this);
    elementsCreated++;
  }

  get className(): string {
    return this._className;
  }

  set className(value: string) {
    this._className = value;
    this.classList.reset(value);
  }

  /** Assigns `className` without re-entering `classList.reset`. */
  setClassNameSilently(value: string): void {
    this._className = value;
  }

  get textContent(): string {
    if (this.children.length === 0) return this._textContent;
    return this.children.map((c) => c.textContent).join('');
  }

  set textContent(value: string) {
    textWrites++;
    this.children.length = 0;
    this._textContent = value;
  }

  /** Setting markup drops children; the stub does not parse HTML. */
  set innerHTML(value: string) {
    this.children.length = 0;
    this._textContent = value;
  }

  get firstChild(): StubElement | null {
    return this.children[0] ?? null;
  }

  get firstElementChild(): StubElement | null {
    return this.children[0] ?? null;
  }

  appendChild(child: StubElement): StubElement {
    child.parent?.removeChild(child);
    child.parent = this;
    this.children.push(child);
    return child;
  }

  removeChild(child: StubElement): StubElement {
    const i = this.children.indexOf(child);
    if (i !== -1) this.children.splice(i, 1);
    child.parent = null;
    return child;
  }

  /** Detaches this element from its parent, if it has one. */
  remove(): void {
    this.parent?.removeChild(this);
  }

  /** Only `height` is meaningful — it mirrors {@link offsetHeight}, which tests set directly. */
  getBoundingClientRect(): { top: number; left: number; width: number; height: number } {
    return { top: 0, left: 0, width: 0, height: this.offsetHeight };
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  matches(selector: string): boolean {
    return matchesSelector(this, selector);
  }

  /** Nearest self-or-ancestor matching `selector`, or `null`. */
  closest(selector: string): StubElement | null {
    let node: StubElement | null = this;
    while (node) {
      if (matchesSelector(node, selector)) return node;
      node = node.parent;
    }
    return null;
  }

  addEventListener(type: string, fn: (e: unknown) => void): void {
    const list = this.listeners.get(type);
    if (list) list.push(fn);
    else this.listeners.set(type, [fn]);
  }

  removeEventListener(type: string, fn: (e: unknown) => void): void {
    const list = this.listeners.get(type);
    if (!list) return;
    const i = list.indexOf(fn);
    if (i !== -1) list.splice(i, 1);
  }

  /**
   * Invokes this element's listeners for `type`.
   *
   * Deliberately does **not** bubble: the code under test reads `event.target`
   * and calls `closest()` itself, so a test that wants to simulate a bubbled
   * click passes the real target explicitly. Emulating propagation here would
   * hide exactly the logic being verified.
   */
  dispatch(type: string, event: unknown): void {
    for (const fn of this.listeners.get(type) ?? []) fn(event);
  }

  querySelector(selector: string): StubElement | null {
    for (const el of this.walk()) {
      if (matchesSelector(el, selector)) return el;
    }
    return null;
  }

  querySelectorAll(selector: string): StubElement[] {
    const out: StubElement[] = [];
    for (const el of this.walk()) {
      if (matchesSelector(el, selector)) out.push(el);
    }
    return out;
  }

  /** Depth-first descendant iteration, excluding this element. */
  private *walk(): Generator<StubElement> {
    for (const child of this.children) {
      yield child;
      yield* child.walk();
    }
  }
}

/**
 * Matches a selector of the form `tag`, `.class`, `[attr]` or any concatenation
 * of those — the only shapes the code under test uses.
 */
function matchesSelector(el: StubElement, selector: string): boolean {
  const parts = selector.match(/(\.[\w-]+|\[[\w-]+\]|^[a-z]+)/g);
  if (!parts) return false;
  for (const part of parts) {
    if (part.startsWith('.')) {
      if (!el.classList.contains(part.slice(1))) return false;
    } else if (part.startsWith('[')) {
      if (!el.attributes.has(part.slice(1, -1))) return false;
    } else if (el.tagName !== part) {
      return false;
    }
  }
  return true;
}

/**
 * Installs the stub as the global `document`, plus a synchronous
 * `requestAnimationFrame` so scheduler behaviour is deterministic in tests.
 *
 * @returns A teardown function restoring the previous globals.
 */
export function installDomStub(): () => void {
  const g = globalThis as Record<string, unknown>;
  const prevDocument = g['document'];
  const prevRaf = g['requestAnimationFrame'];
  const prevCaf = g['cancelAnimationFrame'];

  const frames = new Map<number, () => void>();
  let nextHandle = 1;

  g['document'] = { createElement: (tag: string) => new StubElement(tag) };
  g['requestAnimationFrame'] = (fn: () => void): number => {
    const handle = nextHandle++;
    frames.set(handle, fn);
    return handle;
  };
  g['cancelAnimationFrame'] = (handle: number): void => { frames.delete(handle); };
  g['__pgRunFrames'] = (): void => {
    const due = [...frames.values()];
    frames.clear();
    for (const fn of due) fn();
  };

  return () => {
    g['document'] = prevDocument;
    g['requestAnimationFrame'] = prevRaf;
    g['cancelAnimationFrame'] = prevCaf;
    delete g['__pgRunFrames'];
  };
}

/** Runs every animation-frame callback queued through the stub. */
export function runFrames(): void {
  (globalThis as unknown as { __pgRunFrames: () => void }).__pgRunFrames();
}
