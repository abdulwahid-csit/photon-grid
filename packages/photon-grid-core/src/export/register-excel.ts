import { registerExporter } from '../export/exporter-registry';
import { createExcelExporter, type SheetJsModule } from './adapters/excel-exporter';
import { SheetJsWorkbookParser } from '../engines/import/adapters/sheetjs-workbook-parser';
import { ImportEngine } from '../engines/import/import-engine';

/**
 * Convenience helper that enables Excel support app-wide: it registers the
 * SheetJS-backed Excel exporter and installs the SheetJS workbook parser as
 * the module-global parser applied to every new grid.
 *
 * Call this once at application bootstrap when the host has installed `xlsx`.
 */
export function registerExcelSupport(xlsx: SheetJsModule): void {
  if (!xlsx) throw new TypeError('registerExcelSupport(xlsx) needs the SheetJS module');

  // Register exporter globally for every grid.
  registerExporter('excel', createExcelExporter(xlsx));

  // Register a global workbook parser so new grids can import `.xlsx` files
  // without per-grid wiring. Hosts that prefer per-grid control may instead
  // call `api.registerImportParser(new SheetJsWorkbookParser(XLSX))`.
  try {
    ImportEngine.registerGlobalWorkbookParser(new SheetJsWorkbookParser(xlsx));
  } catch (err) {
    // Non-fatal: warn so the host sees what's wrong during bootstrap.
    // eslint-disable-next-line no-console
    console.warn('[PhotonGrid] registerExcelSupport: failed to register global parser', err);
  }
}
