import { GridCore } from '../packages/photon-grid-core/src/index';
import type { ColumnDef } from '../packages/photon-grid-core/src/types/column.types';
import type { GridOptions } from '../packages/photon-grid-core/src/types/grid.types';

/**
 * Standalone Tree Data demo — an employee org chart.
 *
 * Exercises the `'parentId'` hierarchy source end to end: every employee
 * record carries its own `id` and its manager's id as `parentId`; Photon
 * Grid builds the reporting hierarchy, indents rows by level, and renders
 * the expand/collapse chevron on the Employee column (`treeData.toggleColumnId`)
 * — see `src/engines/tree/tree-data-service.ts` for how the hierarchy itself
 * is constructed.
 */

// ─── Data model ────────────────────────────────────────────────────────────

type EmploymentType = 'Permanent' | 'Contract';
type PaymentMethod = 'Check' | 'Bank Transfer' | 'Cash';
type EmployeeStatus = 'Pending' | 'Paid';

interface Employee {
  id: string;
  parentId: string | null;
  name: string;
  role: string;
  department: string;
  employmentType: EmploymentType;
  country: string;
  countryFlag: string;
  joinDate: string;
  salary: number;
  paymentMethod: PaymentMethod;
  status: EmployeeStatus;
}

function asEmployee(row: Record<string, unknown>): Employee {
  return row as unknown as Employee;
}

// ─── Synthetic org chart generation ───────────────────────────────────────

const FIRST_NAMES = [
  'Adrian', 'Cheryl', 'Bryan', 'Gregory', 'Deborah', 'Amy', 'Ian', 'Shawn', 'Aaron', 'Janice',
  'Clayton', 'Andrew', 'Bradley', 'Monica', 'Derek', 'Felicia', 'Marcus', 'Natalie', 'Oscar', 'Priya',
  'Quentin', 'Renee', 'Samuel', 'Tanya', 'Victor', 'Wendy', 'Xavier', 'Yolanda', 'Zachary', 'Bianca',
];
const LAST_NAMES = [
  'Conner', 'Browning', 'Hawkins', 'Walker', 'Morales', 'Rojas', 'Kramer', 'Hendrix', 'Hull', 'Rice',
  'Conway', 'Ford', 'Johnson', 'Barnes', 'Coleman', 'Diaz', 'Ellison', 'Fischer', 'Garrison', 'Hoyt',
];
const DEPARTMENTS = ['Executive Management', 'Customer Support', 'Engineering', 'Sales', 'Marketing', 'Finance'];
const COUNTRIES = [
  { name: 'Netherlands', code: 'nl' },
  { name: 'United States', code: 'us' },
  { name: 'Ireland', code: 'ie' },
  { name: 'Portugal', code: 'pt' },
  { name: 'Italy', code: 'it' },
  { name: 'United Kingdom', code: 'gb' },
  { name: 'France', code: 'fr' },
  { name: 'Spain', code: 'es' },
]; 
const PAYMENT_METHODS: PaymentMethod[] = ['Check', 'Bank Transfer', 'Cash'];

