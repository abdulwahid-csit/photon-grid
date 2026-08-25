const columns = [
  { field: "name",       header: "Employee",   colId: "name",       flex: 1, checkboxSelection: true },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "country",    header: "Country",    colId: "country",    flex: 1 },
  { field: "salary",     header: "Salary",     colId: "salary",     flex: 1 }
];

const rowData = [
  { id: 1, name: "John Smith",     department: "Engineering",      country: "USA",     salary: 85000, active: true },
  { id: 2, name: "Sarah Johnson",  department: "Finance",          country: "UK",      salary: 72000, active: true },
  { id: 3, name: "Michael Brown",  department: "Marketing",        country: "Canada",  salary: 68000, active: false },
  { id: 4, name: "Emma Wilson",    department: "Human Resources",  country: "USA",     salary: 61000, active: true },
  { id: 5, name: "David Miller",   department: "Engineering",      country: "Germany", salary: 93000, active: true },
  { id: 6, name: "Olivia Taylor",  department: "Sales",            country: "France",  salary: 65000, active: false },
  { id: 7, name: "James Anderson", department: "Operations",       country: "USA",     salary: 78000, active: true },
  { id: 8, name: "Sophia Thomas",  department: "Customer Support", country: "UK",      salary: 54000, active: true }
];

const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  {
    columns: columns,
    data: rowData,
    selection: { mode: "multiple" },
    headerRowHeight: 48,
    rowHeight: 42
  }
);

const api = grid.api;
const countEl = document.getElementById("selectedCount");

function updateCount() {
  countEl.textContent = api.getSelectedCount();
}

document.getElementById("selectAll").addEventListener("click", function () {
  api.selectAll();
  updateCount();
});

document.getElementById("clear").addEventListener("click", function () {
  api.deselectAll();
  updateCount();
});

api.on("row:selected", updateCount);
api.on("row:deselected", updateCount);
api.on("row:allSelected", updateCount);
api.on("row:allDeselected", updateCount);

updateCount();
