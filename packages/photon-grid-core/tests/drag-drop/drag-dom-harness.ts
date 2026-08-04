/**
 * Minimal DOM harness for the drag-drop suites.
 *
 * The drag primitives touch a deliberately small slice of the platform —
 * `getBoundingClientRect`, `classList`, custom properties, and a handful of
 * listener registrations — so a purpose-built fake is both faster and more
 * controllable than a full `jsdom` environment. In particular it lets a test
 * *count* `getBoundingClientRect` calls, which is exactly what the caching
 * behaviour under test is defined by.
 *
 * `requestAnimationFrame` is queued rather than timed: {@link runFrames} drains
 * it synchronously, so frame-coalescing assertions are deterministic.
 *
 * @packageDocumentation
 */

/** Rect returned by {@link FakeElement.getBoundingClientRect}. */
export interface FakeRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/** A recorded listener registration, so tests can assert on teardown. */
interface ListenerEntry {
  type: string;
  fn: (e: unknown) => void;
}

/** Stand-in for `HTMLElement`, covering only what the drag code uses. */
export class FakeElement {
  readonly tagName: string;
  readonly children: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly listeners: ListenerEntry[] = [];
  readonly styleProps = new Map<string, string>();
  readonly classes = new Set<string>();

  parent: FakeElement | null = null;
  isConnected = false;
  textContent = '';
  innerHTML = '';
  src = '';
  className = '';

  /** Number of `getBoundingClientRect` calls — the caching assertions read this. */
  rectReads = 0;
  /** Geometry this element reports. Tests set it directly. */
  rect: FakeRect = { top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0 };

  readonly style = {
    setProperty: (name: string, value: string): void => { this.styleProps.set(name, value); },
    removeProperty: (name: string): void => { this.styleProps.delete(name); },
    getPropertyValue: (name: string): string => this.styleProps.get(name) ?? '',
  };

  readonly classList = {
    add: (...names: string[]): void => { for (const n of names) this.classes.add(n); },
    remove: (...names: string[]): void => { for (const n of names) this.classes.delete(n); },
    contains: (name: string): boolean => this.classes.has(name),
    toggle: (name: string, force?: boolean): boolean => {
      const on = force ?? !this.classes.has(name);
      if (on) this.classes.add(name); else this.classes.delete(name);
      return on;
    },
  };

  constructor(tagName = 'div') {
    this.tagName = tagName;
  }

  /**
   * Assigns geometry, deriving `right` / `bottom` so callers only supply the
   * four primary values.
   */
  setRect(left: number, top: number, width: number, height: number): this {
    this.rect = { left, top, width, height, right: left + width, bottom: top + height };
    return this;
  }

  getBoundingClientRect(): FakeRect {
    this.rectReads++;
    return this.rect;
  }

  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string): void { this.attributes.delete(name); }

  appendChild(child: FakeElement): FakeElement {
    child.parent?.removeChild(child);
    this.children.push(child);
    child.parent = this;
    child.isConnected = true;
    return child;
  }

  /**
   * Inserts `child` before `ref`, moving it when it is already a child.
   *
   * A `null` `ref` appends, matching `Node.insertBefore`.
   */
  insertBefore(child: FakeElement, ref: FakeElement | null): FakeElement {
    if (child.parent === this) {
      const existing = this.children.indexOf(child);
      if (existing !== -1) this.children.splice(existing, 1);
    } else {
      child.parent?.removeChild(child);
    }
    const at = ref ? this.children.indexOf(ref) : -1;
    if (at === -1) this.children.push(child);
    else this.children.splice(at, 0, child);
    child.parent = this;
    child.isConnected = true;
    return child;
  }

  /** Live child list, mirroring `Node.childNodes`. */
  get childNodes(): FakeElement[] { return this.children; }

  /** First child, or `null`. */
  get firstChild(): FakeElement | null { return this.children[0] ?? null; }

  /** Next sibling within the parent, or `null`. */
  get nextSibling(): FakeElement | null {
    if (!this.parent) return null;
    const i = this.parent.children.indexOf(this);
    return i === -1 ? null : (this.parent.children[i + 1] ?? null);
  }

  removeChild(child: FakeElement): FakeElement {
    const i = this.children.indexOf(child);
    if (i !== -1) this.children.splice(i, 1);
    child.parent = null;
    child.isConnected = false;
    return child;
  }

  remove(): void {
    this.parent?.removeChild(this);
    this.isConnected = false;
  }

  addEventListener(type: string, fn: (e: unknown) => void): void {
    this.listeners.push({ type, fn });
  }

  removeEventListener(type: string, fn: (e: unknown) => void): void {
    const i = this.listeners.findIndex((l) => l.type === type && l.fn === fn);
    if (i !== -1) this.listeners.splice(i, 1);
  }

  /** Invokes every listener registered for `type`. */
  dispatch(type: string, event: unknown): void {
    for (const l of [...this.listeners]) if (l.type === type) l.fn(event);
  }

  /** Listener count for `type`, for leak assertions. */
  listenerCount(type: string): number {
    return this.listeners.filter((l) => l.type === type).length;
  }
}

