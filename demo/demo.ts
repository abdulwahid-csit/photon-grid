import { GridCore } from '../src/index';
import type { ColumnDef } from '../src/types/column.types';
import type { GridOptions } from '../src/types/grid.types';
import { ChartConfig } from './../src/chart/chart-engine';

// ─── Employee interface ───────────────────────────────────────────────────────

interface Employee {
  id: string;
  employeeName: string;
  department: string;
  gender: string;
  contactNo: string;
  email: string;
  employeeType: string;
  accountStatus: string;
  authPin: number;
  attendancePolicy: string;
  role: string;
  weekHourLimit: number;
  otRate: number;
  paySchedule: string;
  country: string;
  state: string;
  city: string;
  hiringDate: string;
  joiningDate: string;
  salary: number;
  paymentMethod: string;
  salaryHistory: number[];
}

// ─── Data generator ───────────────────────────────────────────────────────────

function generateEmployees(count: number): Employee[] {
  const firstNames = [
    'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
    'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
    'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy',
    'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
    'Steven', 'Dorothy', 'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna',
    'Kevin', 'Michelle', 'Brian', 'Carol', 'George', 'Amanda', 'Timothy', 'Melissa',
    'Ronald', 'Deborah', 'Ryan', 'Stephanie', 'Jacob', 'Rebecca', 'Gary', 'Sharon',
    'Eric', 'Laura', 'Jonathan', 'Cynthia', 'Stephen', 'Kathleen', 'Larry', 'Amy',
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
    'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
    'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
    'Carter', 'Roberts', 'Phillips', 'Evans', 'Turner', 'Torres', 'Parker', 'Collins',
    'Edwards', 'Stewart', 'Flores', 'Morris', 'Nguyen', 'Murphy', 'Rivera', 'Cook', 'Choudhry Asghar khan kiyani'
  ];

  const departments = [
    'Engineering', 'Finance', 'Human Resources', 'Marketing',
    'Sales', 'Operations', 'Legal', 'IT Support', 'Product', 'Design',
  ];

  const genders          = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
  const employeeTypes    = ['Full-time', 'Part-time', 'Contract', 'Intern'];
  const accountStatuses  = ['Active', 'Inactive', 'Suspended'];
  const attendancePolicies = ['Standard (9-5)', 'Flexible Hours', 'Remote', 'Shift-based', 'Hybrid'];
  const paySchedules     = ['Weekly', 'Bi-weekly', 'Monthly', 'Semi-monthly'];
  const paymentMethods   = ['Direct Deposit', 'Check', 'Wire Transfer', 'ACH'];
  const weekHourOptions  = [20, 30, 35, 40, 45, 48];
  const otRateOptions    = [1.25, 1.5, 1.75, 2.0];

  const rolesByDept: Record<string, string[]> = {
    'Engineering':     ['Software Engineer', 'Senior Engineer', 'Tech Lead', 'DevOps Engineer', 'QA Engineer'],
    'Finance':         ['Financial Analyst', 'Accountant', 'CFO', 'Budget Analyst', 'Controller'],
    'Human Resources': ['HR Manager', 'Recruiter', 'HR Specialist', 'Talent Acquisition', 'HR Business Partner'],
    'Marketing':       ['Marketing Manager', 'Content Strategist', 'SEO Specialist', 'Brand Manager', 'Campaign Manager'],
    'Sales':           ['Sales Executive', 'Account Manager', 'Sales Director', 'Business Development Rep', 'Inside Sales Rep'],
    'Operations':      ['Operations Manager', 'Supply Chain Analyst', 'Logistics Coordinator', 'Process Manager', 'Ops Analyst'],
    'Legal':           ['Legal Counsel', 'Paralegal', 'Compliance Officer', 'Contract Manager', 'General Counsel'],
    'IT Support':      ['IT Specialist', 'Systems Administrator', 'Network Engineer', 'Help Desk Analyst', 'IT Manager'],
    'Product':         ['Product Manager', 'Product Owner', 'Product Analyst', 'Product Director', 'VP of Product'],
    'Design':          ['UX Designer', 'UI Designer', 'Graphic Designer', 'Design Lead', 'Creative Director'],
  };

  // Country → { states/regions, cities per region }
  const geography: Record<string, { regions: string[]; cities: Record<string, string[]> }> = {
    'United States': {
      regions: ['California', 'Texas', 'New York', 'Florida', 'Illinois', 'Washington', 'Colorado', 'Georgia'],
      cities: {
        'California': ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose'],
        'Texas':      ['Houston', 'Dallas', 'Austin', 'San Antonio'],
        'New York':   ['New York City', 'Buffalo', 'Albany', 'Rochester'],
        'Florida':    ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
        'Illinois':   ['Chicago', 'Aurora', 'Rockford', 'Naperville'],
        'Washington': ['Seattle', 'Spokane', 'Tacoma', 'Bellevue'],
        'Colorado':   ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins'],
        'Georgia':    ['Atlanta', 'Augusta', 'Savannah', 'Athens'],
      },
    },
    'United Kingdom': {
      regions: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
      cities: {
        'England':          ['London', 'Manchester', 'Birmingham', 'Leeds'],
        'Scotland':         ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee'],
        'Wales':            ['Cardiff', 'Swansea', 'Newport', 'Bangor'],
        'Northern Ireland': ['Belfast', 'Derry', 'Lisburn', 'Armagh'],
      },
    },
    'Canada': {
      regions: ['Ontario', 'Quebec', 'British Columbia', 'Alberta'],
      cities: {
        'Ontario':          ['Toronto', 'Ottawa', 'Hamilton', 'London'],
        'Quebec':           ['Montreal', 'Quebec City', 'Laval', 'Gatineau'],
        'British Columbia': ['Vancouver', 'Victoria', 'Kelowna', 'Surrey'],
        'Alberta':          ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge'],
      },
    },
    'Germany': {
      regions: ['Bavaria', 'Berlin', 'Hamburg', 'North Rhine-Westphalia'],
      cities: {
        'Bavaria':                  ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg'],
        'Berlin':                   ['Berlin', 'Potsdam', 'Brandenburg', 'Frankfurt (Oder)'],
        'Hamburg':                  ['Hamburg', 'Lübeck', 'Flensburg', 'Kiel'],
        'North Rhine-Westphalia':   ['Cologne', 'Düsseldorf', 'Dortmund', 'Essen'],
      },
    },
    'France': {
      regions: ['Île-de-France', 'Provence', 'Occitanie', 'Nouvelle-Aquitaine'],
      cities: {
        'Île-de-France':      ['Paris', 'Versailles', 'Boulogne-Billancourt', 'Saint-Denis'],
        'Provence':           ['Marseille', 'Nice', 'Toulon', 'Aix-en-Provence'],
        'Occitanie':          ['Toulouse', 'Montpellier', 'Nîmes', 'Perpignan'],
        'Nouvelle-Aquitaine': ['Bordeaux', 'Limoges', 'Pau', 'Bayonne'],
      },
    },
    'Australia': {
      regions: ['New South Wales', 'Victoria', 'Queensland', 'Western Australia'],
      cities: {
        'New South Wales':    ['Sydney', 'Newcastle', 'Wollongong', 'Canberra'],
        'Victoria':           ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo'],
        'Queensland':         ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville'],
        'Western Australia':  ['Perth', 'Fremantle', 'Bunbury', 'Mandurah'],
      },
    },
    'India': {
      regions: ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu'],
      cities: {
        'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
        'Karnataka':   ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru'],
        'Delhi':       ['New Delhi', 'Noida', 'Gurugram', 'Faridabad'],
        'Tamil Nadu':  ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
      },
    },
    'United Arab Emirates': {
      regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
      cities: {
        'Dubai':     ['Dubai', 'Deira', 'Bur Dubai', 'Jumeirah'],
        'Abu Dhabi': ['Abu Dhabi', 'Al Ain', 'Ruwais', 'Khalifa City'],
        'Sharjah':   ['Sharjah', 'Khor Fakkan', 'Kalba', 'Dibba Al Hisn'],
        'Ajman':     ['Ajman', 'Al Jurf', 'Al Rashidiya', 'Al Hamidiyah'],
      },
    },
    'Pakistan': {
      regions: ['Islamabad', 'KPK', 'Sindh', 'Balochistan'],
      cities: {
        'Islamabad':     ['Gulberg', 'DHA', 'G12', 'I8'],
        'KPK': ['Abu Dhabi', 'Dir', 'Peshawer', 'Mardan'],
        'Sindh':   ['Kashmor', 'Karachi', 'Faisalabad', 'Haiderabad'],
        'Balochistan':     ['Abu City', 'Lahore', 'Queta', 'Gulshan Iqbal'],
      },
    },
  };

  const countries = Object.keys(geography);

  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
  const rand = (min: number, max: number): number =>
    Math.floor(Math.random() * (max - min + 1)) + min;
  const pad  = (n: number, len: number): string => String(n).padStart(len, '0');

  const isoDate = (d: Date): string =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;

  const randomPastDate = (yearsBack: number): Date => {
    const now  = Date.now();
    const past = now - yearsBack * 365.25 * 24 * 60 * 60 * 1000;
    return new Date(past + Math.random() * (now - past));
  };

  const addDays = (d: Date, days: number): Date => {
    const r = new Date(d);
    r.setDate(r.getDate() + days);
    return r;
  };

  const records: Employee[] = [];

  for (let i = 0; i < count; i++) {
    const firstName   = pick(firstNames);
    const lastName    = pick(lastNames);
    const dept        = pick(departments);
    const country     = pick(countries);
    const countryGeo  = geography[country];
    const region      = pick(countryGeo.regions);
    const city        = pick(countryGeo.cities[region] ?? ['Unknown']);
    const hiringD     = randomPastDate(6);
    const joiningD    = addDays(hiringD, rand(7, 90));

    const baseSalary = rand(32_000, 195_000);
    // 12 months of salary history: small monthly drift ± 8 % around base
    let value = Math.floor(Math.random() * 100) + 1;

    const salaryHistory = Array.from({ length: 30 }, () => {
      value += Math.floor(Math.random() * 11) - 5; // -5 to +5
      value = Math.max(1, Math.min(100, value));   // Keep between 1 and 100
      return value;
    });

    records.push({
      id:               `EMP-${pad(i + 1, 5)}`,
      employeeName:     `${firstName} ${lastName}`,
      department:       dept,
      gender:           pick(genders),
      contactNo:        `+1 ${rand(200, 999)}-${rand(100, 999)}-${pad(rand(1000, 9999), 4)}`,
      email:            `${firstName.toLowerCase()}.${lastName.toLowerCase()}${rand(1, 99)}@company.com`,
      employeeType:     pick(employeeTypes),
      accountStatus:    Math.random() < 0.82 ? 'Active' : pick(accountStatuses.filter(s => s !== 'Active')),
      authPin:          rand(1000, 9999),
      attendancePolicy: pick(attendancePolicies),
      role:             pick(rolesByDept[dept] ?? ['Associate']),
      weekHourLimit:    pick(weekHourOptions),
      otRate:           pick(otRateOptions),
      paySchedule:      pick(paySchedules),
      country,
      state:            region,
      city,
      hiringDate:       isoDate(hiringD),
      joiningDate:      isoDate(joiningD),
      salary:           baseSalary,
      paymentMethod:    pick(paymentMethods),
      salaryHistory,
    });
  }

  return records;
}

