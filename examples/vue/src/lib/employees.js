/**
 * Shared mock employee data, used by the Basic and Server-Side demos.
 *
 * Kept in one module rather than duplicated per demo so both grids describe the
 * same book of people — the Server-Side demo is only interesting when its rows
 * look exactly like the client-side ones.
 */

/** ISO-3166 alpha-2 codes for the fixed country list `generateData` draws from. */
export const COUNTRY_FLAGS = {
  USA: 'us',
  Canada: 'ca',
  Germany: 'de',
  UK: 'gb',
  Pakistan: 'pk',
  India: 'in',
  Australia: 'au',
  Japan: 'jp',
};

const FIRST_NAMES = [
  'Alice', 'Brian', 'Carla', 'David', 'Ella', 'Frank', 'Grace', 'Henry',
  'Isabella', 'Jack', 'Kevin', 'Linda', 'Michael', 'Nina', 'Oliver',
  'Paul', 'Queen', 'Ryan', 'Sophia', 'Thomas', 'Sara', 'Abu',
];

const LAST_NAMES = [
  'Johnson', 'Smith', 'Brown', 'Wilson', 'Taylor', 'Anderson', 'Lee',
  'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'Allen', 'King', 'Khatak', 'Bakkar',
];

const DEPARTMENTS = [
  'Engineering', 'Sales', 'Marketing', 'Finance', 'Design', 'HR', 'Support', 'Operations',
];

const JOB_TITLES = [
  'Software Engineer', 'Senior Engineer', 'Product Manager', 'UI Designer',
  'QA Engineer', 'DevOps Engineer', 'Business Analyst', 'Sales Executive',
];

const COUNTRIES = ['USA', 'Canada', 'Germany', 'UK', 'Pakistan', 'India', 'Australia', 'Japan'];
const CITIES = ['New York', 'Toronto', 'Berlin', 'London', 'Lahore', 'Karachi', 'Sydney', 'Tokyo'];
const PERFORMANCE = ['Excellent', 'Good', 'Average', 'Needs Improvement'];
const MANAGERS = ['Sarah Connor', 'John Carter', 'Emma Watson', 'Chris Evans', 'Sophia Brown'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Builds `count` mock employee rows.
 *
 * Rows are produced in a single `Array.from` pass with no intermediate arrays,
 * so seeding 100 000 rows stays a linear allocation rather than a chain of
 * copies.
 *
 * @param {number} count - Number of rows to generate.
 * @returns {Record<string, unknown>[]} Freshly generated rows.
 */
export function generateData(count) {
  return Array.from({ length: count }, (_, i) => {
    const firstName = rand(FIRST_NAMES);
    const lastName = rand(LAST_NAMES);

    return {
      id: i + 1,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
      department: rand(DEPARTMENTS),
      jobTitle: rand(JOB_TITLES),
      salary: 50000 + Math.floor(Math.random() * 100000),
      age: 20 + Math.floor(Math.random() * 45),
      experience: Math.floor(Math.random() * 25),
      country: rand(COUNTRIES),
      city: rand(CITIES),
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
      performance: rand(PERFORMANCE),
      manager: rand(MANAGERS),
      remote: Math.random() > 0.5,
    };
  });
}