let idCounter = 300000;
function nextId(): string {
  idCounter += Math.floor(100 + Math.random() * 899);
  return String(idCounter);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(startYear: number, endYear: number): string {
  const year = startYear + Math.floor(Math.random() * (endYear - startYear + 1));
  const month = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const day = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildEmployee(parentId: string | null, role: string, department: string, salaryRange: [number, number]): Employee {
  const country = pick(COUNTRIES);
  return {
    id: nextId(),
    parentId,
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    role,
    department,
    employmentType: Math.random() < 0.35 ? 'Contract' : 'Permanent',
    country: country.name,
    countryFlag: country.code,
    joinDate: randomDate(2000, 2023),
    salary: Math.round((salaryRange[0] + Math.random() * (salaryRange[1] - salaryRange[0])) / 10) * 10,
    paymentMethod: pick(PAYMENT_METHODS),
    status: Math.random() < 0.45 ? 'Paid' : 'Pending',
  };
}

/** Builds a 3-level org chart: 1 COO -> several executives/heads -> several direct reports each. */
function buildOrgChart(): Employee[] {
  const employees: Employee[] = [];

  const coo = buildEmployee(null, 'COO', 'Executive Management', [140000, 180000]);
  employees.push(coo);

  const execRoles = ['CTO', 'Exec Vice President', 'Head of Department', 'VP of Operations', 'VP of Sales', 'Head of Finance', 'VP of Marketing'];
  for (const role of execRoles) {
    const exec = buildEmployee(coo.id, role, 'Customer Support', [90000, 120000]);
    employees.push(exec);

    const reportCount = 4 + Math.floor(Math.random() * 6);
    for (let i = 0; i < reportCount; i++) {
      employees.push(buildEmployee(exec.id, 'Employee', 'Customer Support', [40000, 85000]));
    }
  }

  return employees;
}

const employees = buildOrgChart();

// ─── Column definitions ─────────────────────────────────────────────────────

const AVATAR_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#db2777'];
function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
function initialsFor(name: string): string {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
}

const columns: ColumnDef[] = [
  { colId: 'id', field: 'id', header: 'ID', type: 'string', width: 100, sortable: true, rowDrag: true },
  {
    colId: 'employee',
    field: 'name',
    header: 'Employee',
    type: 'string',
    pinned: 'left',
    minWidth: 300,
    width: 300,
    sortable: true,
    filterable: true,
    renderer: {
      display: ({ row }) => {
        const emp = asEmployee(row);
        const wrap = document.createElement('div');
        wrap.className = 'org-employee-cell';

        const avatar = document.createElement('div');
        avatar.className = 'org-avatar';
        avatar.style.background = avatarColorFor(emp.name);
        avatar.textContent = initialsFor(emp.name);

        const text = document.createElement('div');
        text.className = 'org-employee-text';
        const nameEl = document.createElement('div');
        nameEl.className = 'org-employee-name';
        nameEl.textContent = emp.name;
        const roleEl = document.createElement('div');
        roleEl.className = 'org-employee-role';
        roleEl.textContent = emp.role;
        text.appendChild(nameEl);
        text.appendChild(roleEl);

        wrap.appendChild(avatar);
        wrap.appendChild(text);
        return wrap;
      },
    },
  },
  {
    colId: 'department',
    field: 'department',
    header: 'Department',
    type: 'string',
    minWidth: 231,
    width: 231,
    sortable: true,
    filterable: true,
    renderer: {
      display: ({ row }) => {
        const emp = asEmployee(row);
        const badge = document.createElement('span');
        const isExec = emp.department === 'Executive Management';
        badge.className = `org-dept-badge${isExec ? ' org-dept-badge--exec' : ''}`;
        const dot = document.createElement('span');
        dot.className = 'org-dept-dot';
        badge.appendChild(dot);
        badge.appendChild(document.createTextNode(emp.department));
        return badge;
      },
    },
  },
  { colId: 'employmentType', field: 'employmentType', header: 'Employment Type', type: 'string', minWidth: 200, width: 200, sortable: true, filterable: true },
  {
    colId: 'location',
    field: 'country',
    header: 'Location',
    type: 'string',
    minWidth: 200,
    width: 200,
    sortable: true,
    renderer: {
      display: ({ row }) => {
          const emp = asEmployee(row);

          return `
            <span style="display:flex;align-items:center;gap:7px">
              <img
                src="https://flagcdn.com/w20/${emp.countryFlag}.png"
                width="20"
                height="14"
                style="border-radius:2px;object-fit:cover;flex-shrink:0"
                alt="${emp.country}"
              />
              <span>${emp.country}</span>
            </span>
          `;
        },
    },
  },
  { colId: 'joinDate', field: 'joinDate', header: 'Join Date', type: 'date', minWidth: 120, sortable: true },
  {
    colId: 'salary',
    field: 'salary',
    header: 'Salary',
    type: 'currency',
    minWidth: 200,
    width: 200,
    sortable: true,
    renderer: {
      display: ({ row }) => `$${asEmployee(row).salary.toLocaleString('en-US')}`,
    },
  },
  { colId: 'paymentMethod', field: 'paymentMethod', header: 'Payment Method', type: 'string', minWidth: 160, width: 160, sortable: true, filterable: true },
  {
    colId: 'status',
    field: 'status',
    header: 'Status',
    type: 'string',
    minWidth: 200,
    width: 200,
    sortable: true,
    filterable: true,
    renderer: {
      display: ({ row }) => {
        const emp = asEmployee(row);
        const badge = document.createElement('span');
        const isPaid = emp.status === 'Paid';
        badge.className = `org-status-badge${isPaid ? ' org-status-badge--paid' : ' org-status-badge--pending'}`;
        badge.textContent = (isPaid ? '✓ ' : '') + emp.status;
        return badge;
      },
    },
  },
  {
    colId: 'contact',
    field: 'id',
    header: 'Contact',
    type: 'string',
    width: 120,
    minWidth: 120,
    pinned: 'right',
    sortable: false,
    filterable: false,
    renderer: {
      display: () => {
        const wrap = document.createElement('div');
        wrap.className = 'org-contact-cell';
        const link = document.createElement('span');
        link.className = 'org-contact-icon';
        link.textContent = 'in';
        const mail = document.createElement('span');
        mail.className = 'org-contact-icon';
        mail.textContent = '✉';
        wrap.appendChild(link);
        wrap.appendChild(mail);
        return wrap;
      },
    },
  },
];

// ─── Grid options ────────────────────────────────────────────────────────────

const options: GridOptions = {
  columns,
  data: employees as unknown as Record<string, unknown>[],
  theme: 'light',
  rowHeight: 65,
  headerRowHeight: 40,
  showCheckboxes: false,
  showSerialNumber: false,
  showVerticalBorders: true,
  rowShading: true,

  treeData: {
    enabled: true,
    mode: 'parentId',
    idField: 'id',
    parentIdField: 'parentId',
    toggleColumnId: 'employee',
    defaultExpanded: 2,
  },

  photonAI: {
    enabled: true,
  },
};

// ─── Bootstrap ───────────────────────────────────────────────────────────────

let grid: GridCore;

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('grid-container')!;
  grid = new GridCore(container, options);
});
