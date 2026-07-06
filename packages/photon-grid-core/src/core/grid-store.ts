import type { EventBus } from '../event-bus/event-bus';
import { GridEventType } from '../types/event.types';
import type { ColumnDef, ColumnState } from '../types/column.types';
import type { RowNode } from '../types/row.types';
import type { FilterModel, QuickFilterConfig } from '../types/filter.types';
import type { SortConfig, PaginationConfig, CellRange } from '../types/grid.types';

export interface GridStoreState {
  allRows: RowNode[];
  visibleRows: RowNode[];
  renderedRows: RowNode[];
  totalRowCount: number;

  columns: ColumnDef[];
  columnStates: Map<string, ColumnState>;
  pinnedLeftColumns: ColumnDef[];
  pinnedRightColumns: ColumnDef[];
  centerColumns: ColumnDef[];

  sortConfig: SortConfig[];
  filterModel: FilterModel;
  quickFilterConfig: QuickFilterConfig | null;
  filterActive: boolean;

  pagination: PaginationConfig;
  groupedColumnIds: string[];
  expandedGroupKeys: Set<string>;
  expandedRowIds: Set<string>;
  expandedTreeNodeIds: Set<string>;

  selectedRowIds: Set<string>;
  activeRowId: string | null;
  isAllSelected: boolean;
  isIndeterminate: boolean;

  cellRanges: CellRange[];
  activeCell: { rowIndex: number; colIndex: number } | null;

  loading: boolean;
  error: string | null;

  scrollTop: number;
  scrollLeft: number;
  viewportHeight: number;
  viewportWidth: number;
  firstRenderedRowIndex: number;
  lastRenderedRowIndex: number;

  fullScreen: boolean;
  editingCellId: string | null;
}

type Subscriber<K extends keyof GridStoreState> = (
  value: GridStoreState[K],
  prev: GridStoreState[K],
) => void;

export class GridStore {
  private state: GridStoreState;
  private subscribers = new Map<keyof GridStoreState, Set<Subscriber<keyof GridStoreState>>>();

  constructor(private eventBus: EventBus) {
    this.state = this.createInitialState();
  }

  get<K extends keyof GridStoreState>(key: K): GridStoreState[K] {
    return this.state[key];
  }

  set<K extends keyof GridStoreState>(key: K, value: GridStoreState[K]): void {
    const prev = this.state[key];
    if (prev === value) return;
    this.state[key] = value;
    this.notifySubscribers(key, value, prev);
  }

  update<K extends keyof GridStoreState>(
    key: K,
    updater: (current: GridStoreState[K]) => GridStoreState[K],
  ): void {
    this.set(key, updater(this.state[key]));
  }

  batch(updates: Partial<GridStoreState>): void {
    this.eventBus.pause();
    for (const [key, value] of Object.entries(updates)) {
      this.set(key as keyof GridStoreState, value as GridStoreState[keyof GridStoreState]);
    }
    this.eventBus.resume();
  }

  watch<K extends keyof GridStoreState>(key: K, subscriber: Subscriber<K>): () => void {
    let set = this.subscribers.get(key);
    if (!set) {
      set = new Set();
      this.subscribers.set(key, set);
    }
    set.add(subscriber as Subscriber<keyof GridStoreState>);
    return () => {
      const s = this.subscribers.get(key);
      s?.delete(subscriber as Subscriber<keyof GridStoreState>);
    };
  }

  snapshot(): Readonly<GridStoreState> {
    return Object.freeze({ ...this.state });
  }

  private notifySubscribers<K extends keyof GridStoreState>(
    key: K,
    value: GridStoreState[K],
    prev: GridStoreState[K],
  ): void {
    const set = this.subscribers.get(key);
    if (!set) return;
    for (const subscriber of set) {
      try {
        subscriber(value, prev);
      } catch (err) {
        console.error(`[PhotonGrid] GridStore subscriber error for "${String(key)}":`, err);
      }
    }
  }

  private createInitialState(): GridStoreState {
    return {
      allRows: [],
      visibleRows: [],
      renderedRows: [],
      totalRowCount: 0,

      columns: [],
      columnStates: new Map(),
      pinnedLeftColumns: [],
      pinnedRightColumns: [],
      centerColumns: [],

      sortConfig: [],
      filterModel: {},
      quickFilterConfig: null,
      filterActive: false,

      pagination: {
        enabled: false,
        page: 1,
        pageSize: 50,
        pageSizeOptions: [10, 25, 50, 100, 200],
        serverSide: false,
        totalRows: 0,
      },

      groupedColumnIds: [],
      expandedGroupKeys: new Set(),
      expandedRowIds: new Set(),
      expandedTreeNodeIds: new Set(),

      selectedRowIds: new Set(),
      activeRowId: null,
      isAllSelected: false,
      isIndeterminate: false,

      cellRanges: [],
      activeCell: null,

      loading: false,
      error: null,

      scrollTop: 0,
      scrollLeft: 0,
      viewportHeight: 0,
      viewportWidth: 0,
      firstRenderedRowIndex: 0,
      lastRenderedRowIndex: 0,

      fullScreen: false,
      editingCellId: null,
    };
  }

  destroy(): void {
    this.subscribers.clear();
  }
}
