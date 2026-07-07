import { NgModule } from '@angular/core';

import { PhotonGridComponent } from './photon-grid.component';

/**
 * Convenience NgModule for consumers that are not yet on standalone APIs.
 * {@link PhotonGridComponent} is itself standalone; this module simply
 * imports and re-exports it so it can be dropped into an NgModule's
 * `imports`/`exports` and used in that module's templates.
 */
@NgModule({
    imports: [PhotonGridComponent],
    exports: [PhotonGridComponent],
})
export class PhotonGridModule {}
