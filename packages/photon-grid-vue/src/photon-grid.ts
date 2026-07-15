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
    /** Additional grid options (theme, selection, features…). */
    options: { type: Object as PropType<Partial<GridOptions>>, default: () => ({}) },
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
        ...(props.options ?? {}),
        columns: props.columns ?? [],
        data: props.dataSet ?? [],
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

    return () => h('div', { ref: host, class: 'photon-grid__host' });
  },
});

export default PhotonGrid;
