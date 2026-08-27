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

// Trigger a file download of the chart (same action as the chart menu).
addButton("Download chart", function () {
  try {
    if (!lastChartId) { log("Create a chart first"); return; }
    api.downloadChart(lastChartId);
    log("downloadChart(" + lastChartId + ") called");
  } catch (err) {
    log("downloadChart failed: " + err.message);
  }
});

// Export the chart as an image (e.g. PNG blob/handle).
addButton("Export image", function () {
  try {
    if (!lastChartId) { log("Create a chart first"); return; }
    const image = api.exportChartAsImage(lastChartId);
    log("exportChartAsImage(" + lastChartId + ") called");
    if (image && typeof image.then === "function") {
      image.then(function () { log("exportChartAsImage resolved"); });
    }
  } catch (err) {
    log("exportChartAsImage failed: " + err.message);
  }
});

// Get the chart image as a data URL you can embed or upload.
addButton("Get image data URL", function () {
  try {
    if (!lastChartId) { log("Create a chart first"); return; }
    const url = api.getChartImageDataURL(lastChartId);
    if (url && typeof url.then === "function") {
      url.then(function (u) { log("getChartImageDataURL -> " + String(u).slice(0, 32) + "…"); });
    } else {
      log("getChartImageDataURL -> " + String(url).slice(0, 32) + "…");
    }
  } catch (err) {
    log("getChartImageDataURL failed: " + err.message);
  }
});

log("Create a chart, then try Download / Export image.");
