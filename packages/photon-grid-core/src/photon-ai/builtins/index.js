import { registerSortCommands } from './sort.commands';
import { registerFilterCommands } from './filter.commands';
import { registerPinCommands } from './pin.commands';
import { registerVisibilityCommands } from './visibility.commands';
import { registerGroupingCommands } from './grouping.commands';
import { registerSelectionCommands } from './selection.commands';
import { registerMoveCommands } from './move.commands';
import { registerInfoCommands } from './info.commands';
/**
 * Registers every built-in Photon AI intent (sort, filter, pin, column
 * visibility, grouping, selection, column reordering). Each feature owns
 * its own file and registration function — this is purely an aggregator, so
 * adding a new built-in category never means editing a giant switch
 * statement here.
 */
export function registerBuiltinCommands(registry) {
    registerSortCommands(registry);
    registerFilterCommands(registry);
    registerPinCommands(registry);
    registerVisibilityCommands(registry);
    registerGroupingCommands(registry);
    registerSelectionCommands(registry);
    registerMoveCommands(registry);
    registerInfoCommands(registry);
}
//# sourceMappingURL=index.js.map