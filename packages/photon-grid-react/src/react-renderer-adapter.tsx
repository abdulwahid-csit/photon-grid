import {
  createElement,
  isValidElement,
  type ComponentType,
  type JSX,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

import type {
  ColumnDef as columnDefCore,
  ColumnDefInput,
  ColumnRenderer,
  DetailComponent,
  DetailComponentConstructor,
  DetailContext,
  DetailRenderer,
  GridOptions,
  MasterDetailConfig,
  RendererOutput,
} from 'photon-grid-core';

export interface ReactRendererSpec {
  kind: 'component';
  component: ComponentType<Record<string, unknown>>;
  props?: (params: unknown) => Record<string, unknown>;
}

/**
 * `masterDetail.renderer` as accepted by the React wrapper: a React component
 * passed directly, or anything the core already accepts (a `DetailComponent`
 * class, a `(ctx) => HTMLElement | string` function, a static HTML string).
 *
 * ```tsx
 * renderer: OrderDetail                                  // a React component
 * renderer: (ctx) => `<h2>${ctx.data.account}</h2>`      // core: HTML from a function
 * renderer: '<h2>Details</h2>'                           // core: a static HTML string
 * ```
 *
 * A bare function is treated as a React component only when its name is
 * capitalised — the same convention {@link isComponentRenderer} uses for
 * cells, since a lowercase React component is indistinguishable from a core
 * function renderer. For that case, wrap it explicitly with
 * {@link createReactDetailRenderer}.
 */
export type ReactDetailRenderer = ComponentType<Record<string, unknown>> | DetailRenderer;

/** Core `MasterDetailConfig` with `renderer` widened to the React forms above. */
export type ReactMasterDetailConfig = Omit<MasterDetailConfig, 'renderer'> & {
  renderer?: ReactDetailRenderer;
};

/**
 * Core `GridOptions` with `masterDetail.renderer` widened to accept React
 * components. Assignment-compatible with the core type, so an existing
 * `GridOptions` object passes through unchanged.
 */
export type PhotonGridOptions = Omit<GridOptions, 'masterDetail'> & {
  masterDetail?: ReactMasterDetailConfig;
};

type RendererSlotValue = ((params: unknown) => RendererOutput) | ReactRendererSpec | ComponentType<Record<string, unknown>> | ReactElement | undefined;

/**
 * React column definition. Built on the core's {@link ColumnDefInput}, so it
 * inherits the same relaxed contract: **only `field` is required**; `colId`,
 * `header` and `type` are optional and defaulted by the core (auto `colId`,
 * header from the field in Title Case, `type` defaulting to `'string'`). The
 * `renderer` slots additionally accept React components/specs.
 */
type columnDef = Omit<ColumnDefInput, 'renderer'> & {
  /**
   * Accepts everything the core does — a built-in renderer by name
   * (`'country'`), a configured one (`{ name, options }`), a bare display
   * function — plus the React component/spec forms in the slot map, which the
   * adapter converts to plain functions.
   *
   * Also accepts a React component or {@link ReactRendererSpec} directly
   * (`renderer: MyCell`), which is shorthand for `renderer: { display: MyCell }`,
   * or an already-instantiated element (`renderer: <MyCell />`), shorthand for
   * `renderer: { display: <MyCell /> }`.
   */
  renderer?: ColumnRenderer | ReactRendererSpec | ComponentType<Record<string, unknown>> | ReactElement | {
    display?: RendererSlotValue;
    editor?: RendererSlotValue;
    option?: RendererSlotValue;
    filter?: RendererSlotValue;
    tooltip?: RendererSlotValue;
    group?: RendererSlotValue;
    header?: RendererSlotValue;
    summary?: RendererSlotValue;
  };
};

/**
 * Runtime probe for the React forms of a renderer slot.
 *
 * Takes `unknown` rather than {@link RendererSlotValue} on purpose: the slot map
 * on {@link columnDef} is a union with the core's `ColumnRendererMap`
 * (both lack `name`, so neither the `typeof` nor the `'name' in` narrowing in
 * {@link ReactRendererAdapter.adaptColumns} can separate them), which makes each
 * slot read a union of the core's strongly-typed slot functions *and* the React
 * forms. A structural check needs no static contract, so widening the parameter
 * is more honest than casting at every call site.
 */
function isComponentRenderer(value: unknown): value is ReactRendererSpec | ComponentType<Record<string, unknown>> {
  if (!value) {
    return false;
  }

  if (typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'component') {
    return true;
  }

  // A memo/forwardRef component definition also carries `$$typeof`, but so
  // does an actual element instance (`<Foo />`) — excluded here since an
  // element must be portal-mounted via `mountElement`, not instantiated a
  // second time via `createElement(spec, props)`.
  if (typeof value === 'object' && value !== null && '$$typeof' in value && !isValidElement(value)) {
    return true;
  }

  if (typeof value === 'function') {
    return /^[A-Z]/.test((value as { readonly name?: string }).name ?? '');
  }

  return false;
}

type RendererEntry = {
  key: string;
  host: HTMLElement;
  component?: ComponentType<Record<string, unknown>>;
  element?: ReactNode;
  props?: Record<string, unknown>;
};

export class ReactRendererAdapter {
  private root?: Root;
  private container?: HTMLElement;
  private readonly entries = new Map<string, RendererEntry>();
  private observer?: MutationObserver;
  private pendingFlush = false;

  observe(host: HTMLElement): void {
    if (this.observer) {
      return;
    }

    this.container = document.createElement('div');
    this.container.className = 'photon-grid-react__portal';
    this.container.style.position = 'absolute';
    this.container.style.inset = '0';
    this.container.style.pointerEvents = 'none';
    this.container.style.overflow = 'hidden';
    host.appendChild(this.container);

    this.root = createRoot(this.container);
    this.flush();

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const removedNode of Array.from(mutation.removedNodes)) {
          this.unmountNode(removedNode);
        }
      }
    });

    this.observer.observe(host, { childList: true, subtree: true });
  }

  adaptColumns(columns: columnDef[]): columnDefCore[] {
    return columns.map((column) => {
      const { renderer } = column;
      if (!renderer) {
        return column as columnDefCore;
      }

      // An already-instantiated element used directly as the renderer —
      // `renderer: <PandLValue />` — is shorthand for
      // `renderer: { display: <PandLValue /> }`. This must be checked before
      // `isComponentRenderer`: an element instance carries `$$typeof` too,
      // so without this branch it would be misread as a component *type*
      // and re-instantiated via `createElement` in `renderFrame`, which
      // expects a type/string, not an element that already exists.
      if (isValidElement(renderer)) {
        return {
          ...column,
          renderer: {
            display: (params: unknown) => this.mountElement(renderer, params),
          },
        } as columnDefCore;
      }

      // A React component or spec used directly as the renderer —
      // `renderer: MyCell` — is shorthand for `renderer: { display: MyCell }`.
      // This MUST be checked before the pass-through guard below: a React
      // component is `typeof 'function'` too, and that guard would otherwise
      // treat it as an already-core-compatible display function and hand it
      // to the core unadapted. The core would then invoke it directly as
      // `renderer(params)` — outside of React entirely, with no root, no
      // hooks, no context — and receive back a React element instead of the
      // HTMLElement/string it expects, so nothing would ever render.
      if (isComponentRenderer(renderer)) {
        return {
          ...column,
          renderer: {
            display: (params: unknown) => this.mountComponent(renderer, params),
          },
        } as columnDefCore;
      }

      // A built-in renderer selected by name (`renderer: 'country'`), a
      // configured one (`{ name, options }`), or a bare display function passes
      // straight through — there is nothing React-flavoured to adapt.
      //
      // This must precede the slot loop: a string is truthy but has no slots,
      // so the loop below would replace it with an empty object, which the core
      // reads as "slot map with no display" and silently falls back to the
      // column's inferred renderer. The named renderer would vanish with no
      // error anywhere.
      if (typeof renderer === 'string' || typeof renderer === 'function' || 'name' in renderer) {
        return column as columnDefCore;
      }

      const adaptedRenderer: Record<string, unknown> = {};
      const slots = ['display', 'editor', 'option', 'filter', 'tooltip', 'group', 'header', 'summary'] as const;

      for (const slot of slots) {
        const value = renderer[slot];
        if (isValidElement(value)) {
          adaptedRenderer[slot] = (params: unknown) => this.mountElement(value, params);
        } else if (isComponentRenderer(value)) {
          adaptedRenderer[slot] = (params: unknown) => this.mountComponent(value, params);
        } else if (typeof value === 'function') {
          // A function that isn't a named component (e.g. an inline
          // `display: (params) => <SignedPair />`) can't be classified until
          // it's actually called: the capitalisation heuristic only applies
          // to the function *reference* itself, and an arrow function like
          // this has no useful name. So call it, then decide from the
          // result: a valid React element gets portal-mounted through
          // `mountElement`; anything else (an HTMLElement, a string) is
          // already core-compatible output and is returned untouched.
          adaptedRenderer[slot] = (params: unknown) => {
            const result = (value as (p: unknown) => RendererOutput | ReactNode)(params);
            return isValidElement(result) ? this.mountElement(result, params) : (result as RendererOutput);
          };
        }
      }

      return {
        ...column,
        renderer: adaptedRenderer,
      } as columnDefCore;
    });
  }

  /**
   * Converts React-flavoured grid options into what the core accepts.
   *
   * Currently that is `masterDetail.renderer`: a React component is wrapped in
   * a core `DetailComponent` class that owns its own React root and unmounts
   * it in `destroy()`.
   *
   * Unlike cell renderers, detail rows need no portal bookkeeping and no
   * `MutationObserver`: the core's detail lifecycle hands us explicit
   * `init`/`refresh`/`destroy` hooks, and there is at most one mounted detail
   * per expanded row.
   *
   * Returns the original object untouched when there is nothing React to
   * adapt, so the common case allocates nothing.
   */
  adaptOptions(options: Partial<PhotonGridOptions>): Partial<GridOptions> {
    const masterDetail = options.masterDetail;
    if (!masterDetail?.renderer) {
      return options as Partial<GridOptions>;
    }

    return {
      ...options,
      masterDetail: {
        ...masterDetail,
        renderer: adaptDetailRenderer(masterDetail.renderer),
      },
    } as Partial<GridOptions>;
  }

  dispose(): void {
    this.observer?.disconnect();
    this.observer = undefined;

    const root = this.root;

    this.root = undefined;

    queueMicrotask(() => {
        root?.unmount();
    });
    this.root = undefined;

    this.entries.clear();
    this.container?.remove();
    this.container = undefined;
    this.pendingFlush = false;
  }

  private mountComponent(spec: ReactRendererSpec | ComponentType<Record<string, unknown>>, params: unknown): HTMLElement {
    const key = this.getRendererKey(params);

    if (key) {
      const existing = this.entries.get(key);
      if (existing) {
        const props = this.getRendererProps(spec, params);
        if (existing.component === this.getComponent(spec) && this.propsMatch(existing.props, props)) {
          return existing.host;
        }

        existing.component = this.getComponent(spec);
        existing.props = props;
        existing.element = undefined;
        this.flush();
        return existing.host;
      }
    }

    const host = document.createElement('div');
    host.className = 'photon-grid-react__renderer-host';
    host.style.width = '100%';
    host.style.height = '100%';
    host.style.pointerEvents = 'auto';
    host.style.display = 'block';

    if (key) {
      this.entries.set(key, {
        key,
        host,
        component: this.getComponent(spec),
        props: this.getRendererProps(spec, params),
      });
      this.flush();
    }

    return host;
  }

  /**
   * Portal-mounts an already-constructed `ReactNode` — the output of calling
   * an inline `display`/`editor`/etc. function that returns JSX directly,
   * as opposed to a component reference invoked via `createElement`.
   *
   * There's no `component`/`props` pair to diff against on re-render (the
   * caller already produced the element), so unlike `mountComponent` this
   * always re-renders the cached entry on a key hit rather than trying to
   * skip an unchanged render.
   */
  private mountElement(element: ReactNode, params: unknown): HTMLElement {
    const key = this.getRendererKey(params);

    if (key) {
      const existing = this.entries.get(key);
      if (existing) {
        existing.component = undefined;
        existing.props = undefined;
        existing.element = element;
        this.flush();
        return existing.host;
      }
    }

    const host = document.createElement('div');
    host.className = 'photon-grid-react__renderer-host';
    host.style.width = '100%';
    host.style.height = '100%';
    host.style.pointerEvents = 'auto';
    host.style.display = 'block';

    if (key) {
      this.entries.set(key, { key, host, element });
      this.flush();
    }

    return host;
  }

  private flush(): void {
    if (!this.root || !this.container || this.pendingFlush) {
      return;
    }

    this.pendingFlush = true;

    requestAnimationFrame(() => {
      this.pendingFlush = false;
      if (!this.root) {
        return;
      }

      this.root.render(createElement(this.renderFrame, { entries: Array.from(this.entries.values()) }));
    });
  }

  private renderFrame(props: { entries: RendererEntry[] }): JSX.Element {
    return createElement(
      'div',
      { className: 'photon-grid-react__frame', style: { display: 'contents' } },
      props.entries.map((entry) => createElement(
        'div',
        { key: entry.key, style: { display: 'contents' } },
        createPortal(
          entry.component ? createElement(entry.component, entry.props ?? {}) : entry.element,
          entry.host,
        ),
      )),
    );
  }

  private getComponent(spec: ReactRendererSpec | ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
    if (typeof spec === 'object' && spec !== null && 'kind' in spec) {
      return spec.component;
    }

    return spec as ComponentType<Record<string, unknown>>;
  }

  private getRendererProps(spec: ReactRendererSpec | ComponentType<Record<string, unknown>>, params: unknown): Record<string, unknown> {
    if (typeof spec === 'object' && spec !== null && 'kind' in spec && typeof spec.props === 'function') {
      return {
        ...this.getBaseProps(params),
        ...spec.props(params),
      };
    }

    return this.getBaseProps(params);
  }

  private getBaseProps(params: unknown): Record<string, unknown> {
    if (!params || typeof params !== 'object') {
      return {};
    }

    const candidate = params as Record<string, unknown>;

    return {
      ...candidate,
      row: candidate.row ?? candidate.data,
      rowIndex: candidate.rowIndex,
      value: candidate.value,
      colDef: candidate.colDef,
      api: candidate.api,
      colIndex: candidate.colIndex,
    };
  }

  private propsMatch(previousProps: Record<string, unknown> | undefined, nextProps: Record<string, unknown>): boolean {
    if (!previousProps) {
      return false;
    }

    const previousKeys = Object.keys(previousProps);
    const nextKeys = Object.keys(nextProps);

    if (previousKeys.length !== nextKeys.length) {
      return false;
    }

    for (const key of previousKeys) {
      if (!Object.prototype.hasOwnProperty.call(nextProps, key)) {
        return false;
      }

      if (previousProps[key] !== nextProps[key]) {
        return false;
      }
    }

    return true;
  }

  private getRendererKey(params: unknown): string | null {
    if (!params || typeof params !== 'object') {
      return null;
    }

    const candidate = params as {
      rowIndex?: number;
      colIndex?: number;
      colDef?: { colId?: string; field?: string };
    };

    const colId = candidate.colDef?.colId ?? candidate.colDef?.field ?? 'cell';
    const rowIndex = typeof candidate.rowIndex === 'number' ? candidate.rowIndex : 'unknown';
    const colIndex = typeof candidate.colIndex === 'number' ? candidate.colIndex : 'unknown';

    return `${colId}:${rowIndex}:${colIndex}`;
  }

  private unmountNode(node: Node): void {
    if (node instanceof HTMLElement) {
      this.unmountHost(node);
      node.querySelectorAll<HTMLElement>('*').forEach((child) => {
        this.unmountHost(child);
      });
    }
  }

  private unmountHost(host: HTMLElement): void {
    for (const [key, entry] of this.entries.entries()) {
      key
      if (entry.host === host) {
        requestAnimationFrame(() => {
            this.flush();
        });
        break;
      }
    }
  }
}

