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
let savedModels = null;
function readChartId(source) {
  if (!source) return null;
  return source.chartId || source.id ||
    (source.chart && (source.chart.id || source.chart.chartId)) || null;
}

["chart:created", "chart:destroyed"].forEach(function (eventName) {
  api.on(eventName, function (event) {
    const id = readChartId(event);
    if (id) lastChartId = id;
    log(eventName + (id ? " (chart " + id + ")" : ""));
  });
});

const toolbar = document.getElementById("toolbar");
function addButton(label, handler) {
  const button = document.createElement("button");
  button.textContent = label;
  button.addEventListener("click", handler);
  toolbar.appendChild(button);
}

addButton("Create chart", function () {
  try {
    const result = api.createRangeChart({
      chartType: "column",
      chartContainer: document.getElementById("chart")
    });
    const id = readChartId(result);
    if (id) lastChartId = id;
    log("createRangeChart() called");
  } catch (err) {
    log("createRangeChart failed: " + err.message);
  }
});

// Serialize every chart on the grid into plain models you can persist.
addButton("Save models", function () {
  try {
    savedModels = api.getChartModels();
    const count = Array.isArray(savedModels)
      ? savedModels.length
      : (savedModels ? 1 : 0);
    log("getChartModels() -> " + count + " model(s) saved");
  } catch (err) {
    log("getChartModels failed: " + err.message);
  }
});

// Tear a chart down (simulating a page reload / cleared session).
addButton("Destroy chart", function () {
  try {
    if (!lastChartId) { log("No chart to destroy yet"); return; }
    api.destroyChart(lastChartId);
    log("destroyChart(" + lastChartId + ") called");
    lastChartId = null;
  } catch (err) {
    log("destroyChart failed: " + err.message);
  }
});

// Rebuild charts from the saved models.
addButton("Restore charts", function () {
  try {
    if (!savedModels) { log("No saved models — click Save models first"); return; }
    const models = Array.isArray(savedModels) ? savedModels : [savedModels];
    models.forEach(function (model) { api.restoreChart(model); });
    log("restoreChart() called for " + models.length + " model(s)");
  } catch (err) {
    log("restoreChart failed: " + err.message);
  }
});

log("Create -> Save models -> Destroy -> Restore to see persistence.");
