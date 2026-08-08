import type { RenderWindow } from '../../plugin.types';
import type { RowNode } from '../../../types/row.types';
import { createDiv } from '../../../renderer/dom-utils';
import {
  computeBarLayout,
  createBarLayoutScratch,
  type BarLayoutOptions,
  type BarLayoutScratch,
  type BarPlacement,
} from '../layout/bar-layout';
import { visibleTimeRange } from '../time/slot-axis';
import type { TimeUnit } from '../time/calendar';
import type { SchedulerEvent } from '../data/scheduler.types';
import type {
  SchedulerEventComponent,
  SchedulerEventComponentConstructor,
  SchedulerEventRenderParams,
  SchedulerEventRenderer,
  SchedulerEventTypeConfig,
} from '../scheduler.config';
import type { SchedulerModule, SchedulerRuntime } from '../scheduler-runtime';

/** Root class of one event bar. Fixed by `scheduler-styles.ts`. */
const BAR_CLASS = 'pg-scheduler-bar';

/**
 * Ceiling on retired bars kept for reuse.
 *
 * Matches the layout engine's default `maxBars`, which is the largest number of
 * bars a single frame can produce -- so a full-density frame followed by an empty
 * one never discards a node it is about to need again, and a pathological churn
 * pattern still cannot grow the pool without bound.
 */
const MAX_POOLED_BARS = 800;

/** Icon edge length inside a bar, in pixels. Sized against the bar font, not the row. */
const ICON_SIZE = 12;

/** Type applied to events that declare none. Mirrors the `task` entry in `DEFAULT_EVENT_TYPES`. */
const DEFAULT_EVENT_TYPE = 'task';

/**
 * Horizontal inset of the overflow pill from the right edge of the viewport.
 *
 * A guess rather than a measurement, deliberately: resolving the pill's real
 * width means `getBoundingClientRect`, and this renderer forces layout nowhere.
 * The pill is right-ish rather than pixel-perfect, which is the correct trade for
 * an element that only appears on an already-degraded frame.
 */
const OVERFLOW_INSET_PX = 96;

/** Vertical offset of the overflow pill inside the layer. */
const OVERFLOW_TOP_PX = 2;

/** Bit flags describing which optional children a bar currently has mounted. */
const SKELETON_ICON = 1;
const SKELETON_BADGE = 2;
const SKELETON_HANDLES = 4;
/** Sentinel meaning "no skeleton has been mounted yet", distinct from every real signature. */
const SKELETON_NONE = -1;

/**
 * Everything the renderer remembers about one bar element between frames.
 *
 * This exists so the hot path can answer "has anything actually changed?"
 * without reading a single style, attribute or child back off the DOM. Reading
 * `el.style.width` is cheap, but reading it 600 times a frame is not, and some
 * reads (`offsetWidth`, `getComputedStyle`) would force layout outright. Caching
 * the last value we *wrote* is exact -- nothing else writes these elements -- and
 * costs one object per pooled node.
 *
 * Held in a `WeakMap` keyed by the element rather than on the element itself, so
 * the state is typed and never collides with host attributes, and so a node that
 * escapes the pool is collectable along with its state.
 */
interface BarState {
  /** Render pass that last claimed this bar. Drives the mark-and-sweep. */
  pass: number;

  /** Currently bound event id, or `''` when the bar is unbound (pooled). */
  eventId: string;
  /** Currently bound resource id, mirrored into `data-resource-id`. */
  resourceId: string;
  /** Last bound `SchedulerEvent.version`, or `-1` when unknown. */
  version: number;

  /** Last applied type name. Type configs are immutable, so this gates every type-derived style. */
  typeName: string;
  /** Host class contributed by the type, tracked so it can be removed when the type changes. */
  cssClass: string;
  /** Last icon name rendered into the icon slot, so identical icons are not re-parsed. */
  iconName: string;

  selected: boolean;
  locked: boolean;

  /** Last written geometry. `NaN` until first write, so the first comparison always differs. */
  left: number;
  top: number;
  width: number;
  height: number;

  /** Whether the element is currently in the layer. Cheaper and safer than `isConnected`. */
  attached: boolean;

