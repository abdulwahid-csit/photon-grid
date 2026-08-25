const columns = [
  { field: "id",         header: "ID",         colId: "id",         width: 80, configurable: false },
  { field: "name",       header: "Employee",   colId: "name",       flex: 1 },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "country",    header: "Country",    colId: "country",    flex: 1 },
  {
    header: "Actions",
    colId: "actions",
    width: 130,
    renderer: function () {
      return '<button class="pg-action">View</button>';
    }
  }
];

const rowData = [
  { id: 1, name: "John Smith",     department: "Engineering",      country: "USA",     salary: 85000, active: true },
  { id: 2, name: "Sarah Johnson",  department: "Finance",          country: "UK",      salary: 72000, active: true },
  { id: 3, name: "Michael Brown",  department: "Marketing",        country: "Canada",  salary: 68000, active: false },
  { id: 4, name: "Emma Wilson",    department: "Human Resources",  country: "USA",     salary: 61000, active: true },
  { id: 5, name: "David Miller",   department: "Engineering",      country: "Germany", salary: 93000, active: true },
  { id: 6, name: "Olivia Taylor",  department: "Sales",            country: "France",  salary: 65000, active: false }
];

const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  { columns: columns, data: rowData, headerRowHeight: 48, rowHeight: 42 }
);

const api = grid.api;
const logEl = document.getElementById("log");

function log(message) {
  const line = document.createElement("div");
  line.textContent = message;
  logEl.prepend(line);
}

api.on("row:clicked", function (event) {
  const row = event && event.data ? event.data : event;
  log("row:clicked -> " + JSON.stringify(row));
});

api.on("row:doubleClicked", function (event) {
  const row = event && event.data ? event.data : event;
  log("row:doubleClicked -> " + JSON.stringify(row));
});

api.on("cell:clicked", function (event) {
  if (event && event.colId === "actions") {
    log("Action clicked -> " + JSON.stringify(event.data || event));
  } else {
    log("cell:clicked -> column " + (event && event.colId));
  }
});
