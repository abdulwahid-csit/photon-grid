import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type PropType,
} from 'vue';
import { GridCore, GridEventType } from 'photon-grid-core';
import type { ColumnDefInput, GridApi, GridOptions } from 'photon-grid-core';

import { adaptVueOptions, type PhotonGridOptions } from './vue-renderer-adapter';

/**
 * Maps a core grid event to the Vue event this component emits. Kept as a flat
 * table so the wrapper stays declarative and easy to extend.
 */
const EVENT_MAP: ReadonlyArray<readonly [event: string, emit: string]> = [
  [GridEventType.DATA_CHANGED, 'dataChanged'],
  [GridEventType.ROW_CLICKED, 'rowClicked'],
  [GridEventType.ROW_DOUBLE_CLICKED, 'rowDoubleClicked'],
  [GridEventType.ROW_SELECTED, 'rowSelected'],
  [GridEventType.CELL_CLICKED, 'cellClicked'],
  [GridEventType.CELL_DOUBLE_CLICKED, 'cellDoubleClicked'],
  [GridEventType.CELL_VALUE_CHANGED, 'cellValueChanged'],
  [GridEventType.CELL_SELECTION_CHANGED, 'cellSelectionChanged'],
  [GridEventType.COLUMN_RESIZED, 'columnResized'],
  [GridEventType.COLUMN_MOVED, 'columnMoved'],
  [GridEventType.SORT_CHANGED, 'sortChanged'],
  [GridEventType.FILTER_CHANGED, 'filterChanged'],
  [GridEventType.PAGE_CHANGED, 'pageChanged'],
  [GridEventType.COLUMNS_STATE_CHANGED, 'columnsStateChanged'],
  [GridEventType.THEME_CHANGED, 'themeChanged'],
  [GridEventType.EXPORT_COMPLETE, 'exportComplete'],
  // Both transitions feed one emit: the payload's `loading` flag is what a host
  // switches on, so two events would only duplicate it.
  [GridEventType.LOADING_STARTED, 'loadingChanged'],
  [GridEventType.LOADING_STOPPED, 'loadingChanged'],
];

/**
 * Vue 3 wrapper around the framework-agnostic {@link GridCore}. Renders a single
 * host element, instantiates the grid on mount, forwards the grid's typed events
 * as Vue emits, and disposes everything on unmount. All business logic lives in
 * Photon Core — this component only binds it to Vue's lifecycle.
 *
 * @example
 * ```vue
 * <PhotonGrid :columns="columns" :dataSet="rows" :options="{ theme: 'light' }"
 *             @gridReady="onReady" @rowClicked="onRow" />
 * ```
 */
export const PhotonGrid = defineComponent({
  name: 'PhotonGrid',
  props: {
    /**
     * Column definitions. Only `field` is required per column — `colId`,
     * `header` and `type` are optional and defaulted by the core (auto `colId`,
     * header from the field in Title Case, `type` defaulting to `'string'`).
     */
    columns: { type: Array as PropType<ColumnDefInput[]>, default: () => [] },
    /** Row data. */
    dataSet: { type: Array as PropType<Record<string, unknown>[]>, default: () => [] },
    /**
     * Additional grid options (theme, selection, features…), forwarded to the
     * core. Enable the natural-language AI panel — and, optionally, its Gemini
     * generative back-end — through `options.photonAI`:
     *
     * @example Gemini-powered AI panel
     * ```ts
     * import { PhotonAIProviderType } from 'photon-grid-vue';
     *
     * const options = {
     *   photonAI: {
     *     enabled: true,
     *     provider: {
     *       type: PhotonAIProviderType.Gemini,
     *       apiKey: import.meta.env.VITE_GEMINI_API_KEY,
     *       model: 'gemini-flash-latest',
     *     },
     *   },
     * };
     * ```
     *
     * A Master/Detail row may be rendered by a Vue component through
     * `options.masterDetail.renderer` — see {@link PhotonGridOptions}:
     *
     * @example Vue component as a Master/Detail renderer
     * ```ts
     * const options = {
     *   masterDetail: {
     *     enabled: true,
     *     renderer: OrderDetail,                       // any Vue component
     *     props: (ctx) => ({ orders: ctx.detailData ?? [] }),
     *     events: { save: (e) => persist(e.payload) },
     *   },
     * };
     * ```
     */
    options: { type: Object as PropType<Partial<PhotonGridOptions>>, default: () => ({}) },
    /**
     * Whether the grid shows its loading indicator.
     *
     * A dedicated prop rather than an `options` field, because an `options`
     * change rebuilds the grid — this routes to `GridApi.setLoading` instead,
     * so toggling it is a repaint, not a rebuild, and grid state (scroll
     * position, selection, column layout) survives untouched.
     *
     * Configure the indicator's appearance — spinner (default) or skeleton
     * placeholder rows — through `options.loadingOverlay`.
     *
     * @example
     * ```vue
     * <PhotonGrid
     *   :loading="isLoading"
     *   :options="{ loadingOverlay: { indicator: LoadingIndicator.Skeleton } }" />
     * ```
     */
    loading: { type: Boolean, default: false },
  },
  emits: [
    'gridReady',
    'dataChanged',
    'rowClicked',
    'rowDoubleClicked',
    'rowSelected',
    'cellClicked',
    'cellDoubleClicked',
    'cellValueChanged',
    'cellSelectionChanged',
    'columnResized',
    'columnMoved',
    'sortChanged',
    'filterChanged',
    'pageChanged',
    'columnsStateChanged',
    'themeChanged',
    'exportComplete',
    'loadingChanged',
  ],
  setup(props, { emit }) {
    const host = ref<HTMLDivElement | null>(null);
    const grid = shallowRef<GridCore | null>(null);
    let disposers: Array<() => void> = [];

    const teardown = (): void => {
      for (const dispose of disposers) dispose();
      disposers = [];
      grid.value?.destroy();
      grid.value = null;
    };

    const build = (): void => {
      if (!host.value) return;
      const merged = {
        ...adaptVueOptions(props.options ?? {}),
        columns: props.columns ?? [],
        data: props.dataSet ?? [],
        // Seeded rather than applied after construction, so a grid built with
        // `:loading="true"` paints its overlay on the first frame instead of
        // flashing an empty body. Also resyncs after a rebuild.
        loading: props.loading,
      } as GridOptions;

      const instance = new GridCore(host.value, merged);
      grid.value = instance;

      // `emit` is typed to the literal event union; the table drives it dynamically.
      const raise = emit as (event: string, payload?: unknown) => void;
      for (const [event, name] of EVENT_MAP) {
        disposers.push(instance.api.on(event as GridEventType, (payload: unknown) => raise(name, payload)));
      }

      raise('gridReady', instance.api as GridApi);
    };

    onMounted(build);
    onBeforeUnmount(teardown);

    // Rebuild when inputs change (reference-based, mirroring the React wrapper).
    watch(
      () => [props.columns, props.dataSet, props.options],
      () => {
        teardown();
        build();
      },
    );

    // Loading is watched on its own, deliberately outside the rebuild watcher
    // above: including it there would tear the grid down on every toggle and
    // lose scroll position, selection and column layout. `build()` seeds the
    // current value, so this only ever handles subsequent changes.
    watch(
      () => props.loading,
      (value) => grid.value?.api.setLoading(value),
    );

    return () => h('div', { ref: host, class: 'photon-grid__host' });
  },
});

export default PhotonGrid;
