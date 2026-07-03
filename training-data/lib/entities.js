'use strict';

/**
 * Entity type registry and value pools for the Photon AI training-data
 * generator. Every canonical intent in `intents.js` references one or more
 * of these entity *types* by name (e.g. `columnName`, `filterOperator`); this
 * module is the single source of truth for what values each type can take,
 * so the generator and the dataset consumer agree on vocabulary.
 *
 * `ENTITY_TYPES` is intentionally flat and enumerable (`Object.keys(...)`)
 * so `generate-dataset.js` can assert "100+ entity types" at generation time
 * instead of that number silently drifting out of sync with the README.
 */

/** Column names drawn from multiple business domains so utterances don't all sound like the same demo. */
const COLUMN_NAMES = [
  // generic / retail
  'Product Name', 'Price', 'Quantity', 'Status', 'Category', 'Discount', 'Total', 'Tax', 'SKU', 'Warehouse',
  // HR
  'Employee Name', 'Department', 'Salary', 'Hire Date', 'Manager', 'Job Title', 'Location', 'Performance Score',
  // finance
  'Revenue', 'Profit Margin', 'Account Number', 'Transaction Date', 'Balance', 'Currency', 'Region', 'Budget',
  // CRM
  'Customer Name', 'Email', 'Phone', 'Lead Source', 'Deal Stage', 'Renewal Date', 'Contract Value',
  // music/inventory (matches demo.ts)
  'Album Name', 'Artist', 'Year', 'Inventory', 'Incoming', 'Sold', 'Est. Profit', 'Genre',
  // misc
  'ID', 'Rating', 'Priority', 'Due Date', 'Country', 'City', 'Age', 'Gender',
];

const COLUMN_IDS = COLUMN_NAMES.map(toColId);
function toColId(header) {
  return header
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join('');
}

const FILTER_OPERATORS = [
  'equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith',
  'greaterThan', 'greaterThanOrEqual', 'lessThan', 'lessThanOrEqual', 'inRange', 'blank', 'notBlank',
];

const COMPARISON_OPERATOR_PHRASES = {
  equals: ['equals', 'is', 'is equal to', '='],
  notEquals: ["doesn't equal", 'is not', 'is not equal to', '!='],
  contains: ['contains', 'includes', 'has'],
  notContains: ["doesn't contain", 'does not include', 'excludes'],
  startsWith: ['starts with', 'begins with'],
  endsWith: ['ends with', 'finishes with'],
  greaterThan: ['greater than', 'more than', 'above', 'over', '>'],
  greaterThanOrEqual: ['greater than or equal to', 'at least', '>='],
  lessThan: ['less than', 'below', 'under', '<'],
  lessThanOrEqual: ['less than or equal to', 'at most', '<='],
  inRange: ['between', 'in the range of'],
  blank: ['is blank', 'is empty', 'has no value'],
  notBlank: ['is not blank', 'is not empty', 'has a value'],
};

