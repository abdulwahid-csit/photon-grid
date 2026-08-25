const columns = [
  { field: "id",         header: "ID",         colId: "id",         width: 80, configurable: false },
  { field: "name",       header: "Employee",   colId: "name",       width: 180, resizable: true },
  { field: "department", header: "Department", colId: "department", width: 160, resizable: true },
  { field: "country",    header: "Country",    colId: "country",    width: 140, resizable: true },
  { field: "salary",     header: "Salary",     colId: "salary",     width: 120, resizable: true },
  { field: "active",     header: "Active",     colId: "active",     width: 100, resizable: true }
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

const grid = new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  headerRowHeight: 48,
  rowHeight: 42
});

// Persist the layout snapshot in a simple variable.
let savedState = null;

grid.api.on("column:stateChanged", () => console.log("Column state changed"));

document.getElementById("save").addEventListener("click", () => {
  savedState = grid.api.getColumnStates();
  console.log("Saved layout", savedState);
});

document.getElementById("restore").addEventListener("click", () => {
  if (savedState) grid.api.applyColumnStates(savedState);
});

document.getElementById("reset").addEventListener("click", () => grid.api.resetColumnState());
