// ── Resize strategy ──────────────────────────────────────────────────────────
/**
 * Strategy controlling how pixel delta is distributed among sibling columns
 * when a leaf column inside a group is resized.
 *
 * | Strategy        | Description                                                   |
 * |-----------------|---------------------------------------------------------------|
 * | `PROPORTIONAL`  | Siblings absorb delta proportional to their current width.    |
 * | `EQUAL`         | Siblings each gain / lose an equal number of pixels.          |
 * | `FIRST_FIXED`   | Only the **last** sibling absorbs the delta; first is fixed.  |
 * | `LAST_FIXED`    | Only the **first** sibling absorbs the delta; last is fixed.  |
 */
export var ColumnGroupResizeStrategy;
(function (ColumnGroupResizeStrategy) {
    ColumnGroupResizeStrategy["PROPORTIONAL"] = "proportional";
    ColumnGroupResizeStrategy["EQUAL"] = "equal";
    ColumnGroupResizeStrategy["FIRST_FIXED"] = "firstFixed";
    ColumnGroupResizeStrategy["LAST_FIXED"] = "lastFixed";
})(ColumnGroupResizeStrategy || (ColumnGroupResizeStrategy = {}));
//# sourceMappingURL=column-group.types.js.map