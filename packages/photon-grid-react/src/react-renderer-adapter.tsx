import { createElement, type ComponentType, type JSX } from 'react';
import { createPortal } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';

import type { ColumnDef, RendererOutput } from 'photon-grid-core';

export interface ReactRendererSpec {
  kind: 'component';
  component: ComponentType<Record<string, unknown>>;
  props?: (params: unknown) => Record<string, unknown>;
}

type RendererSlotValue = ((params: unknown) => RendererOutput) | ReactRendererSpec | ComponentType<Record<string, unknown>> | undefined;

type PhotonGridColumnDef = Omit<ColumnDef, 'renderer'> & {
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
