/**
 * Mock book of business + column definitions for the Master/Detail demo.
 *
 * Everything here is deterministic: the same accounts, orders, colours and
 * health states appear on every reload, which is what makes the demo's
 * screenshots and "did that change?" comparisons meaningful.
 */

/** Accounts in the book of business. */
const ACCOUNT_COUNT = 26;

/** Artificial latency on the detail fetch, so the lazy load is actually visible. */
export const DETAIL_LATENCY_MS = 320;

/** Detail panels stop growing here and start scrolling. */
export const DETAIL_MAX_HEIGHT = 320;

const REGIONS = ['EMEA', 'AMER', 'APAC', 'LATAM'];
const PLANS = ['Enterprise', 'Business', 'Team', 'Starter'];
const ACCOUNT_STATUS = ['Healthy', 'At risk', 'Churn risk'];
const ORDER_STATUS = ['Delivered', 'In transit', 'Processing', 'Backordered'];
const OWNERS = [
  'Amara Okafor', 'Tom Lindqvist', 'Priya Raman', 'Diego Ferreira',
  'Wei Zhang', 'Sofia Marchetti', 'Noah Bergman', 'Leila Haddad',
];
const NOUNS = [
  'Northwind', 'Contoso', 'Fabrikam', 'Adventure', 'Litware', 'Proseware',
  'Tailspin', 'Wingtip', 'Coho', 'Lucerne', 'Trey', 'Woodgrove', 'Alpine',
];
const SUFFIXES = ['Logistics', 'Systems', 'Industries', 'Partners', 'Labs', 'Group'];
const COLOURS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#db2777', '#4f46e5', '#0d9488'];
const CARRIERS = ['DHL', 'FedEx', 'Maersk', 'UPS', 'DB Schenker'];

/** Deterministic 31-bit hash, so every reload shows the same book of business. */
function hash(n) {
  return Math.abs((n * 2654435761) % 1000003);
}

/** Up to two initials from an account name, for the avatar chip. */
function initials(name) {
  return name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase();
}

/**
 * Escapes interpolated values. The renderers below return an HTML string, so
 * anything originating in data has to be neutralised before it reaches
 * `innerHTML`.
 */
function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A pill whose modifier class is derived from the label itself. */
function tag(label) {
  const modifier = label.toLowerCase().replace(/[^a-z]+/g, '-');
  return `<span class="md-tag md-tag--${modifier}">${escapeHtml(label)}</span>`;
}

/**
 * Builds the accounts and their orders in one pass, so ids stay in step.
 *
 * @returns {{ accounts: Record<string, unknown>[], ordersByAccount: Map<string, Record<string, unknown>[]> }}
 */
export function buildBook() {
  const accounts = [];
  const ordersByAccount = new Map();

  for (let i = 0; i < ACCOUNT_COUNT; i++) {
    const seed = hash(i + 1);
    const name = `${NOUNS[seed % NOUNS.length]} ${SUFFIXES[(seed >> 4) % SUFFIXES.length]}`;
    const id = `ACC-${String(1000 + i)}`;
    // Every fourth account deliberately has no orders, so `hasDetail` has
    // something to hide a toggle for.
    const orderCount = i % 4 === 3 ? 0 : 3 + (seed % 7);

    const orders = [];
    for (let o = 0; o < orderCount; o++) {
      const orderSeed = hash(seed + o * 7919);
      const status = ORDER_STATUS[orderSeed % ORDER_STATUS.length];
      orders.push({
        __photon_id__: `${id}-${o}`,
        ref: `SO-${String((orderSeed % 900000) + 100000)}`,
        placed: new Date(2025, (orderSeed >> 3) % 12, 1 + (orderSeed % 27)).toISOString().slice(0, 10),
        items: 1 + (orderSeed % 40),
        value: (2 + (orderSeed % 90)) * 250,
        // Delivered orders are complete by definition; the rest are partway.
        fulfilled: status === 'Delivered' ? 1 : Math.round((orderSeed % 90) / 10) / 10,
        status,
        carrier: CARRIERS[(orderSeed >> 5) % CARRIERS.length],
      });
    }
    ordersByAccount.set(id, orders);

    accounts.push({
      __photon_id__: id,
      id,
      account: name,
      domain: `${name.split(' ')[0].toLowerCase()}.com`,
      colour: COLOURS[seed % COLOURS.length],
      region: REGIONS[seed % REGIONS.length],
      owner: OWNERS[(seed >> 2) % OWNERS.length],
      plan: PLANS[(seed >> 6) % PLANS.length],
      seats: 25 + (seed % 950),
      arr: (12 + (seed % 340)) * 1000,
      orderCount,
      renewal: new Date(2026, seed % 12, 1 + (seed % 27)).toISOString().slice(0, 10),
      status: ACCOUNT_STATUS[(seed >> 8) % ACCOUNT_STATUS.length],
    });
  }

  return { accounts, ordersByAccount };
}

