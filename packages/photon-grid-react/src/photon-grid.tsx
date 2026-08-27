import { useEffect, useRef, type JSX } from 'react';

import { GridCore, GridEventType } from 'photon-grid-core';
import type {
  CellClickedEvent,
  CellSelectionChangedEvent,
  CellValueChangedEvent,
  ColumnMovedEvent,
  ColumnResizedEvent,
  ColumnsStateChangedEvent,
  ColumnSortedEvent,
  DataChangedEvent,
  ExportEvent,
  FilterChangedEvent,
  GridApi,
  GridEventMap,
  GridOptions,
  PageChangedEvent,
  RowClickPayload,
  RowSelectedEvent,
  ThemeChangedEvent,
  LoadingChangedEvent,
} from 'photon-grid-core';

import { ReactRendererAdapter, type PhotonGridColumnDef, type PhotonGridOptions } from './react-renderer-adapter';

export interface PhotonGridProps {
  columns?: PhotonGridColumnDef[];
  dataSet?: Record<string, unknown>[];
  /**
   * Additional grid options (theme, selection, features…), forwarded verbatim
   * to the core. Enable the natural-language AI panel — and, optionally, its
   * Gemini generative back-end — through `options.photonAI`:
   *
   * @example Deterministic (offline) AI panel
   * ```tsx
   * <PhotonGrid options={{ photonAI: { enabled: true } }} />
   * ```
   *
   * @example Gemini-powered AI panel
   * ```tsx
   * import { PhotonAIProviderType } from 'photon-grid-react';
   *
   * <PhotonGrid
   *   options={{
   *     photonAI: {
   *       enabled: true,
   *       defaultOpen: true,
   *       provider: {
   *         type: PhotonAIProviderType.Gemini,
   *         apiKey: import.meta.env.VITE_GEMINI_API_KEY,
   *         model: 'gemini-flash-latest',
   *       },
   *     },
   *   }}
   * />
   * ```
   * @example React component as a Master/Detail renderer
   * ```tsx
   * const OrderDetail = ({ data, ctx }) => (
   *   <button onClick={() => ctx.emit('save', data)}>Save {data.account}</button>
   * );
   *
   * <PhotonGrid options={{ masterDetail: { enabled: true, renderer: OrderDetail } }} />
   * ```
   */
  options?: Partial<PhotonGridOptions>;
  /**
   * Whether the grid shows its loading indicator.
   *
   * A dedicated prop rather than an `options` field, because a new `options`
   * object identity recreates the grid — this routes to `GridApi.setLoading`
   * instead, so toggling it is a repaint, not a rebuild, and grid state
   * (scroll position, selection, column layout) survives untouched.
   *
   * Configure the indicator's appearance — spinner (default) or skeleton
   * placeholder rows — through `options.loadingOverlay`.
   *
   * @example
   * ```tsx
   * <PhotonGrid
   *   loading={isLoading}
   *   options={{ loadingOverlay: { indicator: LoadingIndicator.Skeleton } }}
   * />
   * ```
   */
  loading?: boolean;
  onGridReady?: (api: GridApi) => void;
  onDataChanged?: (event: DataChangedEvent) => void;
  onRowClicked?: (payload: RowClickPayload) => void;
  onRowDoubleClicked?: (payload: RowClickPayload) => void;
  onRowSelected?: (event: RowSelectedEvent) => void;
  onCellClicked?: (event: CellClickedEvent) => void;
  onCellDoubleClicked?: (event: CellClickedEvent) => void;
  onCellValueChanged?: (event: CellValueChangedEvent) => void;
  onCellSelectionChanged?: (event: CellSelectionChangedEvent) => void;
  onColumnResized?: (event: ColumnResizedEvent) => void;
  onColumnMoved?: (event: ColumnMovedEvent) => void;
  onSortChanged?: (event: ColumnSortedEvent) => void;
  onFilterChanged?: (event: FilterChangedEvent) => void;
  onPageChanged?: (event: PageChangedEvent) => void;
  onColumnsStateChanged?: (event: ColumnsStateChangedEvent) => void;
  onThemeChanged?: (event: ThemeChangedEvent) => void;
  onExportComplete?: (event: ExportEvent) => void;
  /**
   * The loading state changed — fired once per transition, whether it came from
   * the `loading` prop, `GridApi.setLoading`, or a server-backed row model
   * fetching in the background.
   */
  onLoadingChanged?: (event: LoadingChangedEvent) => void;
}

