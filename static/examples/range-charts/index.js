// Shared employee dataset — the numeric "salary" column is what we chart.
const columns = [
  { field: "id",         header: "ID",         colId: "id",         width: 70, configurable: false },
  { field: "name",       header: "Employee",   colId: "name",       flex: 1 },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "country",    header: "Country",    colId: "country",    flex: 1 },
  { field: "salary",     header: "Salary",     colId: "salary",     flex: 1 },
  { field: "active",     header: "Active",     colId: "active",     width: 90 }
];

const rowData = [
  { id: 1, name: "John Smith",     department: "Engineering",     country: "USA",     salary: 85000, active: true },
  { id: 2, name: "Sarah Johnson",  department: "Finance",         country: "UK",      salary: 72000, active: true },
  { id: 3, name: "Michael Brown",  department: "Marketing",       country: "Canada",  salary: 68000, active: false },
  { id: 4, name: "Emma Wilson",    department: "Human Resources", country: "USA",     salary: 61000, active: true },
  { id: 5, name: "David Miller",   department: "Engineering",     country: "Germany", salary: 93000, active: true },
  { id: 6, name: "Olivia Taylor",  department: "Sales",           country: "France",  salary: 65000, active: false },
  { id: 7, name: "James Anderson", department: "Operations",      country: "USA",     salary: 78000, active: true },
  { id: 8, name: "Sophia Thomas",  department: "Support",         country: "UK",      salary: 54000, active: true }
];

// Cell selection lets you drag out a rectangular range to chart.
const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns: columns,
  data: rowData,
  headerRowHeight: 48,
  rowHeight: 42,
  selection: { mode: "multiple" }
});

const api = grid.api;

const logEl = document.getElementById("log");
function log(message) {
  const time = new Date().toLocaleTimeString();
  logEl.textContent = "[" + time + "] " + message + "\n" + logEl.textContent;
}

let lastChartId = null;
function readChartId(source) {
  if (!source) return null;
  return source.chartId || source.id ||
    (source.chart && (source.chart.id || source.chart.chartId)) || null;
}

api.on("chart:created", function (event) {
  const id = readChartId(event);
  if (id) lastChartId = id;
  log("chart:created" + (id ? " (chart " + id + ")" : ""));
});

// Fires as the charted range changes — useful for keeping UI in sync.
api.on("chart:rangeSelectionChanged", function () {
  log("chart:rangeSelectionChanged");
});

const toolbar = document.getElementById("toolbar");
function addButton(label, handler) {
  const button = document.createElement("button");
  button.textContent = label;
  button.addEventListener("click", handler);
  toolbar.appendChild(button);
}

// Show what is currently selected before charting it.
addButton("Show selected range", function () {
  try {
    const ranges = api.getCellRanges();
    const count = Array.isArray(ranges) ? ranges.length : (ranges ? 1 : 0);
    log("getCellRanges() -> " + count + " range(s) selected");
  } catch (err) {
    log("getCellRanges failed: " + err.message);
  }
});

// Chart the current cell selection.
addButton("Create range chart", function () {
  try {
    const result = api.createRangeChart({
      chartType: "column",
      chartContainer: document.getElementById("chart")
    });
    const id = readChartId(result);
    if (id) lastChartId = id;
    log("createRangeChart() called from current selection");
  } catch (err) {
    log("createRangeChart failed: " + err.message);
  }
});

log("Select some salary cells, then click Create range chart.");
