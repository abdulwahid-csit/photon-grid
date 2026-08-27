const columns = [
  { field: "id",         header: "ID",         colId: "id",         width: 80, configurable: false },
  { field: "name",       header: "Employee",   colId: "name",       width: 120 },
  { field: "department", header: "Department", colId: "department", width: 120 },
  { field: "country",    header: "Country",    colId: "country",    width: 100 },
  { field: "salary",     header: "Salary",     colId: "salary",     width: 100 },
  { field: "active",     header: "Active",     colId: "active",     width: 90 }
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

grid.api.on("column:autoSize", (event) => console.log("Column auto-sized", event));

document.getElementById("autosize-name").addEventListener("click", () => grid.api.autoSizeColumn("department"));
document.getElementById("autosize-all").addEventListener("click", () => grid.api.autoSizeAllColumns());
