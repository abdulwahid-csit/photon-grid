const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

const columns = [
  { field: "id", header: "ID", colId: "id", width: 80, configurable: false },
  {
    // Calculated column: combines name and department into one label.
    field: "name",
    header: "Employee",
    colId: "employeeLabel",
    flex: 2,
    minWidth: 220,
    renderer: (params) => `${params.data.name} — ${params.data.department}`
  },
  { field: "country", header: "Country", colId: "country", flex: 1, minWidth: 120 },
  {
    // Calculated column: formats the raw salary number as currency.
    field: "salary",
    header: "Salary",
    colId: "salary",
    width: 140,
    renderer: (params) => currency.format(params.value)
  }
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

new PhotonGrid.GridCore(document.getElementById("grid"), {
  columns,
  data: rowData,
  headerRowHeight: 48,
  rowHeight: 42
});
