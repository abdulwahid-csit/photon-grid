import {
    ChangeDetectionStrategy,
    Component,
    OnInit,
    ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef } from 'photon-grid-angular';
import type { GridApi, GridOptions, ThemeMode, ThemeVariant } from 'photon-grid-core';
// Subpath import: the scheduler lives behind its own entry point so a grid that
// never uses it pulls in none of this code and none of its stylesheet.
// import { SchedulerPlugin } from 'photon-grid-core/plugins/scheduler';

import { buildEmployees, buildEvents } from './scheduler-demo.data';
import type { SchedulerEvent, SchedulerResource } from './scheduler-demo.types';

/** Timeline granularity offered by the view switcher. */
type SchedulerView = 'day' | 'week' | 'month';

/**
 * Employee scheduler — vacation, shifts, overtime, training and holidays across
 * a month, for 100 employees.
 *
 * The layout is the point of the demo, and it is worth stating explicitly:
 * **the employee columns on the left are ordinary pinned grid columns, and the
 * rows are ordinary grid rows.** Sorting, filtering, grouping, row selection and
 * row virtualization are therefore the grid's, not the scheduler's. The plugin
 * contributes one thing — a virtualized timeline layer beside those columns,
 * with event bars positioned in the grid's own rebased row space, so the two
 * stay pixel-locked through any scroll.
 *
 * Events are supplied **separately** from the row data. An employee is a row; an
 * employee's schedule is an unbounded, independently-mutating set that would
 * force a full row-pipeline re-run on every change if it were nested inside.
 */