  /** Bit set of mounted optional children, or {@link SKELETON_NONE}. */
  skeletonSig: number;
  /** `true` when a custom renderer owns the bar's children. */
  custom: boolean;
  /** Constructor of the mounted component, so a rebind to the same type refreshes rather than rebuilds. */
  componentCtor: SchedulerEventComponentConstructor | null;

  /** Structural children. Created lazily; retained across pooling so reuse allocates nothing. */
  label: HTMLElement;
  icon: HTMLElement | null;
  badge: HTMLElement | null;
  checkbox: HTMLInputElement | null;
  handleStart: HTMLElement | null;
  handleEnd: HTMLElement | null;
}

/** Shared empty result, so `getPlacements()` never returns a fresh array before the first frame. */
const NO_PLACEMENTS: readonly BarPlacement[] = [];

/**
 * Draws the event bars for one frame and keeps them in sync across frames.
 *
 * ## Why this class writes so little
 *
 * Positioning is pure `transform: translate()`, which the compositor handles
 * without invalidating layout -- so moving every bar on screen costs no reflow.
 * The remaining layout-affecting writes are `width` and `height`, and both are
 * diffed against the last value written. Combined with the layout engine's
 * rebasing contract (absolute x, row-origin-relative y) the steady state is
 * strict: **a pure horizontal or vertical scroll produces identical placements,
 * so this renderer writes nothing at all** -- no transform, no width, no class,
 * no attribute. That property is the acceptance criterion for the whole
 * rendering layer, and every cached field on {@link BarState} exists to hold it.
 *
 * ## Why mark-and-sweep rather than diffing arrays
 *
 * The set of visible bars changes shape on every axis: rows scroll in and out
 * vertically, events enter and leave horizontally, and lane counts change as
 * overlaps appear. Diffing two ordered lists would need a keyed LCS; stamping a
 * pass number on each surviving element and sweeping the leftovers is O(n) with
 * no allocation, and is the same technique the grid's own row renderer uses.
 *
 * The renderer owns no interaction: it exposes {@link getBarElement} and
 * {@link getPlacements} and lets the drag, resize and selection services do
 * their own hit-testing against the geometry it already computed, so a pointer
 * move never re-measures the DOM either.
 */
export class EventBarRenderer implements SchedulerModule {
  /** Bars currently mounted, keyed by {@link BarPlacement.key} (resource + event). */
  private readonly live = new Map<string, HTMLElement>();
  /** Retired bars available for reuse, capped at {@link MAX_POOLED_BARS}. */
  private readonly pool: HTMLElement[] = [];
  /** Per-element diff state. See {@link BarState}. */
  private readonly states = new WeakMap<HTMLElement, BarState>();
  /** Mounted component instances, held in an iterable map so `destroy()` can reach every one. */
  private readonly components = new Map<HTMLElement, SchedulerEventComponent>();
  /** Event id to bar element, maintained incrementally so hit-testing is O(1). */
  private readonly byEventId = new Map<string, HTMLElement>();

  /** Memoized `{ ...eventDefaults, ...eventTypes[name] }` per type name. Configs are immutable. */
  private readonly typeCache = new Map<string, SchedulerEventTypeConfig>();

  /** Reused layout buffers, so a steady-state frame allocates nothing here. */
  private readonly scratch: BarLayoutScratch = createBarLayoutScratch();
  /** Reused handle buffer for the overflow count. */
  private readonly countScratch: number[] = [];
  /** Layout tuning, built once -- passing an object literal per frame would allocate 60 times a second. */
  private readonly layoutOptions: BarLayoutOptions;

  /** Cached config switches, read once because they cannot change for a runtime's lifetime. */
  private readonly resizeEnabled: boolean;
  private readonly checkboxesEnabled: boolean;

  /**
   * Monotonic pass counter driving the sweep.
   *
   * Deliberately not `RenderWindow.frame`: the grid may legitimately hand the
   * same frame number to two passes (a forced repaint inside one animation
   * frame), and a repeated stamp would sweep bars that are still live. A counter
   * this class owns cannot collide.
   */
  private pass = 0;

  /** Last frame's placements, exposed for hit-testing. */
  private placements: readonly BarPlacement[] = NO_PLACEMENTS;

  /** The `+N more` pill. Created on first truncated frame and never re-created. */
  private overflowEl: HTMLElement | null = null;
  private overflowMounted = false;
  private overflowText = '';
  private overflowX = Number.NaN;

