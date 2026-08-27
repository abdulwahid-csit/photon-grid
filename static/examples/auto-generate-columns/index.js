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

// Build column definitions programmatically from the first row's keys.
const columns = Object.keys(rowData[0]).map((key) => {
  const col = {
    field: key,
    colId: key,
    header: key.charAt(0).toUpperCase() + key.slice(1),
    sortable: true
  };

  if (key === "id") {
    col.width = 80;
    col.configurable = false;
  } else {
    col.flex = 1;
    col.minWidth = 120;
  }

  return col;
});

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  headerRowHeight: 48,
  rowHeight: 42
});
