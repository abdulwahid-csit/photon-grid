import type { SchedulerEvent, SchedulerResource } from './scheduler-demo.types';

/**
 * Deterministic mock workforce for the scheduler demo.
 *
 * Seeded rather than random so a reload shows the same board — which is what
 * makes "did that change?" answerable while developing, and keeps screenshots
 * stable.
 */

const FIRST = [
  'Amara', 'Tom', 'Priya', 'Diego', 'Wei', 'Sofia', 'Noah', 'Leila',
  'Hannah', 'Marcus', 'Yuki', 'Elena', 'Rahul', 'Clara', 'Omar', 'Grace',
  'Jonas', 'Mei', 'Ibrahim', 'Nadia',
];

const LAST = [
  'Okafor', 'Lindqvist', 'Raman', 'Ferreira', 'Zhang', 'Marchetti', 'Bergman',
  'Haddad', 'Whitfield', 'Osei', 'Tanaka', 'Petrova', 'Mehta', 'Dubois',
  'Farouk', 'Mwangi', 'Andersen', 'Chen', 'Aziz', 'Kowalski',
];

const TEAMS = ['Engineering', 'Support', 'Logistics', 'Field Ops', 'QA', 'Design'];
const ROLES = ['Technician', 'Engineer', 'Lead', 'Supervisor', 'Analyst', 'Specialist'];
const SITES = ['Berlin', 'Lahore', 'Toronto', 'Sydney', 'Lisbon', 'Nairobi'];

/** Seeded RNG, so the board is byte-identical on every reload. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rng: () => number, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const intBetween = (rng: () => number, min: number, max: number): number =>
  Math.floor(rng() * (max - min + 1)) + min;

/** Local midnight, `n` days from `base`. */
function dayAt(base: Date, n: number): number {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + n).getTime();
}

/** Local time on a given day offset, at `hour`. */
function hourAt(base: Date, dayOffset: number, hour: number): number {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour).getTime();
}

/** Builds `count` employees. */
export function buildEmployees(count: number): SchedulerResource[] {
  const rng = mulberry32(0xc0ffee);
  const out: SchedulerResource[] = [];

  for (let i = 0; i < count; i++) {
    const first = pick(rng, FIRST);
    const last = pick(rng, LAST);
    out.push({
      id: `emp-${i + 1}`,
      name: `${first} ${last}`,
      initials: `${first[0]}${last[0]}`,
      team: pick(rng, TEAMS),
      role: pick(rng, ROLES),
      site: pick(rng, SITES),
      capacity: intBetween(rng, 30, 40),
    });
  }

  return out;
}

/**
 * Builds a realistic month of scheduling for the given employees.
 *
 * Deliberately mixes event shapes so every rendering path is exercised: multi-day
 * spans (vacation), single days (sick, training), sub-day blocks (shifts,
 * meetings) that force lane stacking, and locked company-wide holidays that must
 * refuse to move.
 */
export function buildEvents(employees: readonly SchedulerResource[], monthStart: Date): SchedulerEvent[] {
  const rng = mulberry32(0x5eed);
  const events: SchedulerEvent[] = [];
  let seq = 0;

  const id = (): string => `evt-${++seq}`;
  const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

  // Company-wide public holidays: same span on every resource, locked.
  const holidayDays = [Math.floor(daysInMonth * 0.35), Math.floor(daysInMonth * 0.72)];
  for (const day of holidayDays) {
    for (const emp of employees) {
      events.push({
        id: id(),
        resourceId: emp.id,
        start: dayAt(monthStart, day),
        end: dayAt(monthStart, day + 1),
        type: 'publicHoliday',
        title: 'Public Holiday',
      });
    }
  }

  for (const emp of employees) {
    // Weekends, as locked background bands.
    for (let d = 0; d < daysInMonth; d++) {
      const dow = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 + d).getDay();
      if (dow === 0 || dow === 6) {
        events.push({
          id: id(),
          resourceId: emp.id,
          start: dayAt(monthStart, d),
          end: dayAt(monthStart, d + 1),
          type: 'weekend',
          title: '',
        });
      }
    }

    // A multi-day vacation for roughly a third of the workforce.
    if (rng() < 0.34) {
      const startDay = intBetween(rng, 0, Math.max(0, daysInMonth - 6));
      const length = intBetween(rng, 3, 6);
      events.push({
        id: id(),
        resourceId: emp.id,
        start: dayAt(monthStart, startDay),
        end: dayAt(monthStart, startDay + length),
        type: 'vacation',
        title: 'Vacation',
        subtitle: `${length} days`,
      });
    }

    // Occasional sick leave.
    if (rng() < 0.18) {
      const day = intBetween(rng, 0, daysInMonth - 1);
      events.push({
        id: id(),
        resourceId: emp.id,
        start: dayAt(monthStart, day),
        end: dayAt(monthStart, day + 1),
        type: 'sick',
        title: 'Sick Leave',
      });
    }

    // Training days.
    if (rng() < 0.22) {
      const day = intBetween(rng, 0, daysInMonth - 2);
      events.push({
        id: id(),
        resourceId: emp.id,
        start: dayAt(monthStart, day),
        end: dayAt(monthStart, day + 2),
        type: 'training',
        title: 'Training',
      });
    }

    // Shifts across the month. Sub-day spans, so several on one day stack into
    // lanes -- the case that exercises the lane layout.
    for (let d = 0; d < daysInMonth; d++) {
      const dow = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 + d).getDay();
      if (dow === 0 || dow === 6) continue;
      if (rng() > 0.45) continue;

      const night = rng() < 0.25;
      events.push({
        id: id(),
        resourceId: emp.id,
        start: hourAt(monthStart, d, night ? 22 : 8),
        end: hourAt(monthStart, d + (night ? 1 : 0), night ? 6 : 16),
        type: night ? 'nightShift' : 'shift',
        title: night ? 'Night Shift' : 'Day Shift',
      });

      // Overtime tacked onto some day shifts -- overlaps the shift, forcing a
      // second lane.
      if (!night && rng() < 0.15) {
        events.push({
          id: id(),
          resourceId: emp.id,
          start: hourAt(monthStart, d, 16),
          end: hourAt(monthStart, d, 19),
          type: 'overtime',
          title: 'Overtime',
        });
      }

      // Meetings, deliberately overlapping shift hours.
      if (rng() < 0.12) {
        const h = intBetween(rng, 9, 14);
        events.push({
          id: id(),
          resourceId: emp.id,
          start: hourAt(monthStart, d, h),
          end: hourAt(monthStart, d, h + 1),
          type: 'meeting',
          title: 'Team Sync',
        });
      }
    }

    // Maintenance windows for field teams.
    if (emp.team === 'Field Ops' && rng() < 0.4) {
      const day = intBetween(rng, 0, daysInMonth - 1);
      events.push({
        id: id(),
        resourceId: emp.id,
        start: hourAt(monthStart, day, 6),
        end: hourAt(monthStart, day, 10),
        type: 'maintenance',
        title: 'Maintenance',
      });
    }
  }

  return events;
}
