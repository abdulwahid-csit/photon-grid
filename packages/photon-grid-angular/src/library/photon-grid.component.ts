import {
    AfterViewInit,
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnDestroy,
    SimpleChanges,
    ViewChild
} from '@angular/core';


@Component({
    selector: 'photon-grid',
    standalone: true,
    template: ``,
    styleUrls: []
})
export class PhotonGridComponent
    implements AfterViewInit, OnChanges, OnDestroy {

    @ViewChild('host', { static: true, read: ElementRef })
    host!: ElementRef<HTMLDivElement>;

    @Input() 
    rowData: any[] = [];

    @Input()
    columnDefs: ColumnDef[] = [];

    @Input()
    options: GridOptions = {};

    private grid?: GridCore;

    ngAfterViewInit() {

        this.grid = new GridCore(
            this.host.nativeElement,
            {
                ...this.options,
                rowData: this.rowData,
                columnDefs: this.columnDefs
            }
        );

    }

    ngOnChanges(changes: SimpleChanges) {

        if (!this.grid)
            return;

        if (changes["rowData"]) {
            this.grid.setRowData(this.rowData);
        }

        if (changes["columnDefs"]) {
            this.grid.setColumnDefs(this.columnDefs);
        }

        if (changes["options"]) {
            this.grid.setOptions(this.options);
        }

    }

    ngOnDestroy() {

        this.grid?.destroy();

    }

}