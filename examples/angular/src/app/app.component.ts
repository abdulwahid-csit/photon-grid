import { ChangeDetectionStrategy, Component } from '@angular/core';

import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef, GridApi, GridOptions } from 'photon-grid-core';
import type { RowClickPayload, RowSelectedEvent } from 'photon-grid-core';

/**
 * Minimal demonstration of the `photon-grid-angular` wrapper:
 * `columns`, `dataSet` and `options` inputs plus a couple of output events.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PhotonGridComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  readonly title = 'Photon Grid — Angular example';

  /** Column definitions bound to the grid's `columns` input. */
  readonly columns: ColumnDef[] = [
    { colId: 'id', field: 'id', header: 'ID', type: 'number', width: 80 },
    { colId: 'name', field: 'name', header: 'Name', type: 'string', width: 180 },
    { colId: 'department', field: 'department', header: 'Department', type: 'string', width: 160, flex: 1 },
    { colId: 'salary', field: 'salary', header: 'Salary', type: 'currency', width: 140 },
    { colId: 'active', field: 'active', header: 'Active', type: 'boolean', width: 100 },
  ];

  /** Row data bound to the grid's `dataSet` input. */
  readonly data: Record<string, unknown>[] = [
    { id: 1, name: 'Alice Johnson', department: 'Engineering', salary: 120000, active: true },
    { id: 2, name: 'Brian Smith', department: 'Design', salary: 95000, active: true },
    { id: 3, name: 'Carla Diaz', department: 'Engineering', salary: 110000, active: false, rowDrag: true },
    { id: 4, name: 'David Lee', department: 'Sales', salary: 88000, active: true },
    { id: 5, name: 'Ella Brown', department: 'Marketing', salary: 92000, active: false },
    { id: 6, name: 'Frank Miller', department: 'Engineering', salary: 105000, active: true },
    { id: 7, name: 'Grace Wilson', department: 'Sales', salary: 99000, active: true },
    { id: 8, name: 'Henry Moore', department: 'Design', salary: 87000, active: false },
  ];

  /** Remaining grid configuration bound to the grid's `options` input. */
  readonly options: Partial<GridOptions> = {
    theme: 'light',
    showCheckboxes: true,
    showSerialNumber: true,
    rowShading: true,
    selection: { mode: 'multiple' },
  };

  onGridReady(api: GridApi): void {
    // The GridApi is available here for imperative calls (sort, filter, export…).
    console.log('[photon-grid] ready — visible rows:', api.getVisibleRows().length);
  }

  onRowClicked(event: RowClickPayload): void {
    console.log('[photon-grid] row clicked:', event);
  }

  onRowSelected(event: RowSelectedEvent): void {
    console.log('[photon-grid] selection changed — selected:', event.selectedCount);
  }
}