export type { columnDef as ColumnDef  };

// ── Master/Detail ────────────────────────────────────────────────────────────

/**
 * Resolves a {@link ReactDetailRenderer} to a core `DetailRenderer`. Core
 * forms — a `DetailComponent` class, a function, an HTML string — pass
 * straight through; the wrapper only adds the React form.
 */
function adaptDetailRenderer(renderer: ReactDetailRenderer): DetailRenderer {
  // Probed as `unknown` rather than through the union: each check below
  // narrows by exclusion, and by the last one TypeScript has reduced the union
  // to a shape that no longer admits the structural test being made.
  const candidate: unknown = renderer;

  // A memo/forwardRef component is an object carrying React's brand symbol.
  if (typeof candidate === 'object' && candidate !== null && '$$typeof' in candidate) {
    return createReactDetailRenderer(candidate as ComponentType<Record<string, unknown>>);
  }

  if (typeof candidate === 'function' && /^[A-Z]/.test(candidate.name)) {
    return createReactDetailRenderer(candidate as ComponentType<Record<string, unknown>>);
  }

  return renderer as DetailRenderer;
}

/** Props every detail component receives. Anything else comes from `masterDetail.props`, delivered as the `props` prop. */
function detailProps(ctx: DetailContext): Record<string, unknown> {
  return { ctx, data: ctx.data, props: ctx.props, api: ctx.api, rowNode: ctx.rowNode };
}

