export class GridStore {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.subscribers = new Map();
        this.state = this.createInitialState();
    }
    get(key) {
        return this.state[key];
    }
    set(key, value) {
        const prev = this.state[key];
        if (prev === value)
            return;
        this.state[key] = value;
        this.notifySubscribers(key, value, prev);
    }
    update(key, updater) {
        this.set(key, updater(this.state[key]));
    }
    batch(updates) {
        this.eventBus.pause();
        for (const [key, value] of Object.entries(updates)) {
            this.set(key, value);
        }
        this.eventBus.resume();
    }
    watch(key, subscriber) {
        let set = this.subscribers.get(key);
        if (!set) {
            set = new Set();
            this.subscribers.set(key, set);
        }
        set.add(subscriber);
        return () => {
            const s = this.subscribers.get(key);
            s?.delete(subscriber);
        };
    }
    snapshot() {
        return Object.freeze({ ...this.state });
    }
    notifySubscribers(key, value, prev) {
        const set = this.subscribers.get(key);
        if (!set)
            return;
        for (const subscriber of set) {
            try {
                subscriber(value, prev);
            }
            catch (err) {
                console.error(`[PhotonGrid] GridStore subscriber error for "${String(key)}":`, err);
            }
        }
    }
    createInitialState() {
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
    destroy() {
        this.subscribers.clear();
    }
}
//# sourceMappingURL=grid-store.js.map