  /** Formatter for the accessible time range, rebuilt only when the timeline unit changes. */
  private rangeFormatter: Intl.DateTimeFormat | null = null;
  private rangeFormatterUnit: TimeUnit | null = null;

  /**
   * Adapts the host's row-to-resource mapping to the layout engine's signature.
   *
   * A bound field rather than a method or an inline closure: `computeBarLayout`
   * takes it as a callback on every frame, and an arrow created at the call site
   * would allocate one closure per frame for no reason. Non-`data` rows -- group
   * headers, detail panes, summary rows -- are rejected here rather than inside
   * the host's callback, so a host never has to defend against row shapes it
   * did not ask for.
   */
  private readonly resourceIdOf = (row: RowNode): string | null =>
    row.type === 'data' ? this.runtime.config.resourceIdOf(row.data) : null;

  /**
   * @param runtime - Shared scheduler state. Read-only from this class's point of
   *   view: the renderer never mutates the timeline, the index or the selection.
   * @param layerEl - The plugin layer bars are mounted into. Expected to have
   *   been mounted with `followRowOrigin` and `followScrollX`, which is what
   *   lets bar geometry stay constant across a scroll.
   */
  constructor(
    private readonly runtime: SchedulerRuntime,
    private readonly layerEl: HTMLElement,
  ) {
    const { config } = runtime;
    this.layoutOptions = { rowPaddingY: config.rowPaddingY,
      minWidth: this.runtime.config.minEventWidth, laneGap: config.laneGap };
    this.resizeEnabled = config.resize.enabled;
    this.checkboxesEnabled = config.selection.checkboxes;
  }

  /**
   * Paints one frame.
   *
   * The whole method is the hot path -- it runs synchronously inside the grid's
   * own render, once per animation frame -- so it reads no DOM, forces no layout
   * and allocates only when the visible set genuinely changes.
   *
   * @param window - The virtualization window the grid just committed. Bar
   *   positions are derived from it rather than from a second measurement, so
   *   bars can never be a frame out of step with their resource rows.
   */
  render(window: RenderWindow): void {
    const pass = ++this.pass;
    const { index, timeline } = this.runtime;

    const result = computeBarLayout(
      window,
      timeline.axis,
      index,
      this.resourceIdOf,
      this.scratch,
      this.layoutOptions,
    );
    this.placements = result.bars;

    for (let i = 0; i < result.bars.length; i++) {
      const placement = result.bars[i];
      const event = index.get(placement.handle);
      // A handle can outlive its event when the host removes one mid-frame.
      // Leaving the element unstamped lets the sweep reclaim it below.
      if (!event) continue;

      const el = this.acquire(placement.key);
      const state = this.states.get(el) as BarState;
      state.pass = pass;

      this.bind(el, state, event, placement);
      this.position(el, state, placement);
    }

    this.sweep(pass);
    this.syncOverflow(result.truncated, window);
  }

  /**
   * Resolves an event id to its mounted bar.
   *
   * Interaction services need this to attach a drag to the element the user
   * grabbed, and to move focus after a keyboard command. Returns `null` for
   * events that are not currently rendered -- scrolled out, filtered away, or
   * beyond the frame's bar budget -- which callers must treat as "no DOM to act
   * on" rather than "no such event".
   */
  getBarElement(eventId: string): HTMLElement | null {
    return this.byEventId.get(eventId) ?? null;
  }

  /**
   * The placements produced by the most recent {@link render}.
   *
   * Exposed so hit-testing, drag previews and overlap checks can reuse the
   * geometry this renderer already computed instead of calling
   * `getBoundingClientRect` per pointer move -- which would force layout on
   * every mouse event during a drag, the single easiest way to lose 60 fps.
   *
   * Borrowed by reference and replaced wholesale each frame: callers must read
   * it during the same turn and never retain or mutate it.
   */
  getPlacements(): readonly BarPlacement[] {
    return this.placements;
  }

