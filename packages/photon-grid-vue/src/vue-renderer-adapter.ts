import { createApp, h, reactive, type App, type Component } from 'vue';

import type {
  DetailComponent,
  DetailComponentConstructor,
  DetailContext,
  DetailRenderer,
  GridOptions,
  MasterDetailConfig,
} from 'photon-grid-core';

/**
 * `masterDetail.renderer` as accepted by the Vue wrapper: a Vue component
 * passed directly, or anything the core already accepts (a `DetailComponent`
 * class, a `(ctx) => HTMLElement | string` function, a static HTML string).
 *
 * ```ts
 * renderer: OrderDetail                                  // a Vue component
 * renderer: (ctx) => `<h2>${ctx.data.account}</h2>`      // core: HTML from a function
 * renderer: '<h2>Details</h2>'                           // core: a static HTML string
 * ```
 *
 * Options-API and `defineComponent` components are plain objects, so they are
 * detected without ceremony. A **functional** Vue component is a bare function
 * and is indistinguishable from a core function renderer — wrap that one
 * explicitly with {@link createVueDetailRenderer}.
 */
export type VueDetailRenderer = Component | DetailRenderer;

/** Core `MasterDetailConfig` with `renderer` widened to the Vue forms above. */
export type VueMasterDetailConfig = Omit<MasterDetailConfig, 'renderer'> & {
  renderer?: VueDetailRenderer;
};

/**
 * Core `GridOptions` with `masterDetail.renderer` widened to accept Vue
 * components. Assignment-compatible with the core type, so an existing
 * `GridOptions` object passes through unchanged.
 */
export type PhotonGridOptions = Omit<GridOptions, 'masterDetail'> & {
  masterDetail?: VueMasterDetailConfig;
};

/** Props every detail component receives. Anything else comes from `masterDetail.props`, delivered as the `props` prop. */
function detailProps(ctx: DetailContext): Record<string, unknown> {
  return { ctx, data: ctx.data, props: ctx.props, api: ctx.api, rowNode: ctx.rowNode };
}

/**
 * Wraps a Vue component in a core `DetailComponent` class.
 *
 * A class (rather than a `(ctx) => HTMLElement` function) because only the
 * class form gets `destroy()` — a Vue app that is merely detached from the DOM
 * is never unmounted, so its watchers and lifecycle hooks would outlive the
 * collapsed row.
 *
 * Each expanded row gets its own app instance mounted into `ctx.containerEl`,
 * driven by a `reactive` prop bag. `refresh` mutates that bag and returns
 * `true`, so Vue re-renders the existing component tree rather than the core
 * tearing it down and rebuilding it.
 *
 * Exported for the one case the bare form cannot express: a functional Vue
 * component, which is indistinguishable from a core function renderer.
 * `renderer: createVueDetailRenderer(myDetail)` settles it.
 */
export function createVueDetailRenderer(component: Component): DetailComponentConstructor {
  return class VueDetailRendererAdapter implements DetailComponent {
    private app?: App;
    private state?: Record<string, unknown>;

    init(ctx: DetailContext): void {
      const state = reactive<Record<string, unknown>>(detailProps(ctx));
      this.state = state;

      // The render function reads `state` during render, so Vue tracks it and
      // re-renders on any mutation `refresh` makes.
      this.app = createApp({ render: () => h(component, { ...state }) });
      this.app.mount(ctx.containerEl);
    }

    refresh(ctx: DetailContext): boolean {
      if (!this.state) {
        return false;
      }
      Object.assign(this.state, detailProps(ctx));
      return true;
    }

    destroy(): void {
      this.app?.unmount();
      this.app = undefined;
      this.state = undefined;
    }
  };
}

/**
 * Resolves a {@link VueDetailRenderer} to a core `DetailRenderer`. Core forms
 * — a `DetailComponent` class, a function, an HTML string — pass straight
 * through; the wrapper only adds the Vue form.
 */
export function adaptVueDetailRenderer(renderer: VueDetailRenderer): DetailRenderer {
  // Every non-functional Vue component is a plain object, and nothing the core
  // accepts is, so this one check is unambiguous.
  if (typeof renderer === 'object' && renderer !== null) {
    return createVueDetailRenderer(renderer as Component);
  }

  return renderer as DetailRenderer;
}

/**
 * Converts Vue-flavoured grid options into what the core accepts. Returns the
 * original object untouched when there is nothing Vue to adapt, so the common
 * case allocates nothing.
 */
export function adaptVueOptions(options: Partial<PhotonGridOptions>): Partial<GridOptions> {
  const masterDetail = options.masterDetail;
  if (!masterDetail?.renderer) {
    return options as Partial<GridOptions>;
  }

  return {
    ...options,
    masterDetail: {
      ...masterDetail,
      renderer: adaptVueDetailRenderer(masterDetail.renderer),
    },
  } as Partial<GridOptions>;
}