/**
 * Wraps a React component in a core `DetailComponent` class.
 *
 * A class (rather than a `(ctx) => HTMLElement` function) because only the
 * class form gets `destroy()` — a React root that is merely detached from the
 * DOM is never unmounted, so its effects and subscriptions would outlive the
 * collapsed row.
 *
 * Each expanded row gets its own root mounted into `ctx.containerEl`. `refresh`
 * re-renders that root in place and returns `true`, so React reconciles rather
 * than the core tearing the component down and rebuilding it.
 *
 * Exported for the one case the bare form cannot express: a lowercase-named
 * function component, which is indistinguishable from a core function
 * renderer. `renderer: createReactDetailRenderer(myDetail)` settles it.
 */
export function createReactDetailRenderer(
  component: ComponentType<Record<string, unknown>>,
): DetailComponentConstructor {
  return class ReactDetailRenderer implements DetailComponent {
    private root?: Root;

    init(ctx: DetailContext): void {
      this.root = createRoot(ctx.containerEl);
      this.root.render(createElement(component, detailProps(ctx)));
    }

    refresh(ctx: DetailContext): boolean {
      if (!this.root) {
        return false;
      }
      this.root.render(createElement(component, detailProps(ctx)));
      return true;
    }

    destroy(): void {
      const root = this.root;
      this.root = undefined;
      // Deferred: the core may call this from inside a React commit (an event
      // handler that collapsed the row), and unmounting a root synchronously
      // during render is a React error.
      queueMicrotask(() => root?.unmount());
    }
  };
}