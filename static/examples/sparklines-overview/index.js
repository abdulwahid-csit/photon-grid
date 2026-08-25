// A normal grid with a numeric column that a sparkline can visualise per row.
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

// The `sparkline` grid option enables in-cell mini charts. The config shape is
// illustrative — an empty object simply references the confirmed option; add
// the keys your build documents to bind a data series and pick a sparkline type.
new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns: columns,
  data: rowData,
  headerRowHeight: 48,
  rowHeight: 42,
  sparkline: {} // enable in-cell sparklines
});
