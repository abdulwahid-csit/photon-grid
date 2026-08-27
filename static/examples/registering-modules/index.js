const columns = [
  { field: "id", header: "ID", colId: "id", width: 80, configurable: false },
  { field: "name", header: "Employee", colId: "name", flex: 1 },
  { field: "department", header: "Department", colId: "department", flex: 1 },
  { field: "country", header: "Country", colId: "country", flex: 1 },
  { field: "salary", header: "Salary", colId: "salary", flex: 1 }
];

const rowData = [
  { id: 1, name: "John Smith", department: "Engineering", country: "USA", salary: 85000 },
  { id: 2, name: "Sarah Johnson", department: "Finance", country: "UK", salary: 72000 },
  { id: 3, name: "Michael Brown", department: "Marketing", country: "Canada", salary: 68000 },
  { id: 4, name: "Emma Wilson", department: "Human Resources", country: "USA", salary: 61000 },
  { id: 5, name: "David Miller", department: "Engineering", country: "Germany", salary: 93000 },
  { id: 6, name: "Olivia Taylor", department: "Sales", country: "France", salary: 65000 }
];

// Every feature ships under the global PhotonGrid namespace.
// Here we use the built-in dark theme via the theme option.
new PhotonGrid.GridCore(
  document.getElementById("grid"),
  {
    columns: columns,
    data: rowData,
    headerRowHeight: 48,
    rowHeight: 42,
    theme: PhotonGrid.darkTheme
  }
);
