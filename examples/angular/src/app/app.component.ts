import { ChangeDetectionStrategy, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';

import { PhotonGridComponent } from 'photon-grid-angular';
import type { ColumnDef, RendererContext } from 'photon-grid-angular';
import type { DisplayRendererParams, GridApi, GridOptions } from 'photon-grid-core';
import type { RowClickPayload, RowSelectedEvent } from 'photon-grid-core';

import { EmployeeCellComponent } from './employee-cell.component';
import { CommonModule } from '@angular/common';

/** Emoji flags for the fixed country list used by `generateData` below. */


/**
 * Minimal demonstration of the `photon-grid-angular` wrapper:
 * `columns`, `dataSet` and `options` inputs plus a couple of output events.
 */
@Component({
    selector: 'app-root',
    standalone: true,
    imports: [PhotonGridComponent, CommonModule],
    templateUrl: './app.component.html', 
    styleUrls: ['./app.component.scss', './linear-theme.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
    readonly title = 'Photon Grid — Angular example';

    /**
     * Template used by the `country` column's renderer (flag + country name).
     * It's a plain top-level `<ng-template>` in this component's own view —
     * not nested inside a structural directive — so `{ static: true }` is
     * valid and the query is resolved before `ngOnInit` runs, which is what
     * lets `columns` (below) reference `countryTpl` directly in `ngOnInit`
     * instead of needing to wait for `ngAfterViewInit`.
     */ 
    @ViewChild('countryTpl', { static: true })
    private readonly countryTpl!: TemplateRef<RendererContext<DisplayRendererParams>>;

    /** Column definitions bound to the grid's `columns` input. Built in
     *  {@link ngOnInit}, once `countryTpl` above is resolved. */
    columns: ColumnDef[] = [];

    /** Row data bound to the grid's `dataSet` input. */
    data: Record<string, unknown>[] = [];

   COUNTRY_FLAGS: Record<string, string> = {
    USA: 'us',
    Canada: 'ca',
    Germany: 'de',
    UK: 'uk',
    Pakistan: 'pk',
    India: 'in',
    Australia: 'au',
    Japan: 'jp',
};

    generateData(count: number): Record<string, unknown>[] {
        const firstNames = [
            'Alice', 'Brian', 'Carla', 'David', 'Ella', 'Frank', 'Grace', 'Henry',
            'Isabella', 'Jack', 'Kevin', 'Linda', 'Michael', 'Nina', 'Oliver',
            'Paul', 'Queen', 'Ryan', 'Sophia', 'Thomas', "Sara" , 
            'Abu',
        ];

        const lastNames = [
            'Johnson', 'Smith', 'Brown', 'Wilson', 'Taylor', 'Anderson', 'Lee',
            'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'Allen', 'King', "Khatak", "Bakkar"
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

        const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

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

    /** Remaining grid configuration bound to the grid's `options` input. */
    readonly options: Partial<GridOptions> = {
        theme: 'light',
        showCheckboxes: false,
        showSerialNumber: false,
        rowShading: false,
        showGroupingBar: true,
        selection: { mode: 'multiple' },
    };

    ngOnInit(): void {
        this.data = this.generateData(100);
        this.columns = this.buildColumns();
    }

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

    private buildColumns(): ColumnDef[] {
        return [
            {
                colId: 'fullName',
                field: 'fullName',
                header: 'Full Name',
                type: 'string',
                width: 220,
                renderer: {
                    // Component-based renderer: avatar + name + gray job title.
                    display: EmployeeCellComponent,
                },
                rowDrag: true,
            },
            {
                colId: 'email',
                field: 'email',
                header: 'Email',
                type: 'string', 
                width: 240,
                renderer: {
                    // Plain-function renderer: no Angular component/template
                    // needed just to bold a value. Building an HTMLElement
                    // directly (rather than an HTML string) sidesteps any
                    // injection concern for values.
                    display: (params: DisplayRendererParams) => {
                        const strong = document.createElement('strong');
                        strong.textContent = String(params.value ?? '');
                        return strong;
                    },
                },
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
                renderer: {
                    // Template-based renderer: flag + country name.
                    display: this.countryTpl,
                    option: this.countryTpl,
                },

                enumOptions: Object.keys(this.COUNTRY_FLAGS),
            },
            { colId: 'city', field: 'city', header: 'City', type: 'string', width: 150, groupable: true },
            { colId: 'phone', field: 'phone', header: 'Phone', type: 'string', width: 170 },
            { colId: 'joinDate', field: 'joinDate', header: 'Join Date', type: 'date', width: 140 },
            { colId: 'active', field: 'active', header: 'Active', type: 'boolean', width: 100 },
            { colId: 'rating', field: 'rating', header: 'Rating', type: 'number', width: 100 },
        ];
    }
}