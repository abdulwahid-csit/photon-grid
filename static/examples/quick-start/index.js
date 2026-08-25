const columns = [
    {
        field: "id",
        header: "ID",
		colId: "id",
		width: 80,
        configurable: false
    },
    {
        field: "name",
        header: "Employee",
		colId: "name",
		flex: 1

    },
    {
        field: "department",
        header: "Department",
		colId: "department",
		flex: 1

    },
    {
        field: "salary",
        header: "Salary",
		colId: "salary",
		flex: 1

    }
];

const rowData = [
    {
        id: 1,
        name: "John Smith",
        department: "Engineering",
        salary: 85000
    },
    {
        id: 2,
        name: "Sarah Johnson",
        department: "Finance",
        salary: 72000
    },
    {
        id: 3,
        name: "Michael Brown",
        department: "Marketing",
        salary: 68000
    },
    {
        id: 4,
        name: "Emma Wilson",
        department: "Human Resources",
        salary: 61000
    },
    {
        id: 5,
        name: "David Miller",
        department: "Engineering",
        salary: 93000
    },
    {
        id: 6,
        name: "Olivia Taylor",
        department: "Sales",
        salary: 65000
    },
    {
        id: 7,
        name: "James Anderson",
        department: "Operations",
        salary: 78000
    },
    {
        id: 8,
        name: "Sophia Thomas",
        department: "Customer Support",
        salary: 54000
    },
];


 new PhotonGrid.GridCore(
    document.getElementById("grid"),
    {
        columns: columns,
        data: rowData,
		headerRowHeight: 48,
		rowHeight: 42,
		
    }
	
);