const rawRows = [
  { id: 101, name: "John Smith",     department: "Engineering",      country: "USA",     salary: 85000 },
  { id: 102, name: "Sarah Johnson",  department: "Finance",          country: "UK",      salary: 72000 },
  { id: 103, name: "Michael Brown",  department: "Marketing",        country: "Canada",  salary: 68000 },
  { id: 104, name: "Emma Wilson",    department: "Human Resources",  country: "USA",     salary: 61000 },
  { id: 105, name: "David Miller",   department: "Engineering",      country: "Germany", salary: 93000 },
  { id: 106, name: "Olivia Taylor",  department: "Sales",            country: "France",  salary: 65000 },
  { id: 107, name: "James Anderson", department: "Operations",       country: "USA",     salary: 78000 },
  { id: 108, name: "Sophia Thomas",  department: "Customer Support", country: "UK",      salary: 54000 }
];

const rowData = rawRows.map(function (row, index) {
  return Object.assign({}, row, { rowNumber: index + 1 });
});

const columns = [
  { field: "rowNumber",  header: "#",          colId: "rowNumber",  width: 60, configurable: false },
  { field: "name",       header: "Employee",   colId: "name",       flex: 1 },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "country",    header: "Country",    colId: "country",    flex: 1 },
  { field: "salary",     header: "Salary",     colId: "salary",     flex: 1 }
];

const grid = new PhotonGrid.GridCore(
  document.getElementById("grid"),
  { columns: columns, data: rowData, headerRowHeight: 48, rowHeight: 42 }
);

const api = grid.api;
const statusEl = document.getElementById("status");

document.getElementById("first").addEventListener("click", function () {
  const node = api.getRowByIndex(0);
  const row = node && node.data ? node.data : node;
  statusEl.textContent = "Row at index 0: " + JSON.stringify(row);
});
