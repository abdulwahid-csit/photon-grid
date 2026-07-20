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
} from 'photon-grid-core';

import { ReactRendererAdapter, type PhotonGridColumnDef } from './react-renderer-adapter';

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
   *         model: 'gemini-2.5-flash',
   *       },
   *     },
   *   }}
   * />
   * ```
   */
  options?: Partial<GridOptions>;
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
}

export function PhotonGrid(props: PhotonGridProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<GridCore | null>(null);
  const rendererAdapterRef = useRef<ReactRendererAdapter | null>(null);
  const disposersRef = useRef<Array<() => void>>([]);

  const { columns = [], dataSet = [], options = {} } = props;

  useEffect(() => {
    if (!hostRef.current) {
      return;
    }

    const host = hostRef.current;
    const rendererAdapter = new ReactRendererAdapter();
    rendererAdapter.observe(host);

    rendererAdapterRef.current = rendererAdapter;

    const mergedOptions: GridOptions = {
      ...options,
      columns: rendererAdapter.adaptColumns(columns),
      data: dataSet,
    };

    const grid = new GridCore(host, mergedOptions);
    gridRef.current = grid;

    const disposers: Array<() => void> = [];
    const subscribe = <E extends keyof GridEventMap>(event: E, handler: ((payload: GridEventMap[E]) => void) | undefined) => {
      if (!handler) {
        return;
      }

      const dispose = grid.api.on<GridEventMap[E]>(event, (payload) => handler(payload));
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

  return <div ref={hostRef} className="photon-grid__host" />;
}

export default PhotonGrid;
