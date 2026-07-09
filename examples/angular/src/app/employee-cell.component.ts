import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';

/**
 * Cell renderer for the `fullName` column: avatar image, employee name, and
 * job title (in gray) underneath.
 *
 * Mounted fresh by `AngularRendererAdapter` on every render (see the
 * `display` renderer wiring in `app.component.ts`), so its `@Input()`s are
 * effectively "construction params", not values that change over the
 * component's lifetime.
 */
interface Params {
    row: {fullName: string; jobTitle: string, seed: number};
    rowIndex: number;
}
@Component({
    selector: 'employee-cell',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="employee-cell">
            <img
                class="employee-cell__avatar"
                [src]="avatarUrl"
                [alt]="params.row.fullName"
                width="32"
                height="32"
            />
            <div class="employee-cell__text">
                <span class="employee-cell__name">{{ params.row.fullName }}</span>
                <span class="employee-cell__title">{{ params?.['row']?.['jobTitle'] }}</span>
            </div>
        </div>
    `,
    styles: [`
        .employee-cell {
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            line-height: 1.25;
        }

        .employee-cell__avatar {
            flex: none;
            border-radius: 50%;
            object-fit: cover;
        }

        .employee-cell__text {
            display: flex;
            flex-direction: column;
            min-width: 0;
        }

        .employee-cell__name {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: 500;
        }

        .employee-cell__title {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 12px;
            color: #6b7280;
        }
    `],
})

export class EmployeeCellComponent implements OnInit {
    @Input() params: Params = {row: {fullName: '', jobTitle: '', seed: 0}, rowIndex: 0};

    /** Stable per-row seed (row id) for the avatar image. */

    /**
     * A fresh `EmployeeCellComponent` is mounted on every render (the core
     * has no "update", only "produce output for these params"), so this is
     * derived from `seed` rather than `Math.random()` — otherwise every
     * re-render or scroll-driven recycle would swap the avatar to a new
     * random image, which reads as visual noise rather than identity.
     */

    ngOnInit() {
        console.log('EmployeeCellComponent mounted with params:', this.params);
    }

    pgGridInit(params: {seed: number; fullName: string; jobTitle: string}): void {
        console.log('EmployeeCellComponent pgGridInit called with params:', params);
    }

    get avatarUrl(): string {
    const index = ((this.params.rowIndex * 37 + 17) % 61); // 0–60
    return `https://i.pravatar.cc/64?img=${index}`;
}
}