@Component({
    selector: 'app-scheduler-demo',
    standalone: true,
    imports: [PhotonGridComponent, CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    // The scheduler renders into grid-owned DOM, outside this component's view,
    // so scoped styles would never reach it. Everything below is namespaced
    // under `sd-` / `sd__`.
    encapsulation: ViewEncapsulation.None,
    template: `
        <!-- <header class="sd__header">
            <div class="sd__intro">
                <h2 class="sd__title">Employee Scheduler</h2>
                <p class="sd__subtitle">
                    {{ employees.length }} employees and {{ events.length }} events across
                    {{ monthLabel }}. The left-hand employee columns are ordinary pinned grid
                    columns over ordinary grid rows — the plugin adds only the timeline beside
                    them, positioned in the grid's own row space so the two stay locked
                    together through any scroll. Drag a bar to move it, drag its edge to
                    resize, click to select (Ctrl for multiple, Shift for a range).
                </p>
            </div>

            <div class="sd__controls">
                <div class="sd__segmented" role="group" aria-label="Timeline view">
                    <button
                        *ngFor="let option of viewOptions"
                        type="button"
                        class="sd__seg"
                        [class.sd__seg--on]="view === option.value"
                        [attr.aria-pressed]="view === option.value"
                        (click)="setView(option.value)"
                    >{{ option.label }}</button>
                </div>

                <label class="sd__field">
                    <span class="sd__field-label">Theme</span>
                    <select class="sd__select" [value]="variant" (change)="onVariantChange($event)">
                        <option *ngFor="let v of variants" [value]="v">{{ v }}</option>
                    </select>
                </label>

                <button
                    type="button"
                    class="sd__btn"
                    [attr.aria-pressed]="mode === 'dark'"
                    (click)="toggleMode()"
                >{{ mode === 'dark' ? '&#9790; Dark' : '&#9728; Light' }}</button>

                <button type="button" class="sd__btn sd__btn--ghost" (click)="clearSelection()">
                    Clear selection
                </button>
            </div>
        </header>

        <dl class="sd__stats">
            <div class="sd__stat"><dt>Employees</dt><dd>{{ employees.length }}</dd></div>
            <div class="sd__stat"><dt>Events</dt><dd>{{ events.length }}</dd></div>
            <div class="sd__stat sd__stat--accent"><dt>Selected</dt><dd>{{ selectedCount }}</dd></div>
            <div class="sd__stat"><dt>View</dt><dd>{{ view }}</dd></div>
            <div class="sd__stat sd__stat--wide">
                <dt>Last action</dt>
                <dd class="sd__stat-text">{{ lastAction }}</dd>
            </div>
        </dl>

        <section class="sd__grid">
            <photon-grid-angular
                [columns]="columns"
                [dataSet]="employees"
                [options]="options"
                (gridReady)="onGridReady($event)"
            ></photon-grid-angular>
        </section> -->
    `,
    styles: [`
        .sd__header {
            display: flex; align-items: flex-start; justify-content: space-between;
            gap: 24px; flex-wrap: wrap; margin: 32px 0 12px;
        }
        .sd__intro { min-width: 0; }
        .sd__title { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
        .sd__subtitle {
            margin: 0; max-width: 78ch; color: #64748b;
            font-size: 13px; line-height: 1.6;
        }

        .sd__controls {
            display: inline-flex; align-items: center; gap: 12px;
            margin-left: auto; flex: none; flex-wrap: wrap;
        }

        .sd__segmented {
            display: inline-flex; border: 1px solid #cbd5e1;
            border-radius: 8px; overflow: hidden; background: #fff;
        }
        .sd__seg {
            border: 0; background: transparent; color: #334155; cursor: pointer;
            padding: 8px 14px; font: inherit; font-size: 13px; font-weight: 500;
            text-transform: capitalize;
        }
        .sd__seg + .sd__seg { border-left: 1px solid #e2e8f0; }
        .sd__seg--on { background: #2563eb; color: #fff; }

        .sd__field { display: inline-flex; align-items: center; gap: 8px; }
        .sd__field-label {
            font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
            text-transform: uppercase; color: #64748b;
        }
        .sd__select, .sd__btn {
            border: 1px solid #cbd5e1; background: #fff; color: #0f172a;
            border-radius: 8px; padding: 8px 12px; font: inherit; font-size: 13px;
            font-weight: 500; cursor: pointer; text-transform: capitalize;
        }
        .sd__btn--ghost { color: #475569; }
        .sd__select:focus-visible, .sd__btn:focus-visible {
            outline: 2px solid #2563eb; outline-offset: 1px;
        }

        .sd__stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 12px; }
        .sd__stat {
            flex: 1 1 120px; border: 1px solid #e2e8f0; border-radius: 8px;
            padding: 8px 12px; background: #f8fafc;
        }
        .sd__stat dt {
            font-size: 11px; text-transform: uppercase;
            letter-spacing: 0.04em; color: #64748b;
        }
        .sd__stat dd {
            margin: 2px 0 0; font-size: 18px; font-weight: 600;
            font-variant-numeric: tabular-nums; color: #0f172a;
        }
        .sd__stat--accent dd { color: #2563eb; }
        .sd__stat--wide { flex: 2 1 280px; }
        .sd__stat-text { font-size: 13px; font-weight: 500; }

        .sd__grid { height: 640px; }

        /* Employee cell renderer. Class-based rather than inline styles so a
           theme change restyles it and the markup stays readable. */
        .sd-emp { display: flex; align-items: center; gap: 10px; min-width: 0; }
        .sd-emp__avatar {
            flex: 0 0 auto; width: 28px; height: 28px; border-radius: 999px;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 700;
            color: hsl(var(--sd-hue) 65% 28%);
            background: hsl(var(--sd-hue) 65% 88%);
        }
        .sd-emp__text { min-width: 0; line-height: 1.25; }
        .sd-emp__name {
            display: block; font-weight: 600; color: var(--pg-colors-text-primary);
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .sd-emp__role {
            display: block; font-size: 11px; color: var(--pg-colors-text-secondary);
        }
    `],
})
export class SchedulerDemoComponent {
    // readonly viewOptions: ReadonlyArray<{ value: SchedulerView; label: string }> = [
    //     { value: 'day', label: 'Day' },
    //     { value: 'week', label: 'Week' },
    //     { value: 'month', label: 'Month' },
    // ];

    // readonly variants: readonly ThemeVariant[] = ['ion', 'neon', 'photon', 'quantum'];

    // view: SchedulerView = 'month';
    // variant: ThemeVariant = 'ion';
    // mode: ThemeMode = 'light';

    // employees: SchedulerResource[] = [];
    // events: SchedulerEvent[] = [];
    // columns: ColumnDef[] = [];

    // selectedCount = 0;
    // lastAction = 'drag a bar to move it, or drag its edge to resize';
    // monthLabel = '';

    // /**
    //  * Grid options.
    //  *
    //  * `rowHeight` is set explicitly here — unlike the Customer Orders demo,
    //  * where the variant default is the point — because a scheduler row has to be
    //  * tall enough for two or three stacked lanes to stay legible.
    //  *
    //  * Assigned in `ngOnInit` rather than as a field initialiser because the
    //  * plugin instance has to be constructed with the generated data first.
    //  */
    // options: Partial<GridOptions> = {};

    // private api: GridApi | null = null;
    // /** The registered plugin, so the view switcher can drive its API. */
    // private scheduler: SchedulerPlugin | null = null;

    // ngOnInit(): void {
    //     const monthStart = new Date();
    //     monthStart.setDate(1);
    //     monthStart.setHours(0, 0, 0, 0);

    //     this.employees = buildEmployees(100);
    //     this.events = buildEvents(this.employees, monthStart);
    //     this.columns = this.buildColumns();

    //     this.monthLabel = new Intl.DateTimeFormat('en-US', {
    //         month: 'long',
    //         year: 'numeric',
    //     }).format(monthStart);

    //     const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

    //     this.scheduler = new SchedulerPlugin({
    //         resources: this.employees,
    //         events: this.events,
    //         view: 'month',
    //         range: { start: monthStart.getTime(), end: monthEnd.getTime() },
    //         // A slot narrower than its own label communicates nothing, so the
    //         // timeline trades total span for legibility and scrolls instead.
    //         slotWidth: 200,
    //         minSlotWidth: 200,
    //         // An 8-hour shift inside a 200px day slot is 66px wide, which cannot
    //         // hold its own label. Short events render at this floor and overlap
    //         // instead; lane stacking still separates them vertically.
    //         minEventWidth: 200,
    //         // Selection state lives in the plugin; the demo mirrors the count
    //         // into its own field so the stats strip can show it.
    //         onSelectionChanged: (selected) => {
    //             this.selectedCount = selected.length;
    //             this.lastAction = selected.length
    //                 ? `selected ${selected.length} event(s)`
    //                 : 'cleared selection';
    //         },
    //         onAfterMove: (intent) => {
    //             this.lastAction = `moved ${String(intent.event.title)} to `
    //                 + new Date(intent.toStart).toLocaleDateString();
    //         },
    //         onAfterResize: (intent) => {
    //             const hours = Math.round((intent.toEnd - intent.toStart) / 3_600_000);
    //             this.lastAction = `resized ${String(intent.event.title)} to ${hours}h`;
    //         },
    //     });

    //     this.options = {
    //         mode: this.mode,
    //         variant: this.variant,
    //         rowHeight: 48,
    //         headerRowHeight: 64,
    //         showSerialNumber: false,
    //         showVerticalBorders: false,
    //         rowShading: false,
    //         selection: { mode: 'multiple' },
    //         pagination: { enabled: false },
    //         // This is the whole registration. Omit it and the grid behaves
    //         // exactly as it did before the plugin existed.
    //         plugins: [this.scheduler],
    //     };
    // }

    // onGridReady(api: GridApi): void {
    //     this.api = api;
    // }

    // /**
    //  * Switches timeline granularity.
    //  *
    //  * Goes through the plugin's API rather than rebuilding the grid: `setView`
    //  * swaps the timeline and repaints, so scroll position, sort, selection and
    //  * column widths all survive.
    //  */
    // setView(view: SchedulerView): void {
    //     if (this.view === view || !this.scheduler) return;
    //     this.view = view;

    //     // Day and week views need a narrower window than a whole month, or a
    //     // day view would render 720 hourly slots.
    //     const now = new Date();
    //     const range = view === 'month'
    //         ? monthRangeOf(now)
    //         : view === 'week'
    //             ? weekRangeOf(now)
    //             : dayRangeOf(now);

    //     const api = this.scheduler.getApi();
    //     api.setRange(range);
    //     api.setView(view);

    //     this.lastAction = `switched to ${view} view`;
    // }

    // onVariantChange(event: Event): void {
    //     this.variant = (event.target as HTMLSelectElement).value as ThemeVariant;
    //     this.api?.setVariant(this.variant);
    // }

    // /**
    //  * Flips the colour mode without touching the variant.
    //  *
    //  * The two theming axes are independent, and the scheduler's own CSS resolves
    //  * `--pg-*` tokens rather than literals — so the timeline, the bars and the
    //  * grid all follow this in one step, with no re-render.
    //  */
    // toggleMode(): void {
    //     this.mode = this.mode === 'dark' ? 'light' : 'dark';
    //     this.api?.setMode(this.mode);
    // }

    // clearSelection(): void {
    //     this.scheduler?.getApi().clearSelection();
    //     this.selectedCount = 0;
    //     this.lastAction = 'cleared selection';
    // }

    // // -- Columns ---------------------------------------------------------------

    // /**
    //  * Resource columns, pinned left.
    //  *
    //  * These are the grid's, not the plugin's — which is exactly why they come
    //  * with resize, reorder, sort and filter already working.
    //  */
    // private buildColumns(): ColumnDef[] {
    //     return [
    //         {
    //             colId: 'name',
    //             field: 'name',
    //             header: 'Employee',
    //             type: 'string',
    //             width: 220,
    //             pinned: 'left',
    //             sortable: true,
    //             filterable: true,
    //             renderer: {
    //                 display: ({ value, row }) => {
    //                     const name = String(value ?? '');

    //                     const root = document.createElement('div');
    //                     root.className = 'sd-emp';

    //                     const avatar = document.createElement('span');
    //                     avatar.className = 'sd-emp__avatar';
    //                     avatar.textContent = String(row['initials'] ?? '');
    //                     // Only the hue travels with the data; the stylesheet
    //                     // decides saturation, lightness and contrast.
    //                     avatar.style.setProperty('--sd-hue', String(hue(name)));

    //                     const text = document.createElement('span');
    //                     text.className = 'sd-emp__text';

    //                     const nameEl = document.createElement('span');
    //                     nameEl.className = 'sd-emp__name';
    //                     nameEl.textContent = name;

    //                     const roleEl = document.createElement('span');
    //                     roleEl.className = 'sd-emp__role';
    //                     roleEl.textContent = `${String(row['role'] ?? '')} - ${String(row['site'] ?? '')}`;

    //                     text.append(nameEl, roleEl);
    //                     root.append(avatar, text);
    //                     return root;
    //                 },
    //             },
    //         },
    //         {
    //             colId: 'team',
    //             field: 'team',
    //             header: 'Team',
    //             type: 'string',
    //             width: 130,
    //             pinned: 'left',
    //             sortable: true,
    //             filterable: true,
    //             groupable: true,
    //         },
    //         {
    //             colId: 'capacity',
    //             field: 'capacity',
    //             header: 'Hrs/wk',
    //             type: 'number',
    //             width: 90,
    //             pinned: 'left',
    //             textAlign: 'right',
    //             sortable: true,
    //         },
    //     ];
    // }
}

/**
 * Stable hue in `[0, 360)` derived from a string.
 *
 * Deterministic so an employee keeps the same avatar colour across reloads and
 * re-sorts — a colour that moves is noise, not identity.
 */
function hue(value: string): number {
    let h = 0;
    for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) % 360;
    return h;
}

/** The calendar month containing `d`, as a half-open epoch range. */
function monthRangeOf(d: Date): { start: number; end: number } {
    return {
        start: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(),
    };
}

/** The Monday-based week containing `d`. */
function weekRangeOf(d: Date): { start: number; end: number } {
    // `+ 6) % 7` shifts Sunday (0) to the end of the week rather than the start.
    const offset = (d.getDay() + 6) % 7;
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset);
    return {
        start: start.getTime(),
        end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7).getTime(),
    };
}

/** The single day containing `d`. */
function dayRangeOf(d: Date): { start: number; end: number } {
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return {
        start: start.getTime(),
        end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1).getTime(),
    };
}