/** Columns for the master (accounts) grid. */
export function buildAccountColumns() {
  return [
    {
      colId: 'account', field: 'account', header: 'Account', type: 'string',
      width: 260, pinned: 'left', sortable: true, filterable: true,
      renderer: {
        display: ({ value, row }) => {
          const name = String(value ?? '');
          return `<span class="md-account">
            <span class="md-account__badge" style="background:${String(row.colour)}">${initials(name)}</span>
            <span class="md-account__text">
              <span class="md-account__name">${escapeHtml(name)}</span>
              <span class="md-account__domain">${escapeHtml(String(row.domain))}</span>
            </span>
          </span>`;
        },
      },
    },
    { colId: 'region', field: 'region', header: 'Region', type: 'string', width: 100, sortable: true, filterable: true, flex: 1 },
    { colId: 'owner', field: 'owner', header: 'Account owner', type: 'string', width: 170, sortable: true, filterable: true, flex: 1 },
    {
      colId: 'plan', field: 'plan', header: 'Plan', type: 'string', width: 130, sortable: true, filterable: true, flex: 1,
      renderer: { display: ({ value }) => tag(String(value ?? '')) },
    },
    { colId: 'seats', field: 'seats', header: 'Seats', type: 'number', width: 100, textAlign: 'right', sortable: true, flex: 1 },
    { colId: 'arr', field: 'arr', header: 'ARR', type: 'currency', width: 130, textAlign: 'right', sortable: true, flex: 1 },
    { colId: 'orderCount', field: 'orderCount', header: 'Orders', type: 'number', width: 100, textAlign: 'right', sortable: true, flex: 1 },
    { colId: 'renewal', field: 'renewal', header: 'Renews', type: 'date', width: 130, sortable: true, flex: 1 },
    {
      colId: 'status', field: 'status', header: 'Health', type: 'string', width: 130, sortable: true, filterable: true, flex: 1,
      renderer: { display: ({ value }) => tag(String(value ?? '')) },
    },
  ];
}

/** Columns for every nested orders grid. */
export function buildOrderColumns() {
  return [
    { colId: 'ref', field: 'ref', header: 'Order', type: 'string', width: 150, sortable: true, flex: 1 },
    { colId: 'placed', field: 'placed', header: 'Placed', type: 'date', width: 120, sortable: true, flex: 1 },
    { colId: 'items', field: 'items', header: 'Items', type: 'number', width: 90, textAlign: 'right', sortable: true, flex: 1 },
    { colId: 'value', field: 'value', header: 'Value', type: 'currency', width: 120, textAlign: 'right', sortable: true, flex: 1 },
    {
      colId: 'fulfilled', field: 'fulfilled', header: 'Fulfilment', type: 'number', width: 170, sortable: true, flex: 1,
      renderer: {
        display: ({ value }) => {
          const pct = Math.round(Number(value ?? 0) * 100);
          const done = pct >= 100 ? ' md-progress__fill--done' : '';
          return `<span class="md-progress">
            <span class="md-progress__track">
              <span class="md-progress__fill${done}" style="width:${pct}%"></span>
            </span>
            <span class="md-progress__value">${pct}%</span>
          </span>`;
        },
      },
    },
    {
      colId: 'status', field: 'status', header: 'Status', type: 'string', width: 140, sortable: true, filterable: true, flex: 1,
      renderer: { display: ({ value }) => tag(String(value ?? '')) },
    },
    { colId: 'carrier', field: 'carrier', header: 'Carrier', type: 'string', width: 130, sortable: true, flex: 1 },
  ];
}