export function PhotonGrid(props: PhotonGridProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<GridCore | null>(null);
  const rendererAdapterRef = useRef<ReactRendererAdapter | null>(null);
  const disposersRef = useRef<Array<() => void>>([]);

  const { columns = [], dataSet = [], options = {}, loading = false } = props;

  /**
   * The `loading` value the live grid was built with. The build effect seeds it
   * into the core's options, so the sync effect below must not re-apply it on
   * the same pass — and after a rebuild it must resync, because the new core
   * starts from the seeded value rather than from whatever the old one held.
   */
  const seededLoadingRef = useRef<boolean>(loading);

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const host = hostRef.current;
    const rendererAdapter = new ReactRendererAdapter();
    rendererAdapter.observe(host);

    rendererAdapterRef.current = rendererAdapter;

    const mergedOptions: GridOptions = {
      ...rendererAdapter.adaptOptions(options),
      columns: rendererAdapter.adaptColumns(columns),
      data: dataSet,
      // Seeded rather than applied after construction, so a grid created with
      // `loading` already true paints its overlay on the first frame instead of
      // flashing an empty body.
      loading,
    } as GridOptions;
    seededLoadingRef.current = loading;

    const grid = new GridCore(host, mergedOptions);
    gridRef.current = grid;

    const disposers: Array<() => void> = [];
    const subscribe = <E extends keyof GridEventMap>(event: E, handler: ((payload: GridEventMap[E]) => void) | undefined) => {
      if (!handler) {
        return;
      }

      const dispose = grid.api.on<GridEventMap[E]>(event, (payload: GridEventMap[E]) => handler(payload));
      disposers.push(dispose);
    };

    subscribe(GridEventType.DATA_CHANGED, props.onDataChanged);
    subscribe(GridEventType.ROW_CLICKED, props.onRowClicked);
    subscribe(GridEventType.ROW_DOUBLE_CLICKED, props.onRowDoubleClicked);
    subscribe(GridEventType.ROW_SELECTED, props.onRowSelected);
    subscribe(GridEventType.CELL_CLICKED, props.onCellClicked);
    subscribe(GridEventType.CELL_DOUBLE_CLICKED, props.onCellDoubleClicked);
    subscribe(GridEventType.CELL_VALUE_CHANGED, props.onCellValueChanged);
    subscribe(GridEventType.CELL_SELECTION_CHANGED, props.onCellSelectionChanged);
    subscribe(GridEventType.COLUMN_RESIZED, props.onColumnResized);
    subscribe(GridEventType.COLUMN_MOVED, props.onColumnMoved);
    subscribe(GridEventType.SORT_CHANGED, props.onSortChanged);
    subscribe(GridEventType.FILTER_CHANGED, props.onFilterChanged);
    subscribe(GridEventType.PAGE_CHANGED, props.onPageChanged);
    subscribe(GridEventType.COLUMNS_STATE_CHANGED, props.onColumnsStateChanged);
    subscribe(GridEventType.THEME_CHANGED, props.onThemeChanged);
    subscribe(GridEventType.EXPORT_COMPLETE, props.onExportComplete);
    // Both transitions feed one callback: the payload's `loading` flag is what
    // a host switches on, so two props would only duplicate it.
    subscribe(GridEventType.LOADING_STARTED, props.onLoadingChanged);
    subscribe(GridEventType.LOADING_STOPPED, props.onLoadingChanged);

    disposersRef.current = disposers;
    props.onGridReady?.(grid.api);

    return () => {
      for (const dispose of disposersRef.current) {
        dispose();
      }
      disposersRef.current = [];

      gridRef.current?.destroy();
      gridRef.current = null;

      rendererAdapterRef.current?.dispose();
      rendererAdapterRef.current = null;
    };
  }, [columns, dataSet, options]);

  /**
   * Loading is synced on its own, deliberately outside the build effect's
   * dependency list: adding it there would tear the grid down and rebuild it on
   * every toggle, losing scroll position, selection and column layout.
   *
   * The guard makes this a no-op when the build effect just seeded the same
   * value into a freshly constructed core, so a rebuild never redundantly
   * writes the flag.
   */
  useEffect(() => {
    if (seededLoadingRef.current === loading) {
      return;
    }
    seededLoadingRef.current = loading;
    gridRef.current?.api.setLoading(loading);
  }, [loading]);

  useEffect(() => {
    return () => {
      for (const dispose of disposersRef.current) {
        dispose();
      }
      disposersRef.current = [];

      gridRef.current?.destroy();
      gridRef.current = null;

      rendererAdapterRef.current?.dispose();
      rendererAdapterRef.current = null;
    };
  }, []);

  return <div style={{height: '100%', width: '100%'}} ref={hostRef} className="photon-grid__host" />;
}

export default PhotonGrid;