  /**
   * Releases every node, component and cache this renderer owns.
   *
   * Components are destroyed before the DOM is emptied, so a framework wrapper
   * still sees its host element attached while it unmounts -- React and Angular
   * both misbehave when unmounted from a detached tree.
   */
  destroy(): void {
    for (const instance of this.components.values()) {
      // A component that throws while unmounting must not strand the rest of
      // the teardown; the grid is going away regardless.
      try {
        instance.destroy?.();
      } catch {
        /* ignored: teardown must not be abortable by host code */
      }
    }
    this.components.clear();

    this.live.clear();
    this.byEventId.clear();
    this.typeCache.clear();
    this.pool.length = 0;
    this.placements = NO_PLACEMENTS;

    while (this.layerEl.firstChild) this.layerEl.removeChild(this.layerEl.firstChild);

    this.overflowEl = null;
    this.overflowMounted = false;
    this.overflowText = '';
    this.overflowX = Number.NaN;
    this.rangeFormatter = null;
    this.rangeFormatterUnit = null;
  }

  // -- Recycling ------------------------------------------------------------

  /** Returns the bar for `key`, reusing a pooled node or creating one. */
  private acquire(key: string): HTMLElement {
    const existing = this.live.get(key);
    if (existing) return existing;

    const el = this.pool.pop() ?? this.createBar();
    this.live.set(key, el);

    const state = this.states.get(el) as BarState;
    if (!state.attached) {
      this.layerEl.appendChild(el);
      state.attached = true;
    }
    return el;
  }

  /** Detaches every bar not stamped with the current pass. */
  private sweep(pass: number): void {
    // Deleting from a Map during its own iteration is well defined: an entry
    // removed before it is reached is simply not visited.
    for (const [key, el] of this.live) {
      const state = this.states.get(el) as BarState;
      if (state.pass === pass) continue;
      this.live.delete(key);
      this.recycle(el, state);
    }
  }

  /** Unbinds a bar and returns it to the pool, dropping it entirely once the pool is full. */
  private recycle(el: HTMLElement, state: BarState): void {
    if (state.eventId !== '') {
      this.byEventId.delete(state.eventId);
      state.eventId = '';
    }
    this.destroyComponent(el, state);

    el.remove();
    state.attached = false;
    // Force a content rebuild on the next bind: the node may come back bound to
    // a completely different event, and a stale version number would suppress it.
    state.version = -1;

    if (this.pool.length < MAX_POOLED_BARS) this.pool.push(el);
  }

  /** Builds an empty bar with the children every bar needs regardless of type. */
  private createBar(): HTMLElement {
    const el = createDiv(BAR_CLASS);
    // Focusability and role are invariant, so they are written once here rather
    // than re-asserted on every bind.
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');

    const label = document.createElement('span');
    label.className = 'pg-scheduler-bar__label';

    const state: BarState = {
      pass: -1,
      eventId: '',
      resourceId: '',
      version: -1,
      typeName: '',
      cssClass: '',
      iconName: '',
      selected: false,
      locked: false,
      left: Number.NaN,
      top: Number.NaN,
      width: Number.NaN,
      height: Number.NaN,
      attached: false,
      skeletonSig: SKELETON_NONE,
      custom: false,
      componentCtor: null,
      label,
      icon: null,
      badge: null,
      checkbox: null,
      handleStart: null,
      handleEnd: null,
    };

    // Checkbox and handles are gated on config that cannot change for the
    // runtime's lifetime, so they are created eagerly and only mounted or
    // unmounted afterwards.
    if (this.checkboxesEnabled) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'pg-scheduler-bar__checkbox';
      // The bar itself carries the accessible name and selected state; a second
      // announcement from the checkbox would read every event twice.
      checkbox.setAttribute('aria-hidden', 'true');
      checkbox.tabIndex = -1;
      state.checkbox = checkbox;
    }

    if (this.resizeEnabled) {
      state.handleStart = createDiv('pg-scheduler-bar__handle pg-scheduler-bar__handle--start');
      state.handleEnd = createDiv('pg-scheduler-bar__handle pg-scheduler-bar__handle--end');
    }