const LOGICAL_OPERATORS = ['and', 'or'];
const SORT_DIRECTIONS = ['asc', 'desc'];
const PIN_SIDES = ['left', 'right', null];
const AGGREGATION_FUNCTIONS = ['sum', 'avg', 'min', 'max', 'count', 'median', 'stddev', 'first', 'last'];
const CHART_TYPES = ['bar', 'line', 'pie', 'scatter', 'area', 'donut', 'column', 'combo'];
const EXPORT_FORMATS = ['csv', 'excel', 'pdf', 'json', 'tsv'];
const EXPORT_RANGES = ['all', 'selected', 'filtered', 'visible'];
const CLIPBOARD_ACTIONS = ['copy', 'cut', 'paste'];
const CLIPBOARD_FORMATS = ['csv', 'tsv', 'html'];
const THEME_NAMES = ['light', 'dark', 'compact', 'high-contrast', 'classic', 'material'];
const LAYOUT_NAMES = ['compact', 'comfortable', 'spacious', 'default'];
const KEYBOARD_SHORTCUTS = ['Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Z', 'Ctrl+Y', 'Ctrl+A', 'Delete', 'Tab', 'Enter', 'Escape', 'Arrow keys', 'Ctrl+Shift+Z'];
const KEYBOARD_MODIFIERS = ['Ctrl', 'Shift', 'Alt', 'Meta'];
const MOUSE_ACTIONS = ['single click', 'double click', 'right click', 'drag', 'hover', 'scroll'];
const MENU_ITEM_LABELS = ['Copy', 'Paste', 'Export', 'Autosize', 'Pin Column', 'Hide Column', 'Reset Columns'];
const TOOL_PANEL_NAMES = ['Columns', 'Filters', 'Charts', 'Pivot'];
const STATUS_BAR_SEGMENTS = ['row count', 'selection summary', 'aggregation summary', 'filtered row count'];
const CONTEXT_MENU_ITEMS = ['Copy', 'Copy with Headers', 'Export CSV', 'Autosize Columns', 'Reset Columns'];
const AI_COMMAND_VERBS = ['sort', 'filter', 'group', 'pin', 'hide', 'show', 'move', 'select', 'export', 'chart'];
const API_METHOD_NAMES = ['getColumn', 'setColumnFilter', 'getAllRows', 'exportDataAsCsv', 'getGridState', 'setGridState'];
const STATE_KEY_NAMES = ['columnState', 'filterModel', 'sortModel', 'groupState', 'pivotState', 'selectionState'];
const PERFORMANCE_METRICS = ['render time', 'scroll FPS', 'memory usage', 'row buffer size', 'reflow count'];
const ACCESSIBILITY_FEATURES = ['screen reader mode', 'high contrast', 'larger font size', 'keyboard-only navigation', 'ARIA live announcements'];
const ERROR_MESSAGES = ["column isn't sortable", "filter didn't apply", 'data failed to load', 'grid appears frozen', 'export failed', 'chart failed to render', 'grouping did nothing'];
const BOOLEAN_FLAGS = ['true', 'false', 'on', 'off', 'enabled', 'disabled'];
const CURRENCY_CODES = ['USD', 'EUR', 'GBP', 'PKR', 'JPY'];
const LOCALE_NAMES = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ur-PK'];
const DATE_FORMATS = ['MM/DD/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD'];
const NUMBER_FORMATS = ['1,000.00', '1.000,00', '1 000.00'];
const CELL_FORMATS = ['currency', 'percentage', 'date', 'plain text', 'number'];
const RENDER_MODES = ['dom', 'canvas'];
const ROW_SELECTION_MODES = ['single', 'multiple', 'none'];
const CELL_SELECTION_MODES = ['single cell', 'range', 'multiple ranges'];
const DRAG_MODES = ['reorder columns', 'resize columns', 'row drag', 'fill handle'];
const UNDO_REDO_DIRECTIONS = ['undo', 'redo'];
const GRID_EVENT_NAMES = ['rowClicked', 'cellValueChanged', 'columnSorted', 'columnFiltered', 'selectionChanged'];
const COLUMN_POSITIONS = ['start', 'end', 'index 0', 'index 3', 'before Price', 'after Status'];
const FONT_SIZES = ['12px', '14px', '16px', '18px'];
const FONT_WEIGHTS = ['normal', 'bold', '600'];
const BORDER_STYLES = ['solid', 'dashed', 'none'];
const ICON_NAMES = ['sparkle', 'filter', 'sort-asc', 'sort-desc', 'pin', 'close'];
const VALIDATION_RULES = ['required', 'min 0', 'max 100', 'email format', 'numeric only'];
const GROUP_AGGREGATION_TYPES = ['sum', 'avg', 'count'];
const CHART_AXIS_NAMES = ['x-axis', 'y-axis', 'category axis', 'value axis'];
const CHART_LEGEND_POSITIONS = ['top', 'bottom', 'left', 'right'];
const ROW_PIN_POSITIONS = ['top', 'bottom'];
const PAGE_SIZES = ['10', '25', '50', '100', '200'];
const TREE_FIELD_NAMES = ['orgChart', 'categoryPath', 'folderPath'];
const CHART_COLOR_PALETTES = ['default', 'pastel', 'vivid', 'monochrome', 'colorblind-safe'];
const PRINT_ORIENTATIONS = ['portrait', 'landscape'];
const SIDEBAR_POSITIONS = ['left', 'right'];
const ROW_HEIGHTS = ['32px', '40px', '48px', '56px'];
const COLUMN_WIDTHS = ['80px', '120px', '160px', '200px', '240px'];
const COLORS = ['red', 'green', 'blue', 'orange', 'purple', 'teal', 'amber', '#2563eb', '#16a34a', '#dc2626'];
const PERCENTAGES = ['10%', '25%', '50%', '75%', '100%'];
const NUMBERS = ['1', '2', '5', '10', '25', '50', '100', '1000'];
const CURRENCY_AMOUNTS = ['$50', '$100', '$1,000', '€250', '£75'];
const DATE_VALUES = ['2024-01-01', '2024-06-15', '01/15/2024', 'last Monday', 'yesterday', 'next quarter'];
const TIME_VALUES = ['9:00 AM', '17:30', 'noon', 'midnight'];
const TEXT_VALUES = ['Acme Corp', 'North Region', 'Pending Review', 'John Doe', 'Widget Pro'];
const ROW_IDS = ['row-12', 'row-45', 'id_301', '#7'];
const ROW_INDICES = ['1', '2', '5', '10', '25'];
const CELL_RANGES = ['A1:C5', 'Price:Total rows 1-10', 'the first 5 rows of Price'];
const DATA_SOURCE_NAMES = ['inventory.csv', 'employees.json', 'sales-2024.xlsx', 'REST API'];
const API_ENDPOINTS = ['/api/rows', '/api/columns', '/api/export'];
const COLUMN_ALIASES = ['Amt', 'Qty', 'Emp'];
const FILTER_DEBOUNCE_VALUES = ['200ms', '300ms', '500ms'];
const QUICK_FILTER_TEXTS = ['active', 'pending', 'north'];
const COLUMN_MENU_TABS = ['General', 'Filter', 'Columns'];
const ZOOM_LEVELS = ['90%', '100%', '110%', '125%'];
const ANIMATION_SPEEDS = ['fast', 'normal', 'slow', 'off'];
const CACHE_SIZES = ['100 rows', '1000 rows', '10000 rows'];
const BATCH_SIZES = ['50', '100', '500'];
const WORKER_THREAD_COUNTS = ['1', '2', '4'];
const MEMORY_LIMITS = ['256MB', '512MB', '1GB'];
const SCROLL_POSITIONS = ['top', 'bottom', 'row 500'];
const STICKY_COLUMN_COUNTS = ['1', '2', '3'];
const CONTRAST_MODES = ['normal', 'high'];
const FOCUS_TARGETS = ['cell', 'row', 'header'];
const ARIA_ROLES = ['grid', 'row', 'gridcell', 'columnheader'];
const DEBOUNCE_MS = ['100ms', '250ms', '400ms'];
const THROTTLE_MS = ['16ms', '32ms', '50ms'];