// ─── Country flags ────────────────────────────────────────────────────────────

// ISO 3166-1 alpha-2 codes used by flagcdn.com
const countryFlagCodes: Record<string, string> = {
  'United States':        'us',
  'United Kingdom':       'gb',
  'Canada':               'ca',
  'Germany':              'de',
  'France':               'fr',
  'Australia':            'au',
  'India':                'in',
  'United Arab Emirates': 'ae',
  'Pakistan': 'pk'
};

// ─── Column definitions (grouped) ────────────────────────────────────────────

const columns: ColumnDef[] = [

  // ── Standalone: Employee ID (pinned left, no group) ───────────────────────
  {
    colId: 'id', field: 'id', header: 'ID',
    type: 'string', width: 110, sortable: true, resizable: false, filterable: true,
    editable: true, pinned: 'left',
  },

  // ── Group: Personal Information ───────────────────────────────────────────
  {
    colId: 'grp_personal', field: '', header: 'Personal Information', type: 'string',
    openByDefault: true, marryChildren: false, collapsedWidth: 36,
    children: [
      {
        colId: 'employeeName', field: 'employeeName', header: 'Employee Name',
        type: 'string', width: 210, sortable: true, filterable: true, draggable: true,
        editable: true,
        cellRendererFn: ({ value, rowIndex }) => {
          const name = String(value ?? '');
          const img  = `https://i.pravatar.cc/32?img=${(rowIndex % 70) + 1}`;
          return `<span style="display:flex;align-items:center;gap:8px"><img src="${name ? img : ''}" width="28" height="28" style="border-radius:50%;object-fit:cover;flex-shrink:0" />${name}</span>`;
        },
      },
      {
        colId: 'gender', field: 'gender', header: 'Gender',
        type: 'dropdown', width: 145, sortable: true, filterable: true, editable: true,
        enumOptions: ['Male', 'Female', 'Non-binary', 'Prefer not to say'], groupable: true,
        cellRendererFn: ({ value }) => {
          const v = String(value ?? '');
          const icons: Record<string, string> = {
            'Male':              `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="14.14" y2="9.86"/><polyline points="15 5 19 5 19 9"/></svg>`,
            'Female':            `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="22"/><line x1="9" y1="19" x2="15" y2="19"/></svg>`,
            'Non-binary':        `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="2" x2="12" y2="7"/><line x1="12" y1="17" x2="12" y2="22"/><line x1="7" y1="4.2" x2="9.5" y2="8.5"/><line x1="14.5" y1="15.5" x2="17" y2="19.8"/></svg>`,
            'Prefer not to say': `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
          };
          const icon = icons[v] ?? icons['Prefer not to say'];
          return `<span style="display:flex;align-items:center;gap:6px">${v ? icon : ''}${v}</span>`;
        },
      },
    ],
  },

  // ── Group: Contact Details ────────────────────────────────────────────────
  {
    colId: 'grp_contact', field: '', header: 'Contact Details', type: 'string',
    openByDefault: true, marryChildren: false, collapsedWidth: 36,
    children: [
      {
        colId: 'contactNo', field: 'contactNo', header: 'Contact No',
        type: 'string', width: 165, sortable: false, editable: true, filterable: true,
      },
      {
        colId: 'email', field: 'email', header: 'Email',
        type: 'email', width: 200, sortable: true, filterable: true, editable: true,
      },
    ],
  },

  // ── Group: Location ───────────────────────────────────────────────────────
  {
    colId: 'grp_location', field: '', header: 'Location', type: 'string',
    openByDefault: true, marryChildren: false, collapsedWidth: 36,
    children: [
      {
        colId: 'country', field: 'country', header: 'Country',
        type: 'dropdown', width: 190, sortable: true, filterable: true, editable: true,
        groupable: true,
        dropdownOptions: [
          { label: 'United States', value: 'United States' },
          { label: 'United Kingdom', value: 'United Kingdom' },
          { label: 'Canada',  value: 'Canada' },
          { label: 'Germany', value: 'Germany' },
          { label: 'France',  value: 'France' },
          { label: 'Australia', value: 'Australia' },
          { label: 'India',   value: 'India' },
          { label: 'United Arab Emirates', value: 'United Arab Emirates' },
          { label: 'Pakistan', value: 'Pakistan' },
        ],
        cellRendererFn: ({ value }) => {
          const name = String(value ?? '');
          const code = countryFlagCodes[name] ?? 'un';
          return `${name ? `<span style="display:flex;align-items:center;gap:7px"><img src="https://flagcdn.com/w20/${code}.png" width="20" height="14" style="border-radius:2px;object-fit:cover;flex-shrink:0" />` : ''}${name}</span>`;
        },
      },
      {
        colId: 'state', field: 'state', header: 'State',
        type: 'string', width: 165, sortable: true, filterable: true, editable: true,
      },
      {
        colId: 'city', field: 'city', header: 'City',
        type: 'string', width: 145, sortable: true, filterable: true, editable: true,
      },
    ],
  },

  // ── Group: Employment ─────────────────────────────────────────────────────
  {
    colId: 'grp_employment', field: '', header: 'Employment', type: 'string',
    openByDefault: true, marryChildren: false, collapsedWidth: 36,
    children: [
      {
        colId: 'department', field: 'department', header: 'Department',
        type: 'dropdown', width: 155, sortable: true, filterable: true, editable: true,
        groupable: true,
        enumOptions: ['Engineering', 'Finance', 'Human Resources', 'Marketing', 'Sales', 'Operations', 'Legal', 'IT Support', 'Product', 'Design'],
        dropdownOptions: [
          { value: 'Engineering',     label: 'Engineering' },
          { value: 'Finance',         label: 'Finance' },
          { value: 'Human Resources', label: 'Human Resources' },
          { value: 'Marketing',       label: 'Marketing' },
          { value: 'Sales',           label: 'Sales' },
          { value: 'Operations',      label: 'Operations' },
          { value: 'Legal',           label: 'Legal' },
          { value: 'IT Support',      label: 'IT Support' },
          { value: 'Product',         label: 'Product' },
          { value: 'Design',          label: 'Design' },
        ],
      },
      {
        colId: 'role', field: 'role', header: 'Role',
        type: 'string', width: 190, sortable: true, filterable: true, editable: true,
        groupable: true,
      },
      {
        colId: 'employeeType', field: 'employeeType', header: 'Employee Type',
        type: 'dropdown', width: 145, sortable: true, filterable: true, editable: true,
        enumOptions: ['Full-time', 'Part-time', 'Contract', 'Intern'],
      },
      {
        colId: 'accountStatus', field: 'accountStatus', header: 'Account Status',
        type: 'dropdown', width: 145, sortable: true, filterable: true, editable: true,
        enumOptions: ['Active', 'Inactive', 'Suspended'],
      },
      {
        colId: 'authPin', field: 'authPin', header: 'Auth Pin',
        type: 'string', width: 100, sortable: false, filterable: true, editable: true,
      },
      {
        colId: 'attendancePolicy', field: 'attendancePolicy', header: 'Attendance Policy',
        type: 'dropdown', width: 180, sortable: true, filterable: true, editable: true,
        enumOptions: ['Standard (9-5)', 'Flexible Hours', 'Remote', 'Shift-based', 'Hybrid'],
      },
    ],
  },

  // ── Group: Schedule & Time ────────────────────────────────────────────────
  {
    colId: 'grp_schedule', field: '', header: 'Schedule & Time', type: 'string',
    openByDefault: true, marryChildren: false, collapsedWidth: 36,
    children: [
      {
        colId: 'weekHourLimit', field: 'weekHourLimit', header: 'Week Hour Limit',
        type: 'number', width: 150, minWidth: 70, sortable: true, filterable: true,
        editable: true, aggFunc: 'avg',
      },
      {
        colId: 'otRate', field: 'otRate', header: 'OT Rate',
        type: 'number', width: 105, sortable: true, filterable: true, editable: true,
        aggFunc: 'avg',
      },
      {
        colId: 'paySchedule', field: 'paySchedule', header: 'Pay Schedule',
        type: 'dropdown', width: 145, sortable: true, filterable: true, editable: true,
        groupable: true,
        enumOptions: ['Weekly', 'Bi-weekly', 'Monthly', 'Semi-monthly'],
      },
      {
        colId: 'hiringDate', field: 'hiringDate', header: 'Hiring Date',
        type: 'date', width: 130, sortable: true, filterable: true, editable: true,
      },
      {
        colId: 'joiningDate', field: 'joiningDate', header: 'Joining Date',
        type: 'date', width: 130, sortable: true, filterable: true, editable: true,
      },
    ],
  },

  // ── Group: Compensation ───────────────────────────────────────────────────
  {
    colId: 'grp_compensation', field: '', header: 'Compensation', type: 'string',
    openByDefault: true, marryChildren: false, collapsedWidth: 36,
    children: [
      {
        colId: 'salary', field: 'salary', header: 'Salary',
        type: 'currency', width: 130, sortable: true, filterable: true, editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'paymentMethod', field: 'paymentMethod', header: 'Payment Method',
        type: 'dropdown', width: 165, sortable: true, filterable: true, editable: true,
        enumOptions: ['Direct Deposit', 'Check', 'Wire Transfer', 'ACH'],
      },
    ],
  },
  {
  colId: 'DOB', field: 'DOB', header: 'DOB',
  type: 'currency', width: 130, sortable: true, filterable: true, editable: true,
  aggFunc: 'sum',
},


];



const firstNames = [
  'John', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia',
  'James', 'Mia', 'Lucas', 'Charlotte', 'Daniel', 'Amelia'
];

const lastNames = [
  'Smith', 'Johnson', 'Brown', 'Williams', 'Jones',
  'Miller', 'Wilson', 'Taylor', 'Moore', 'Thomas'
];

const countries = [
  'United States',
  'Canada',
  'Germany',
  'France',
  'United Kingdom',
  'Australia',
  'Pakistan',
  'India',
  'Japan',
  'Brazil'
];

const languages = [
  'English',
  'German',
  'French',
  'Spanish',
  'Urdu',
  'Hindi',
  'Japanese',
  'Chinese'
];

const games = [
  'Counter Strike 2',
  'Valorant',
  'PUBG',
  'Fortnite',
  'Minecraft',
  'Dota 2',
  'League of Legends',
  'Rocket League',
  'Apex Legends',
  'Call of Duty'
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function random(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, digits = 2) {
  return Number((Math.random() * (max - min) + min).toFixed(digits));
}

export function generatePlayerData(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const bankBalance = random(500, 50000);
    const totalWinning = random(0, 200000);

    return {
      id: i + 1,

      // Participant
      name: `${randomItem(firstNames)} ${randomItem(lastNames)}`,
      language: randomItem(languages),
      country: randomItem(countries),

      // Game of Choice
      gameName: randomItem(games),
      bought: Math.random() > 0.5,

      // Performance
      bankBalance,
      rating: randomFloat(1, 5, 1),
      totalWinning,

      // Monthly Breakdown
      january: random(0, 15000),
      february: random(0, 15000),
      march: random(0, 15000),
      april: random(0, 15000),
      may: random(0, 15000),
      june: random(0, 15000),
      july: random(0, 15000),
      august: random(0, 15000),
      september: random(0, 15000),
      october: random(0, 15000),
      november: random(0, 15000),
      december: random(0, 15000),
    };
  });
}

export const playerColumns: ColumnDef[] = [
  // ───────────────────────────────────────────────────────────────
  // Participant
  // ───────────────────────────────────────────────────────────────
  {
    colId: 'grp_participant',
    header: 'Participant',
    openByDefault: true,
    field: '',
    type: 'string',
    marryChildren: false,
    children: [
      {
        colId: 'name',
        field: 'name',
        header: 'Name',
        type: 'string',
        width: 180,
        sortable: true,
        filterable: true,
        editable: true,
        resizable: true,
        rowDrag: true,
      },
      {
        colId: 'language',
        field: 'language',
        header: 'Language',
        type: 'dropdown',
        width: 140,
        sortable: true,
        filterable: true,
        editable: true,
        groupable: true,
        enumOptions: [
          'English',
          'German',
          'French',
          'Spanish',
          'Urdu',
          'Hindi',
          'Japanese',
          'Chinese',
        ],
      },
      {
        colId: 'country',
        field: 'country',
        header: 'Country',
        type: 'dropdown',
        width: 170,
        sortable: true,
        filterable: true,
        editable: true,
        groupable: true,
         dropdownOptions: [
          { label: 'United States', value: 'United States' },
          { label: 'United Kingdom', value: 'United Kingdom' },
          { label: 'Canada',  value: 'Canada' },
          { label: 'Germany', value: 'Germany' },
          { label: 'France',  value: 'France' },
          { label: 'Australia', value: 'Australia' },
          { label: 'India',   value: 'India' },
          { label: 'United Arab Emirates', value: 'United Arab Emirates' },
          { label: 'Pakistan', value: 'Pakistan' },
        ],
        cellRendererFn: ({ value }) => {
          const name = String(value ?? '');
          const code = countryFlagCodes[name] ?? 'un';
          return `${name ? `<span style="display:flex;align-items:center;gap:7px"><img src="https://flagcdn.com/w20/${code}.png" width="20" height="14" style="border-radius:2px;object-fit:cover;flex-shrink:0" />` : ''}${name}</span>`;
        },
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────
  // Game of Choice
  // ───────────────────────────────────────────────────────────────
  {
    colId: 'grp_game',
    header: 'Game of Choice',
    openByDefault: true,
    field: '',
    type: 'string',
    marryChildren: false,
    children: [
      {
        colId: 'gameName',
        field: 'gameName',
        header: 'Game Name',
        type: 'string',
        width: 190,
        sortable: true,
        filterable: true,
        editable: true,
      },
      {
        colId: 'bought',
        field: 'bought',
        header: 'Bought',
        type: 'boolean',
        width: 110,
        sortable: true,
        filterable: true,
        editable: true,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────
  // Performance
  // ───────────────────────────────────────────────────────────────
  {
    colId: 'grp_performance',
    header: 'Performance',
    openByDefault: true,
    field: '',
    type: 'string',
    marryChildren: false,
    children: [
      {
        colId: 'bankBalance',
        field: 'bankBalance',
        header: 'Bank Balance',
        type: 'currency',
        width: 160,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────
  // Flat Columns
  // ───────────────────────────────────────────────────────────────

  {
    colId: 'rating',
    field: 'rating',
    header: 'Rating',
    type: 'number',
    width: 120,
     cellRendererFn: ({ value }) => {
    const rating = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));

      return `
        <span style="color:#f59e0b;font-size:16px;letter-spacing:1px;">
          ${'★'.repeat(rating)}
        </span>
      `;
    },
    sortable: true,
    filterable: true,
    editable: true,
    aggFunc: 'avg',
  },

  {
    colId: 'totalWinning',
    field: 'totalWinning',
    header: 'Total Winning',
    type: 'currency',
    width: 170,
    sortable: true,
    filterable: true,
    editable: true,
    aggFunc: 'sum',
  },

  // ───────────────────────────────────────────────────────────────
  // Monthly Breakdown
  // ───────────────────────────────────────────────────────────────
  {
    colId: 'grp_monthly',
    header: 'Monthly Breakdown',
    openByDefault: true,
    type: 'string',
    field: '',
    marryChildren: false,
    children: [
      {
        colId: 'january',
        field: 'january',
        header: 'January',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'february',
        field: 'february',
        header: 'February',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'march',
        field: 'march',
        header: 'March',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'april',
        field: 'april',
        header: 'April',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'may',
        field: 'may',
        header: 'May',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'june',
        field: 'june',
        header: 'June',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'july',
        field: 'july',
        header: 'July',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'august',
        field: 'august',
        header: 'August',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'september',
        field: 'september',
        header: 'September',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'october',
        field: 'october',
        header: 'October',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'november',
        field: 'november',
        header: 'November',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
      {
        colId: 'december',
        field: 'december',
        header: 'December',
        type: 'currency',
        width: 130,
        sortable: true,
        filterable: true,
        editable: true,
        aggFunc: 'sum',
      },
    ],
  },
];

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const data = generateEmployees(1000);
  const playerData = generatePlayerData(1000);

  const options: GridOptions = {
    columns: playerColumns,
    data: playerData as unknown as Record<string, unknown>[],
    theme: 'light',
    showCheckboxes: false,
    showSerialNumber: false,
    showVerticalBorders: false,
    rowShading: false,
    showSidePanel: true,
    // showFilterRow: true,

    footerRowHeight: 48,
    rowHeight: 42,
    showFooter: true,
    rowHeightMode: 'fixed',
    showColumnMenu: true,
    dateFormat: 'dd/MM/yyyy',
    currencySymbol: '$',
    locale: 'en-US',
    pagination: {
      enabled: true,
      page: 1,
      pageSize: 100000,
      pageSizeOptions: [5, 10, 15, 20, 50],
      serverSide: false,
    },
    selection: {
      mode: 'multiple',
      checkboxSelection: true,
      headerCheckbox: true,
    },
    editing: {
      mode: 'row',
      singleClickEdit: false,
    },
    enableCellSelection: true,
    showGroupingBar: true,
  };

  const container  = document.getElementById('grid-container')!;
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;

  const allThemes = [
    'pg-quartz-theme', 'pg-alpine-theme',
    'pg-balham-theme', 'pg-material-theme', 'pg-dark-theme',
  ];

  const applyTheme = (theme: string) => {
    allThemes.forEach(t => container.classList.remove(t));
    container.classList.add(theme);
    document.body.classList.toggle('demo-dark', theme === 'pg-dark-theme');
  };

  applyTheme(themeSelect.value);
  themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));

  const grid = new GridCore(container, options);

  // ── Real-time ticker simulation ───────────────────────────────────────────
  // Strategy: mutate data in-place every 500 ms, then push the new values
  // directly into the live DOM — bypassing the grid's render pipeline
  // entirely so there is zero row-rebuild overhead.
  //
  //  • Sparklines  → call renderer.redraw() on each visible canvas
  //  • Salary text → update the cell's textContent in-place
  //
  // This lets the grid display 1 000 rows of live tick data without a single
  // full re-render per frame.

  // Build a nodeId → salary lookup that stays in sync with in-place mutations.
  const salaryByNodeId = new Map<string, number>(
    grid.api.getAllRows()
      .filter(r => Array.isArray(r.data.salaryHistory))
      .map(r => [r.nodeId, r.data.salary as number]),
  );

  // setInterval(() => {
  //   const rows = grid.api.getAllRows();

  //   // ── 1. Mutate all row data ───────────────────────────────────────────
  //   for (const row of rows) {
  //     const history = row.data.salaryHistory;
  //     if (!Array.isArray(history) || history.length === 0) continue;

  //     const last = history[history.length - 1] as number;
  //     const pct  = Math.random() * 0.06 - 0.03;          // ± 3 % random walk
  //     const next = Math.max(18_000, Math.round(last * (1 + pct)));

  //     // Shift in-place — array length stays constant at 12
  //     for (let j = 0; j < history.length - 1; j++) history[j] = history[j + 1];
  //     history[history.length - 1] = next;

  //     row.data.salary = next;
  //     salaryByNodeId.set(row.nodeId, next);
  //   }

  //   // ── 2. Redraw all visible sparkline canvases ─────────────────────────
  //   // The SparklineRenderer already holds a reference to the mutated array;
  //   // redraw() re-parses it and repaints the canvas in one pass.
  //   container.querySelectorAll<HTMLCanvasElement & { _pgSparkline?: { redraw(): void } }>(
  //     '.pg-sparkline',
  //   ).forEach(canvas => canvas._pgSparkline?.redraw());

  //   // ── 3. Update visible salary cells in-place ──────────────────────────
  //   // Walk each rendered row element; update only the salary cell text.
  //   container.querySelectorAll<HTMLElement>('[data-node-id]').forEach(rowEl => {
  //     const nodeId = rowEl.getAttribute('data-node-id');
  //     if (!nodeId) return;
  //     const salary = salaryByNodeId.get(nodeId);
  //     if (salary === undefined) return;
  //     const valueEl = rowEl.querySelector<HTMLElement>('[data-col-id="salary"] .pg-cell__value');
  //     if (valueEl) {
  //       valueEl.textContent = '$' + salary.toLocaleString('en-US');
  //     }
  //   });
  // }, 500);

  // ── FPS METER START (remove this block when done testing) ────────────────
  // const _fpsStyle = document.createElement('style');
  // _fpsStyle.textContent = `
  //   .pg-fps-meter {
  //     position: fixed; top: 10px; right: 10px; z-index: 99999;
  //     background: rgba(0,0,0,.78); border-radius: 5px;
  //     font: bold 13px/1 monospace; padding: 7px 12px;
  //     pointer-events: none; min-width: 90px; text-align: center;
  //     box-shadow: 0 2px 8px rgba(0,0,0,.4);
  //   }
  //   .pg-fps-meter__label { color: #aaa; font-size: 10px; display: block; margin-bottom: 3px; }
  //   .pg-fps-meter__value { font-size: 20px; }
  //   .pg-fps-meter--high .pg-fps-meter__value { color: #4cff72; }
  //   .pg-fps-meter--mid  .pg-fps-meter__value { color: #ffb830; }
  //   .pg-fps-meter--low  .pg-fps-meter__value { color: #ff4f4f; }
  // `;
  // document.head.appendChild(_fpsStyle);

  // const _fpsEl = document.createElement('div');
  // _fpsEl.className = 'pg-fps-meter pg-fps-meter--high';
  // _fpsEl.innerHTML = '<span class="pg-fps-meter__label">FPS</span><span class="pg-fps-meter__value">--</span>';
  // document.body.appendChild(_fpsEl);
  // const _fpsValue = _fpsEl.querySelector('.pg-fps-meter__value') as HTMLElement;

  // let _fpsFrames = 0;
  // let _fpsLast = performance.now();

  // function _measureFPS() {
  //   _fpsFrames++;
  //   const now = performance.now();
  //   if (now - _fpsLast >= 500) {
  //     const fps = Math.round(_fpsFrames / ((now - _fpsLast) / 1000));
  //     _fpsFrames = 0;
  //     _fpsLast = now;
  //     _fpsValue.textContent = String(fps);
  //     _fpsEl.className = 'pg-fps-meter ' + (fps >= 50 ? 'pg-fps-meter--high' : fps >= 30 ? 'pg-fps-meter--mid' : 'pg-fps-meter--low');
  //   }
  //   requestAnimationFrame(_measureFPS);
  // }

  // requestAnimationFrame(_measureFPS);
  // ── FPS METER END ─────────────────────────────────────────────────────────
});