    this.states.set(el, state);
    return el;
  }

  // -- Binding --------------------------------------------------------------

  /** Applies an event to a bar, touching only what actually differs from last frame. */
  private bind(
    el: HTMLElement,
    state: BarState,
    event: SchedulerEvent,
    placement: BarPlacement,
  ): void {
    const typeName = event.type ?? DEFAULT_EVENT_TYPE;
    const type = this.resolveType(typeName);

    const typeChanged = state.typeName !== typeName;
    if (typeChanged) this.applyTypeStyles(el, state, type, typeName);

    const locked = type.locked === true;
    if (state.locked !== locked) {
      el.classList.toggle('pg-scheduler-bar--locked', locked);
      state.locked = locked;
    }

    const rebound = state.eventId !== event.id;
    if (rebound) {
      if (state.eventId !== '') this.byEventId.delete(state.eventId);
      this.byEventId.set(event.id, el);
      el.setAttribute('data-event-id', event.id);
      state.eventId = event.id;
    }

    if (state.resourceId !== placement.resourceId) {
      el.setAttribute('data-resource-id', placement.resourceId);
      state.resourceId = placement.resourceId;
    }

    const selected = this.runtime.selection.has(event.id);
    if (state.selected !== selected) {
      el.classList.toggle('pg-scheduler-bar--selected', selected);
      el.setAttribute('aria-selected', selected ? 'true' : 'false');
      if (state.checkbox) state.checkbox.checked = selected;
      state.selected = selected;
    }

    // `version` is the host's contract for "this event's content changed". A
    // bar whose id and version both hold is byte-identical to last frame, so
    // rebuilding it would be pure waste -- and would blow away a framework
    // component's DOM sixty times a second.
    const version = event.version ?? 0;
    // A type change alters the icon, the badge and whether resize handles are
    // allowed at all, none of which the version gate would otherwise catch.
    if (!rebound && !typeChanged && state.version === version) return;

    this.buildContent(el, state, event, type, placement);
    state.version = version;
    this.applyAccessibleName(el, event);
  }

  /** Resolves and memoizes the merged appearance for one type name. */
  private resolveType(name: string): SchedulerEventTypeConfig {
    let resolved = this.typeCache.get(name);
    if (resolved === undefined) {
      const { config } = this.runtime;
      // Spreading an absent entry yields the defaults alone, which is exactly
      // the desired behaviour for an unregistered type name.
      resolved = { ...config.eventDefaults, ...config.eventTypes[name] };
      this.typeCache.set(name, resolved);
    }
    return resolved;
  }

  /**
   * Writes the type's appearance onto the bar.
   *
   * Gated on the type *name* alone, which is sound because resolved configs are
   * memoized and immutable: same name implies same values, so a bar that keeps
   * its type across a rebind performs zero style writes. Absent values are
   * written as `''` rather than skipped, so a bar recycled from a colourful type
   * onto a plain one falls back to the stylesheet instead of inheriting the
   * previous tenant's colours.
   */
  private applyTypeStyles(
    el: HTMLElement,
    state: BarState,
    type: SchedulerEventTypeConfig,
    typeName: string,
  ): void {
    const style = el.style;
    style.background = type.background ?? '';
    style.borderColor = type.borderColor ?? '';
    style.color = type.textColor ?? '';
    style.opacity = type.opacity === undefined ? '' : String(type.opacity);
    style.borderRadius = type.radius ?? '';
    style.padding = type.padding ?? '';
    style.fontWeight = type.fontWeight ?? '';

    if (state.cssClass !== '') el.classList.remove(state.cssClass);
    if (type.cssClass) el.classList.add(type.cssClass);
    state.cssClass = type.cssClass ?? '';

    state.typeName = typeName;
  }

  /**
   * Positions a bar.
   *
   * `transform` carries both axes because it is composited: the browser moves the
   * layer without recalculating layout for it or for its siblings. `width` and
   * `height` do affect layout, which is precisely why they are diffed -- on a
   * scroll they never change, so the layout engine is never invalidated.
   */
  private position(el: HTMLElement, state: BarState, placement: BarPlacement): void {
    if (state.left !== placement.left || state.top !== placement.top) {
      el.style.transform = `translate(${placement.left}px, ${placement.top}px)`;
      state.left = placement.left;
      state.top = placement.top;
    }
    if (state.width !== placement.width) {
      el.style.width = `${placement.width}px`;
      state.width = placement.width;
    }
    if (state.height !== placement.height) {
      el.style.height = `${placement.height}px`;
      state.height = placement.height;
    }
  }

  // -- Content --------------------------------------------------------------

  /** Dispatches to the custom renderer when the type declares one, else to the built-in layout. */
  private buildContent(
    el: HTMLElement,
    state: BarState,
    event: SchedulerEvent,
    type: SchedulerEventTypeConfig,
    placement: BarPlacement,
  ): void {
    if (type.renderer) {
      this.renderCustom(el, state, event, type.renderer, placement);
      return;
    }
    this.renderDefault(el, state, event, type);
  }

  /** Builds the built-in icon / label / badge layout. */
  private renderDefault(
    el: HTMLElement,
    state: BarState,
    event: SchedulerEvent,
    type: SchedulerEventTypeConfig,
  ): void {
    // A type switched from custom to built-in leaves foreign DOM behind; the
    // component (if any) must be released before its element is discarded.
    if (state.custom) this.destroyComponent(el, state);

    const iconName = type.icon ?? '';
    const badgeText = resolveDynamic(type.badge, event);
    const wantHandles = this.resizeEnabled && !state.locked;

    this.syncSkeleton(el, state, iconName !== '', badgeText !== null && badgeText !== '', wantHandles);

    if (iconName !== '' && state.icon !== null) {
      // The only `innerHTML` in this file, and it is fed by the icon registry --
      // library-controlled markup, never event data. Guarded by the name so a
      // rebind to the same icon does not re-parse it.
      if (state.iconName !== iconName) {
        state.icon.innerHTML = this.runtime.renderIcon(iconName, ICON_SIZE);
        state.iconName = iconName;
      }
    } else {
      state.iconName = '';
    }

    // `textContent`, always: a title is host data and may contain anything.
    state.label.textContent = event.title ?? event.id;

    if (badgeText !== null && badgeText !== '' && state.badge !== null) {
      state.badge.textContent = badgeText;
    }

    const tooltip = resolveDynamic(type.tooltip, event);
    if (tooltip !== null && tooltip !== '') el.title = tooltip;
    else if (el.title !== '') el.title = '';
  }

  /**
   * Mounts exactly the optional children the current binding needs.
   *
   * Rebuilds the child list wholesale rather than splicing individual nodes.
   * That sounds wasteful and is not: it runs only when the *composition* changes
   * (an icon appears, a badge disappears, a lock removes the handles) or when a
   * custom renderer has to be evicted, never on a scroll and rarely on a rebind
   * -- and it makes DOM order correct by construction instead of by a web of
   * `insertBefore` reference points.
   */
  private syncSkeleton(
    el: HTMLElement,
    state: BarState,
    wantIcon: boolean,
    wantBadge: boolean,
    wantHandles: boolean,
  ): void {
    const signature =
      (wantIcon ? SKELETON_ICON : 0)
      | (wantBadge ? SKELETON_BADGE : 0)
      | (wantHandles ? SKELETON_HANDLES : 0);

    if (!state.custom && state.skeletonSig === signature) return;

    while (el.firstChild) el.removeChild(el.firstChild);

    if (state.checkbox !== null) el.appendChild(state.checkbox);
    if (wantIcon) el.appendChild(this.ensureIcon(state));
    el.appendChild(state.label);
    if (wantBadge) el.appendChild(this.ensureBadge(state));
    // Handles are absolutely positioned, so they sit last without disturbing the
    // flex order of the content above.
    if (wantHandles && state.handleStart !== null && state.handleEnd !== null) {
      el.appendChild(state.handleStart);
      el.appendChild(state.handleEnd);
    }

    state.skeletonSig = signature;
    state.custom = false;
  }

  /** Creates the icon slot on first use. Most events have no icon; most bars never pay for one. */
  private ensureIcon(state: BarState): HTMLElement {
    if (state.icon === null) {
      const icon = document.createElement('span');
      icon.className = 'pg-scheduler-bar__icon';
      // Decorative: the accessible name already carries the type through the
      // event title, and announcing an icon glyph would only add noise.
      icon.setAttribute('aria-hidden', 'true');
      state.icon = icon;
    }
    return state.icon;
  }

  /** Creates the badge slot on first use. */
  private ensureBadge(state: BarState): HTMLElement {
    if (state.badge === null) {
      const badge = document.createElement('span');
      badge.className = 'pg-scheduler-bar__badge';
      state.badge = badge;
    }
    return state.badge;
  }

  // -- Custom renderers -----------------------------------------------------

  /**
   * Hands the bar's interior to a host renderer.
   *
   * Two shapes are supported and told apart by prototype inspection rather than
   * by a discriminant field, because the function form has to stay a plain
   * arrow -- asking hosts to tag their renderers would make the simple case
   * ceremonial. The component form is given a real lifecycle so a React root or
   * an Angular view can be reconciled on rebind and released on recycle;
   * `refresh` returning `true` means the framework handled the change in place
   * and the scheduler must not tear anything down.
   */
  private renderCustom(
    el: HTMLElement,
    state: BarState,
    event: SchedulerEvent,
    renderer: SchedulerEventRenderer,
    placement: BarPlacement,
  ): void {
    const params: SchedulerEventRenderParams = {
      event,
      resource: this.runtime.getResource(placement.resourceId),
      el,
      selected: state.selected,
      width: placement.width,
      height: placement.height,
    };

    if (isComponentConstructor(renderer)) {
      const existing = this.components.get(el);
      if (existing !== undefined && state.componentCtor === renderer) {
        if (existing.refresh?.(params) === true) return;
      }
      if (existing !== undefined) this.destroyComponent(el, state);

      const instance = new renderer();
      this.components.set(el, instance);
      state.componentCtor = renderer;

      this.clearForCustom(el, state);
      const produced = instance.init?.(params);
      applyRendererOutput(el, produced ?? instance.getElement?.() ?? undefined);
    } else {
      // Switching from a component type to a function type on the same node.
      this.destroyComponent(el, state);
      this.clearForCustom(el, state);
      // `void` is a legal return meaning "I filled `el` myself"; normalising it
      // to `undefined` keeps the installer's contract a plain value union.
      applyRendererOutput(el, renderer(params) ?? undefined);
    }

    // The renderer may legitimately have replaced the whole subtree, handles
    // included, so they are re-asserted afterwards. `appendChild` on a node that
    // is already the last child is a no-op move, so the common case is cheap.
    if (this.resizeEnabled && !state.locked && state.handleStart !== null && state.handleEnd !== null) {
      el.appendChild(state.handleStart);
      el.appendChild(state.handleEnd);
    }
  }

  /** Empties a bar ahead of a custom render and marks its skeleton as gone. */
  private clearForCustom(el: HTMLElement, state: BarState): void {
    while (el.firstChild) el.removeChild(el.firstChild);
    state.skeletonSig = SKELETON_NONE;
    state.custom = true;
    state.iconName = '';
  }

  /** Releases the component bound to a bar, if any. Safe to call unconditionally. */
  private destroyComponent(el: HTMLElement, state: BarState): void {
    const instance = this.components.get(el);
    if (instance !== undefined) {
      try {
        instance.destroy?.();
      } catch {
        /* ignored: a failing host component must not corrupt the pool */
      }
      this.components.delete(el);
    }
    state.componentCtor = null;
  }

  // -- Accessibility --------------------------------------------------------

  /**
   * Writes the bar's accessible name: title first, then the formatted range.
   *
   * A bar is a coloured rectangle whose meaning is entirely positional, so
   * without the range a screen-reader user gets "Annual leave, button" with no
   * way to learn *when*. The range is formatted with a cached `Intl` formatter
   * whose precision follows the timeline unit -- reading a wall-clock time on a
   * year view would be noise, and omitting it on an hour view would lose the
   * only information that matters.
   */
  private applyAccessibleName(el: HTMLElement, event: SchedulerEvent): void {
    const formatter = this.getRangeFormatter();
    const title = event.title ?? event.id;
    el.setAttribute('aria-label', `${title}, ${formatter.format(event.start)} - ${formatter.format(event.end)}`);
  }

  /** Lazily builds the range formatter, rebuilding only when the timeline's unit changes. */
  private getRangeFormatter(): Intl.DateTimeFormat {
    const unit = this.runtime.timeline.config.unit;
    if (this.rangeFormatter !== null && this.rangeFormatterUnit === unit) return this.rangeFormatter;

    const withTime = unit === 'minute' || unit === 'hour';
    this.rangeFormatter = new Intl.DateTimeFormat(undefined, withTime
      ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'short', day: 'numeric' });
    this.rangeFormatterUnit = unit;
    return this.rangeFormatter;
  }

  // -- Overflow -------------------------------------------------------------

  /**
   * Shows or hides the `+N more` pill.
   *
   * Only reached when the layout engine hit its bar budget, which means the
   * frame is already degraded: past that density the bars are narrower than
   * their own text and a count genuinely communicates more than the bars would.
   * The count itself costs one extra index query per visible resource -- real
   * work, but only on truncated frames, and cheaper than the lane layout the
   * engine skipped by bailing out.
   */
  private syncOverflow(truncated: boolean, window: RenderWindow): void {
    if (!truncated) {
      if (this.overflowEl !== null && this.overflowMounted) {
        this.overflowEl.remove();
        this.overflowMounted = false;
      }
      return;
    }

    const el = this.overflowEl ?? (this.overflowEl = this.createOverflow());

    const text = `+${this.countHiddenEvents(window)} more`;
    if (this.overflowText !== text) {
      el.textContent = text;
      this.overflowText = text;
    }

    // The layer pans with the content, so the pill has to be placed in content
    // space to stay pinned to the right of the viewport.
    const x = window.scroll.scrollLeft + window.scroll.viewportWidth - OVERFLOW_INSET_PX;
    if (this.overflowX !== x) {
      el.style.transform = `translate(${x}px, ${OVERFLOW_TOP_PX}px)`;
      this.overflowX = x;
    }

    if (!this.overflowMounted) {
      this.layerEl.appendChild(el);
      this.overflowMounted = true;
    }
  }

  /** Builds the overflow pill and re-anchors it to the left so it can be transform-positioned. */
  private createOverflow(): HTMLElement {
    const el = createDiv('pg-scheduler-overflow');
    // The stylesheet anchors the pill to the right of its container, which is
    // the content-width layer rather than the viewport. Re-anchoring to the left
    // once here is what makes `translate()` mean what it says.
    el.style.right = 'auto';
    el.style.left = '0px';
    return el;
  }

  /** Counts events in the visible range that did not get a bar this frame. */
  private countHiddenEvents(window: RenderWindow): number {
    const { index, timeline } = this.runtime;
    const range = visibleTimeRange(timeline.axis, window.scroll.scrollLeft, window.scroll.viewportWidth);

    let total = 0;
    for (const row of window.rows) {
      const resourceId = this.resourceIdOf(row);
      if (resourceId === null) continue;
      this.countScratch.length = 0;
      index.query(resourceId, range.start, range.end, this.countScratch);
      total += this.countScratch.length;
    }

    return Math.max(0, total - this.placements.length);
  }
}