/**
 * The dataset's full entity-type registry. Each key is an entity *type*
 * name referenced from `intents.js` slot definitions; each value is the
 * pool of example values the generator samples from when filling a slot of
 * that type. Kept as one flat map (rather than nested namespaces) so
 * `Object.keys(ENTITY_TYPES).length` is a direct, honest count of how many
 * distinct entity types the dataset covers.
 */
const ENTITY_TYPES = {
  columnName: COLUMN_NAMES,
  columnId: COLUMN_IDS,
  filterOperator: FILTER_OPERATORS,
  comparisonOperatorPhrase: Object.values(COMPARISON_OPERATOR_PHRASES).flat(),
  logicalOperator: LOGICAL_OPERATORS,
  sortDirection: SORT_DIRECTIONS,
  pinSide: PIN_SIDES.filter(Boolean),
  aggregationFunction: AGGREGATION_FUNCTIONS,
  chartType: CHART_TYPES,
  chartSeriesName: ['Revenue', 'Units Sold', 'Profit', 'Headcount'],
  chartTitle: ['Q1 Sales', 'Revenue by Region', 'Inventory Levels'],
  chartAxisName: CHART_AXIS_NAMES,
  chartLegendPosition: CHART_LEGEND_POSITIONS,
  chartColorPalette: CHART_COLOR_PALETTES,
  exportFormat: EXPORT_FORMATS,
  exportFileName: ['report', 'grid-export', 'data-2024'],
  exportRange: EXPORT_RANGES,
  printOrientation: PRINT_ORIENTATIONS,
  printMarginSize: ['narrow', 'normal', 'wide'],
  clipboardAction: CLIPBOARD_ACTIONS,
  clipboardFormat: CLIPBOARD_FORMATS,
  groupField: COLUMN_NAMES,
  pivotRowField: COLUMN_NAMES,
  pivotColumnField: COLUMN_NAMES,
  pivotValueField: ['Price', 'Quantity', 'Revenue', 'Sold'],
  editorType: ['text', 'number', 'dropdown', 'date', 'checkbox'],
  rendererType: ['badge', 'progress bar', 'link', 'image', 'currency'],
  virtualizationBufferSize: ['5', '10', '20'],
  pageSize: PAGE_SIZES,
  pageNumber: ['1', '2', '3', 'last'],
  themeName: THEME_NAMES,
  layoutName: LAYOUT_NAMES,
  keyboardShortcut: KEYBOARD_SHORTCUTS,
  keyboardModifier: KEYBOARD_MODIFIERS,
  mouseAction: MOUSE_ACTIONS,
  menuItemLabel: MENU_ITEM_LABELS,
  toolPanelName: TOOL_PANEL_NAMES,
  statusBarSegment: STATUS_BAR_SEGMENTS,
  aiCommandVerb: AI_COMMAND_VERBS,
  apiMethodName: API_METHOD_NAMES,
  stateKeyName: STATE_KEY_NAMES,
  performanceMetric: PERFORMANCE_METRICS,
  accessibilityFeature: ACCESSIBILITY_FEATURES,
  errorMessage: ERROR_MESSAGES,
  booleanFlag: BOOLEAN_FLAGS,
  percentage: PERCENTAGES,
  currencyAmount: CURRENCY_AMOUNTS,
  currencyCode: CURRENCY_CODES,
  localeName: LOCALE_NAMES,
  dateFormatPattern: DATE_FORMATS,
  numberFormatPattern: NUMBER_FORMATS,
  dateValue: DATE_VALUES,
  timeValue: TIME_VALUES,
  numberValue: NUMBERS,
  textValue: TEXT_VALUES,
  comparisonOperator: FILTER_OPERATORS,
  columnDataType: ['string', 'number', 'date', 'boolean', 'dropdown', 'currency', 'percentage'],
  columnGroupName: ['Contact Info', 'Financials', 'Inventory Details'],
  treeNodeLevel: ['0', '1', '2', '3'],
  treeFieldName: TREE_FIELD_NAMES,
  rowSelectionMode: ROW_SELECTION_MODES,
  cellSelectionMode: CELL_SELECTION_MODES,
  dragMode: DRAG_MODES,
  contextMenuItem: CONTEXT_MENU_ITEMS,
  undoRedoDirection: UNDO_REDO_DIRECTIONS,
  gridEventName: GRID_EVENT_NAMES,
  columnPosition: COLUMN_POSITIONS,
  fontSize: FONT_SIZES,
  fontWeight: FONT_WEIGHTS,
  borderStyle: BORDER_STYLES,
  iconName: ICON_NAMES,
  tooltipText: ['Click to edit', 'Read-only field', 'Required'],
  validationRule: VALIDATION_RULES,
  summaryLabel: ['Total', 'Average', 'Count'],
  groupAggregationType: GROUP_AGGREGATION_TYPES,
  rowPinPosition: ROW_PIN_POSITIONS,
  cellFormat: CELL_FORMATS,
  columnFlex: ['1', '2', '3'],
  minWidth: ['50px', '80px', '100px'],
  maxWidth: ['300px', '400px', '500px'],
  resizeMode: ['manual', 'auto', 'flex'],
  dragHandlePosition: ['left', 'right'],
  focusTarget: FOCUS_TARGETS,
  ariaRole: ARIA_ROLES,
  contrastMode: CONTRAST_MODES,
  zoomLevel: ZOOM_LEVELS,
  animationSpeed: ANIMATION_SPEEDS,
  debounceMs: DEBOUNCE_MS,
  throttleMs: THROTTLE_MS,
  cacheSize: CACHE_SIZES,
  batchSize: BATCH_SIZES,
  workerThreadCount: WORKER_THREAD_COUNTS,
  memoryLimit: MEMORY_LIMITS,
  renderMode: RENDER_MODES,
  scrollPosition: SCROLL_POSITIONS,
  stickyColumnCount: STICKY_COLUMN_COUNTS,
  groupCollapsedState: ['expanded', 'collapsed'],
  columnLockState: ['locked', 'unlocked'],
  rowExpansionState: ['expanded', 'collapsed'],
  exportPageOrientation: PRINT_ORIENTATIONS,
  columnHeaderAlignment: ['left', 'center', 'right'],
  cellTextAlignment: ['left', 'center', 'right'],
  columnSortOrderIndex: ['1', '2', '3'],
  multiSortModifierKey: KEYBOARD_MODIFIERS,
  filterDebounceMs: FILTER_DEBOUNCE_VALUES,
  quickFilterText: QUICK_FILTER_TEXTS,
  columnMenuTabName: COLUMN_MENU_TABS,
  sideBarPosition: SIDEBAR_POSITIONS,
  chartDataLabelsVisible: BOOLEAN_FLAGS,
  aggregationLabel: ['Grand Total', 'Subtotal'],
  detailRowHeight: ROW_HEIGHTS,
  masterDetailField: ['orderItems', 'lineItems', 'subRows'],
  rowHeight: ROW_HEIGHTS,
  headerHeight: ROW_HEIGHTS,
  columnWidth: COLUMN_WIDTHS,
  color: COLORS,
  hexColor: COLORS.filter((c) => c.startsWith('#')),
  rowIndex: ROW_INDICES,
  rowId: ROW_IDS,
  cellValue: TEXT_VALUES.concat(NUMBERS),
  cellRange: CELL_RANGES,
  filterValue: TEXT_VALUES.concat(NUMBERS),
  filterValueTo: NUMBERS,
  dataSourceName: DATA_SOURCE_NAMES,
  apiEndpoint: API_ENDPOINTS,
  columnAlias: COLUMN_ALIASES,
};

const ENTITY_TYPE_NAMES = Object.keys(ENTITY_TYPES);

/** Deterministic pseudo-random generator (mulberry32) — same seed always produces the same dataset, so regeneration is reproducible and diffable. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN(rand, arr, n) {
  const pool = arr.slice();
  const out = [];
  while (out.length < n && pool.length > 0) {
    const idx = Math.floor(rand() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

module.exports = {
  ENTITY_TYPES,
  ENTITY_TYPE_NAMES,
  COMPARISON_OPERATOR_PHRASES,
  toColId,
  mulberry32,
  pick,
  pickN,
};
