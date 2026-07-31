import { createElement, type ComponentType, type JSX } from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

import type {
  ColumnDef,
  ColumnDefInput,
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

type RendererSlotValue = ((params: unknown) => RendererOutput) | ReactRendererSpec | ComponentType<Record<string, unknown>> | undefined;

/**
 * React column definition. Built on the core's {@link ColumnDefInput}, so it
 * inherits the same relaxed contract: **only `field` is required**; `colId`,
 * `header` and `type` are optional and defaulted by the core (auto `colId`,
 * header from the field in Title Case, `type` defaulting to `'string'`). The
 * `renderer` slots additionally accept React components/specs.
 */
type PhotonGridColumnDef = Omit<ColumnDefInput, 'renderer'> & {
  renderer?: {
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

function isComponentRenderer(value: RendererSlotValue): value is ReactRendererSpec | ComponentType<Record<string, unknown>> {
  if (!value) {
    return false;
  }

  if (typeof value === 'object' && 'kind' in value && value.kind === 'component') {
    return true;
  }

  if (typeof value === 'object' && value !== null && '$$typeof' in value) {
    return true;
  }

  if (typeof value === 'function') {
    return /^[A-Z]/.test(value.name ?? '');
  }

  return false;
}

type RendererEntry = {
  key: string;
  host: HTMLElement;
  component: ComponentType<Record<string, unknown>>;
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

  adaptColumns(columns: PhotonGridColumnDef[]): ColumnDef[] {
    return columns.map((column) => {
      if (!column.renderer) {
        return column as ColumnDef;
      }

      const adaptedRenderer: Record<string, unknown> = {};
      const slots = ['display', 'editor', 'option', 'filter', 'tooltip', 'group', 'header', 'summary'] as const;

      for (const slot of slots) {
        const value = column.renderer?.[slot];
        if (isComponentRenderer(value)) {
          adaptedRenderer[slot] = (params: unknown) => this.mountComponent(value, params);
        } else if (typeof value === 'function') {
          adaptedRenderer[slot] = value;
        }
      }

      return {
        ...column,
        renderer: adaptedRenderer,
      } as ColumnDef;
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
        createPortal(createElement(entry.component, entry.props ?? {}), entry.host),
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

export type { PhotonGridColumnDef };

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