/** Handles returned by {@link installDragDom}. */
export interface DragDomHarness {
  /** The fake `document.body`. */
  body: FakeElement;
  /** The fake `document.head`. */
  head: FakeElement;
  /** Fires every listener registered on `document` for `type`. */
  fireDocument(type: string, event: unknown): void;
  /** Fires every listener registered on `window` for `type`. */
  fireWindow(type: string, event: unknown): void;
  /** Live `document` listener count for `type` — used for leak assertions. */
  documentListenerCount(type: string): number;
  /** Drains every queued animation frame, synchronously. */
  runFrames(): void;
  /** Number of frames still queued. */
  pendingFrames(): number;
  /** Restores the previous globals. */
  restore(): void;
}

/**
 * Installs the fake `document`, `window`, and animation-frame queue.
 *
 * @returns Handles for driving and inspecting the fake environment.
 */
export function installDragDom(): DragDomHarness {
  const g = globalThis as Record<string, unknown>;
  const prev = {
    document: g['document'],
    window: g['window'],
    raf: g['requestAnimationFrame'],
    caf: g['cancelAnimationFrame'],
  };

  const body = new FakeElement('body');
  const head = new FakeElement('head');
  const docListeners: ListenerEntry[] = [];
  const winListeners: ListenerEntry[] = [];

  const frames = new Map<number, (ts: number) => void>();
  let nextHandle = 1;
  let now = 0;

  g['document'] = {
    body,
    head,
    createElement: (tag: string) => new FakeElement(tag),
    addEventListener: (type: string, fn: (e: unknown) => void) => { docListeners.push({ type, fn }); },
    removeEventListener: (type: string, fn: (e: unknown) => void) => {
      const i = docListeners.findIndex((l) => l.type === type && l.fn === fn);
      if (i !== -1) docListeners.splice(i, 1);
    },
  };

  g['window'] = {
    addEventListener: (type: string, fn: (e: unknown) => void) => { winListeners.push({ type, fn }); },
    removeEventListener: (type: string, fn: (e: unknown) => void) => {
      const i = winListeners.findIndex((l) => l.type === type && l.fn === fn);
      if (i !== -1) winListeners.splice(i, 1);
    },
    setTimeout: (fn: () => void) => setTimeout(fn, 0),
    clearTimeout: (h: number) => clearTimeout(h),
  };

  g['requestAnimationFrame'] = (fn: (ts: number) => void): number => {
    const handle = nextHandle++;
    frames.set(handle, fn);
    return handle;
  };
  g['cancelAnimationFrame'] = (handle: number): void => { frames.delete(handle); };

  return {
    body,
    head,
    fireDocument: (type, event) => {
      for (const l of [...docListeners]) if (l.type === type) l.fn(event);
    },
    fireWindow: (type, event) => {
      for (const l of [...winListeners]) if (l.type === type) l.fn(event);
    },
    documentListenerCount: (type) => docListeners.filter((l) => l.type === type).length,
    runFrames: () => {
      // Snapshot first: a callback that re-requests a frame must not be run
      // again in the same drain, or an rAF chain would loop forever.
      const due = [...frames.entries()];
      frames.clear();
      now += 16;
      for (const [, fn] of due) fn(now);
    },
    pendingFrames: () => frames.size,
    restore: () => {
      g['document'] = prev.document;
      g['window'] = prev.window;
      g['requestAnimationFrame'] = prev.raf;
      g['cancelAnimationFrame'] = prev.caf;
    },
  };
}

/**
 * Builds a fake pointer event.
 *
 * @param x       - `clientX`.
 * @param y       - `clientY`.
 * @param overrides - Additional fields (e.g. `button`, `pointerId`).
 */
export function pointerEvent(x: number, y: number, overrides: Record<string, unknown> = {}): unknown {
  return {
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    pointerType: 'mouse',
    preventDefault: () => {},
    stopPropagation: () => {},
    ...overrides,
  };
}

/**
 * Presents fakes as `HTMLElement`s for APIs typed against the real DOM.
 *
 * {@link FakeElement} implements the whole slice of `HTMLElement` the drag code
 * uses, but not the hundreds of members it does not — so the cast is asserted
 * here, once, rather than scattered through every call site.
 *
 * @param els - Fakes to pass to production code.
 */
export function asElements(els: readonly FakeElement[]): HTMLElement[] {
  return els as unknown as HTMLElement[];
}

/** Single-element form of {@link asElements}. */
export function asElement(el: FakeElement): HTMLElement {
  return el as unknown as HTMLElement;
}
