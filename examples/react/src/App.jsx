import { useMemo } from 'react';
import { PhotonGrid } from 'photon-grid-react';
import './App.css';

const COUNTRY_FLAGS = {
  USA: 'us',
  Canada: 'ca',
  Germany: 'de',
  UK: 'gb',
  Pakistan: 'pk',
  India: 'in',
  Australia: 'au',
  Japan: 'jp',
};

function generateData(count) {
  const firstNames = [
    'Alice', 'Brian', 'Carla', 'David', 'Ella', 'Frank', 'Grace', 'Henry',
    'Isabella', 'Jack', 'Kevin', 'Linda', 'Michael', 'Nina', 'Oliver',
    'Paul', 'Queen', 'Ryan', 'Sophia', 'Thomas', 'Sara', 'Abu',
  ];

  const lastNames = [
    'Johnson', 'Smith', 'Brown', 'Wilson', 'Taylor', 'Anderson', 'Lee',
    'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'Allen', 'King', 'Khatak', 'Bakkar',
  ];

  const departments = [
    'Engineering', 'Sales', 'Marketing', 'Finance', 'Design', 'HR', 'Support', 'Operations',
  ];

  const jobTitles = [
    'Software Engineer', 'Senior Engineer', 'Product Manager', 'UI Designer',
    'QA Engineer', 'DevOps Engineer', 'Business Analyst', 'Sales Executive',
  ];

  const countries = ['USA', 'Canada', 'Germany', 'UK', 'Pakistan', 'India', 'Australia', 'Japan'];
  const cities = ['New York', 'Toronto', 'Berlin', 'London', 'Lahore', 'Karachi', 'Sydney', 'Tokyo'];
  const performance = ['Excellent', 'Good', 'Average', 'Needs Improvement'];
  const managers = ['Sarah Connor', 'John Carter', 'Emma Watson', 'Chris Evans', 'Sophia Brown'];

  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

  return Array.from({ length: count }, (_, i) => {
    const firstName = rand(firstNames);
    const lastName = rand(lastNames);

    return {
      id: i + 1,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      department: rand(departments),
      jobTitle: rand(jobTitles),
      salary: 50000 + Math.floor(Math.random() * 100000),
      age: 20 + Math.floor(Math.random() * 45),
      experience: Math.floor(Math.random() * 25),
      country: rand(countries),
      city: rand(cities),
      phone: `+1-555-${1000 + Math.floor(Math.random() * 9000)}`,
      joinDate: new Date(
        2015 + Math.floor(Math.random() * 11),
        Math.floor(Math.random() * 12),
        1 + Math.floor(Math.random() * 28),
      ),
      active: Math.random() > 0.25,
      rating: +(Math.random() * 5).toFixed(1),
      bonus: Math.floor(Math.random() * 15000),
      projects: 1 + Math.floor(Math.random() * 20),
      performance: rand(performance),
      manager: rand(managers),
      remote: Math.random() > 0.5,
    };
  });
}

function App() {
  const data = useMemo(() => generateData(100), []);

  const columns = useMemo(() => [
    {
      colId: 'fullName',
      field: 'fullName',
      header: 'Full Name',
      type: 'string',
      width: 220,
      rowDrag: true, 
    },
    {
      colId: 'email',
      field: 'email',
      header: 'Email',
      type: 'string',
      width: 240,
    },
    { colId: 'department', field: 'department', header: 'Department', type: 'string', width: 160, groupable: true },
    { colId: 'jobTitle', field: 'jobTitle', header: 'Job Title', type: 'string', width: 180, groupable: true },
    { colId: 'salary', field: 'salary', header: 'Salary', type: 'currency', width: 140 },
    { colId: 'age', field: 'age', header: 'Age', type: 'number', width: 90 },
    { colId: 'experience', field: 'experience', header: 'Experience', type: 'number', width: 120 },
    {
      colId: 'country',
      field: 'country',
      header: 'Country',
      type: 'dropdown',
      editable: true,
      width: 160,
      groupable: true,
      enumOptions: Object.keys(COUNTRY_FLAGS),
    },
    { colId: 'city', field: 'city', header: 'City', type: 'string', width: 150, groupable: true },
    { colId: 'phone', field: 'phone', header: 'Phone', type: 'string', width: 170 },
    { colId: 'joinDate', field: 'joinDate', header: 'Join Date', type: 'date', width: 140 },
    { colId: 'active', field: 'active', header: 'Active', type: 'boolean', width: 100 },
    { colId: 'rating', field: 'rating', header: 'Rating', type: 'number', width: 100 },
  ], []);

  const options = useMemo(() => ({
    showCheckboxes: false,
    showSerialNumber: false,
    rowShading: false,
    showGroupingBar: true,
    selection: { mode: 'multiple' },
  }), []);

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">Photon Grid — React example</h1>
        <p className="page__subtitle">
          A basic example of the Photon Grid component from the photon-grid-react package.
        </p>
      </header>
      <section className="grid-wrapper">
        <PhotonGrid columns={columns} dataSet={data}  />
      </section>
    </main>
  );
}

export default App;
