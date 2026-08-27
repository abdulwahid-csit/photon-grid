const columns = [
  { field: "id", header: "ID", colId: "id", width: 80, configurable: false, checkboxSelection: true },
  { field: "name", header: "Employee", colId: "name", flex: 1, sortable: true },
  { field: "department", header: "Department", colId: "department", flex: 1, sortable: true, filter: true },
  { field: "country", header: "Country", colId: "country", flex: 1, sortable: true, filter: true },
  { field: "salary", header: "Salary", colId: "salary", flex: 1, sortable: true },
  { field: "active", header: "Active", colId: "active", width: 100 }
];

const rowData = [
  { id: 1, name: "John Smith", department: "Engineering", country: "USA", salary: 85000, active: true },
  { id: 2, name: "Sarah Johnson", department: "Finance", country: "UK", salary: 72000, active: true },
  { id: 3, name: "Michael Brown", department: "Marketing", country: "Canada", salary: 68000, active: false },
  { id: 4, name: "Emma Wilson", department: "Human Resources", country: "USA", salary: 61000, active: true },
  { id: 5, name: "David Miller", department: "Engineering", country: "Germany", salary: 93000, active: true },
  { id: 6, name: "Olivia Taylor", department: "Sales", country: "France", salary: 65000, active: false },
  { id: 7, name: "James Anderson", department: "Operations", country: "USA", salary: 78000, active: true },
  { id: 8, name: "Sophia Thomas", department: "Customer Support", country: "UK", salary: 54000, active: true }
];

const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  {
    columns: columns,
    data: rowData,
    headerRowHeight: 48,
    rowHeight: 42,
    selection: { mode: "multiple" },
    pagination: { enabled: true, pageSize: 5 }
  }
);

const api = grid.api;
const status = document.getElementById("status");

function updateStatus() {
  status.textContent = "Selected: " + api.getSelectedCount();
}

api.on("row:selected", updateStatus);
api.on("row:deselected", updateStatus);

document.getElementById("quickFilter").addEventListener("input", function (e) {
  api.setQuickFilter(e.target.value);
});

document.getElementById("sortSalary").addEventListener("click", function () {
  api.sortColumn("salary", "desc");
});

document.getElementById("clearSort").addEventListener("click", function () {
  api.clearSort();
});

updateStatus();
