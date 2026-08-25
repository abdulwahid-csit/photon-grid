const columns = [
  { field: "id",         header: "ID",         colId: "id",         width: 80, configurable: false },
  { field: "name",       header: "Employee",   colId: "name",       width: 180, resizable: true, minWidth: 140 },
  { field: "department", header: "Department", colId: "department", width: 180, resizable: true, minWidth: 120 },
  { field: "country",    header: "Country",    colId: "country",    width: 140, resizable: true, minWidth: 100 },
  { field: "salary",     header: "Salary",     colId: "salary",     width: 120, resizable: true, minWidth: 90 },
  { field: "active",     header: "Active",     colId: "active",     width: 100, resizable: true, minWidth: 80 }
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

grid.api.on("column:resized", (event) => console.log("Column resized", event));

document.getElementById("wide-name").addEventListener("click", () => grid.api.setColumnWidth("name", 260));
document.getElementById("narrow-name").addEventListener("click", () => grid.api.setColumnWidth("name", 140));
document.getElementById("fit").addEventListener("click", () => grid.api.sizeColumnsToFit());
