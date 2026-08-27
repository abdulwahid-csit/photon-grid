const columns = [
  { field: "id",         header: "ID",         colId: "id",         width: 80, pinned: "left", configurable: false },
  { field: "name",       header: "Employee",   colId: "name",       width: 180 },
  { field: "department", header: "Department", colId: "department", width: 180 },
  { field: "country",    header: "Country",    colId: "country",    width: 160 },
  { field: "salary",     header: "Salary",     colId: "salary",     width: 160 },
  { field: "active",     header: "Active",     colId: "active",     width: 120 }
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

grid.api.on("column:pinned", (event) => console.log("Pin state changed", event));

document.getElementById("toggle-dept").addEventListener("click", () => {
  const column = grid.api.getColumn("department");
  const isPinned = column && column.pinned === "left";
  grid.api.setColumnPin("department", isPinned ? null : "left");
});
document.getElementById("pin-active-right").addEventListener("click", () => grid.api.setColumnPin("active", "right"));
document.getElementById("unpin-active").addEventListener("click", () => grid.api.setColumnPin("active", null));
