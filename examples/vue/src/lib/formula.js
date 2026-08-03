/**
 * Spreadsheet-shaped columns and seed rows for the Formula Playground.
 *
 * Formulas are declared entirely in the column definitions
 * (`ColumnDef.formula`) and in row data (`=`-prefixed values); the grid
 * discovers and registers them at load, so nothing here is imperative.
 */

/** Number of generated data rows (a TOTAL row is appended on top of these). */
export const ROW_COUNT = 1000;
/** Extra spreadsheet-style scratch columns appended after `grandTotal`. */
export const EXTRA_COLUMNS = 50;

const PRODUCTS = [
  'Wireless Mouse', 'Mechanical Keyboard', '27" Monitor', 'USB-C Dock',
  'Laptop Stand', 'Webcam 1080p', 'Noise-cancel Headset', 'Desk Lamp',
  'External SSD', 'Gaming Chair', 'Bluetooth Speaker', 'Graphics Tablet',
  'Smartphone Stand', 'Portable Charger', 'Office Chair', 'Microphone',
  'LED Keyboard', 'Wireless Charger', 'HDMI Cable', 'Ethernet Adapter',
];

/** Spreadsheet column name for a zero-based index: 0 → `A`, 26 → `AA`. */
function excelColumnName(index) {
  let name = '';
  let i = index;
  while (i >= 0) {
    name = String.fromCharCode((i % 26) + 65) + name;
    i = Math.floor(i / 26) - 1;
  }
  return name;
}

export function buildColumns(extraColumns) {
  const columns = [
    { colId: 'product', field: 'product', header: excelColumnName(0), type: 'string', rowDrag: true, minWidth: 160, width: 160, flex: 1 },
    { colId: 'days', field: 'day', header: excelColumnName(1), type: 'string', editable: true, minWidth: 120, flex: 1 },
    { colId: 'quantity', field: 'quantity', header: excelColumnName(2), type: 'number', editable: true, minWidth: 120, flex: 1 },
    { colId: 'unitPrice', field: 'unitPrice', header: excelColumnName(3), type: 'currency', editable: true, minWidth: 120, flex: 1 },
    {
      colId: 'total', field: 'total', header: excelColumnName(4), type: 'currency',
      editable: true, allowFormula: true, formula: '=quantity * unitPrice', minWidth: 120, flex: 1,
    },
    { colId: 'taxRate', field: 'taxRate', header: excelColumnName(5), type: 'number', editable: true, minWidth: 120, flex: 1 },
    {
      colId: 'grandTotal', field: 'grandTotal', header: excelColumnName(6), type: 'currency',
      editable: true, allowFormula: true, formula: '=total * (1 + taxRate)', minWidth: 120, flex: 1,
    },
  ];

  // Scratch columns, continuing the spreadsheet naming from H onwards.
  const startIndex = columns.length;
  for (let i = 0; i < extraColumns; i++) {
    columns.push({
      colId: `col${startIndex + i}`,
      field: `col${startIndex + i}`,
      header: excelColumnName(startIndex + i),
      type: 'number',
      editable: true,
      minWidth: 120,
      flex: 1,
    });
  }

  return columns;
}

/**
 * Seed rows. `total`/`grandTotal` are **not** set on the product rows — the
 * column formulas fill them. Every tenth row carries a per-row override in its
 * data, and the final `TOTAL` row carries row-data formulas that aggregate the
 * rows above, overriding the column formula for that one row.
 */
export function buildData(count) {
  const rows = [];

  for (let i = 0; i < count; i++) {
    const row = {
      product: PRODUCTS[i % PRODUCTS.length],
      quantity: Math.floor(Math.random() * 20) + 1,
      unitPrice: Math.floor(Math.random() * 250) + 20,
      taxRate: Math.random() > 0.5 ? 0.08 : 0.05,
    };

    if ((i + 1) % 10 === 0) {
      row.total = '=quantity * unitPrice * 0.9';
    }

    rows.push(row);
  }

  rows.push({
    product: 'TOTAL',
    total: `=SUM(D1:D${count})`,
    grandTotal: `=SUM(F1:F${count})`,
  });

  return rows;
}