/**
 * Distinguishes a component constructor from a plain render function.
 *
 * There is no reliable language-level test -- both are `function` -- so this
 * inspects the prototype for the lifecycle contract. A plain arrow function has
 * no `prototype` at all, and a plain `function` renderer has an empty one, so
 * false positives require a host to put a method named `init`, `refresh`,
 * `destroy` or `getElement` on a function it intends to be called directly,
 * which is not a shape that occurs by accident.
 */
function isComponentConstructor(
  renderer: SchedulerEventRenderer,
): renderer is SchedulerEventComponentConstructor {
  if (typeof renderer !== 'function') return false;
  const prototype = (renderer as { prototype?: unknown }).prototype;
  if (prototype === null || typeof prototype !== 'object') return false;
  return 'init' in prototype || 'refresh' in prototype || 'destroy' in prototype || 'getElement' in prototype;
}

/**
 * Installs whatever a custom renderer produced.
 *
 * `undefined` is the "I filled `params.el` myself" case and must not clear the
 * element -- doing so would erase exactly the work the renderer just did. A
 * string is treated as markup because that is the only useful reading of it, and
 * it comes from host code rather than from event data.
 */
function applyRendererOutput(el: HTMLElement, output: HTMLElement | string | null | undefined): void {
  if (output === undefined || output === null) return;
  if (typeof output === 'string') {
    el.innerHTML = output;
    return;
  }
  el.appendChild(output);
}

/** Resolves a `string | ((event) => string | null)` config field against one event. */
function resolveDynamic(
  value: string | ((event: SchedulerEvent) => string | null) | undefined,
  event: SchedulerEvent,
): string | null {
  if (value === undefined) return null;
  return typeof value === 'function' ? value(event) : value;
}
